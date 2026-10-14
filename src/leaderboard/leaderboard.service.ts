import { HofList } from 'src/entity/hof-list.entity';
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { Queue } from 'bullmq';
import { DataSource, EntityManager } from 'typeorm';
import { randomUUID } from 'crypto';
import {
  bounds,
  CATEGORIES,
  memberKey,
  memberId,
  periodOf,
  POINT_FILTER,
} from './leaderboard.rules';

export const UPDATE = `
if redis.call('EXISTS', KEYS[3]) == 0 then return redis.error_reply('Leaderboard needs rebuild') end
if tonumber(redis.call('HGET', KEYS[3], 'count')) ~= redis.call('ZCARD', KEYS[1]) or tonumber(redis.call('HGET', KEYS[3], 'members')) ~= redis.call('HLEN', KEYS[2]) then return redis.error_reply('Leaderboard data missing') end
local old = tonumber(redis.call('HGET', KEYS[2], ARGV[1]) or '-1')
if tonumber(ARGV[3]) >= old then
 redis.call('HSET', KEYS[2], ARGV[1], ARGV[3])
 if tonumber(ARGV[2]) > 0 then redis.call('ZADD', KEYS[1], ARGV[2], ARGV[1])
 else redis.call('ZREM', KEYS[1], ARGV[1]) end
end
redis.call('HSET', KEYS[3], 'count', redis.call('ZCARD', KEYS[1]), 'members', redis.call('HLEN', KEYS[2]), 'updatedAt', ARGV[4])
return 1`;
export const READ = `
local generation = redis.call('GET', KEYS[1])
if not generation then return {} end
local key = ARGV[1] .. generation .. ':' .. ARGV[2]
local count = redis.call('HGET', key .. ':state', 'count')
local members = redis.call('HGET', key .. ':state', 'members')
if not count or tonumber(count) ~= redis.call('ZCARD', key) or tonumber(members) ~= redis.call('HLEN', key .. ':versions') then return {} end
local top = redis.call('ZREVRANGE', key, 0, 4, 'WITHSCORES')
local rank = redis.call('ZREVRANK', key, ARGV[3])
local score = redis.call('ZSCORE', key, ARGV[3])
return {generation, top, rank or -1, score or '0', redis.call('HGET', key .. ':state', 'updatedAt') or ''}`;

@Injectable()
export class LeaderboardService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LeaderboardService.name);
  private timer?: ReturnType<typeof setInterval>;
  private dispatching = false;
  // Separate write/shadow enablement from product read rollout.
  get enabled() {
    return process.env.LEADERBOARD_ENABLED === 'true';
  }
  get readsEnabled() {
    return this.enabled && process.env.LEADERBOARD_READ_ENABLED === 'true';
  }
  constructor(
    @InjectDataSource('mimate') private readonly db: DataSource,
    private readonly redisService: RedisService,
    @InjectQueue('leaderboard-update-queue') private readonly queue: Queue,
  ) {}
  onModuleInit() {
    if (this.enabled)
      this.timer = setInterval(() => void this.dispatch(), 1000);
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  private get redis() {
    return this.redisService.getOrThrow();
  }
  private prefix(period: string) {
    return `hof:${period}:`;
  }
  private pointer(period: string) {
    return `${this.prefix(period)}active`;
  }

  async lockPeriod(manager: EntityManager, period: string, exclusive = false) {
    // Row exists before shared readers start; daily sync takes the exclusive lock.
    await manager.query(
      'INSERT IGNORE INTO leaderboard_period (period) VALUES (?)',
      [period],
    );
    const rows = await manager.query(
      `SELECT initialized FROM leaderboard_period WHERE period = ? ${
        exclusive ? 'FOR UPDATE' : 'LOCK IN SHARE MODE'
      }`,
      [period],
    );
    return Boolean(Number(rows[0].initialized));
  }

  private async aggregate(manager: EntityManager, period: string) {
    const { start, end, joinStart, cutoff } = bounds(period);
    // Use entity metadata so the user table follows the existing mapping.
    const metadata = this.db.getMetadata('UserMimateEntity');
    const table = metadata.tableName;
    const queryBase = `SELECT qpd.member_id memberId, SUM(qpd.points) points FROM quest_point_detail qpd INNER JOIN \`${table}\` member ON member.id = qpd.member_id`;
    const common = `qpd.created_at >= ? AND qpd.created_at < ? AND ${POINT_FILTER}${
      metadata.deleteDateColumn
        ? ` AND member.\`${metadata.deleteDateColumn.databaseName}\` IS NULL`
        : ''
    }`;
    const result: Array<{
      category: string;
      memberId: number;
      points: number;
    }> = [];
    for (const category of CATEGORIES) {
      let join = '',
        condition = '';
      const params: any[] = [start, end];
      if (category === CATEGORIES[1]) {
        condition = ' AND member.created_at >= ? AND member.created_at < ?';
        params.push(joinStart, end);
      } else if (category === CATEGORIES[2]) {
        join =
          ' INNER JOIN log_last_active_manual log ON log.member_id = qpd.member_id';
        condition =
          ' AND ((log.last_active IS NOT NULL AND log.last_active < ?) OR (log.last_active IS NULL AND member.created_at < ?))';
        params.push(cutoff, cutoff);
      }
      const rows = await manager.query(
        `${queryBase}${join} WHERE ${common}${condition} GROUP BY qpd.member_id`,
        params,
      );
      result.push(
        ...rows.map((row) => ({
          category,
          memberId: Number(row.memberId),
          points: Number(row.points),
        })),
      );
    }
    return result;
  }

  async record(manager: EntityManager, detail: any) {
    if (!this.enabled) return;
    const period = periodOf(detail.created_at);
    // Caller holds this period lock and the member's row lock before history insert.
    const existing = await manager.query(
      'SELECT initialized FROM leaderboard_period WHERE period = ?',
      [period],
    );
    if (!Number(existing[0]?.initialized)) {
      // No partial projection: first daily sync/backfill includes all history.
      await manager.query(
        'INSERT INTO leaderboard_outbox (period, member_id) VALUES (?, ?)',
        [period, detail.member_id],
      );
      return;
    }
    // Preserve DB collation and NULL/note semantics by evaluating the persisted detail.
    const qualifying = await manager.query(
      `SELECT qpd.points FROM quest_point_detail qpd WHERE qpd.id = ? AND ${POINT_FILTER}`,
      [detail.id],
    );
    if (!qualifying.length) return;
    const { joinStart, end, cutoff } = bounds(period);
    const metadata = this.db.getMetadata('UserMimateEntity');
    const table = metadata.tableName;
    const users = await manager.query(
      `SELECT created_at FROM \`${table}\` WHERE id = ?${
        metadata.deleteDateColumn
          ? ` AND \`${metadata.deleteDateColumn.databaseName}\` IS NULL`
          : ''
      }`,
      [detail.member_id],
    );
    if (!users.length) return;
    const logs = await manager.query(
      'SELECT last_active FROM log_last_active_manual WHERE member_id = ?',
      [detail.member_id],
    );
    const created = new Date(users[0].created_at);
    const eligible = [
      true,
      created >= joinStart && created < end,
      logs.some((log) =>
        log.last_active ? new Date(log.last_active) < cutoff : created < cutoff,
      ),
    ];
    const [base] = await manager.query(
      'SELECT points FROM leaderboard_score WHERE period = ? AND category = ? AND member_id = ?',
      [period, CATEGORIES[0], detail.member_id],
    );
    const total = Number(base?.points || 0) + Number(detail.points);
    for (let i = 0; i < CATEGORIES.length; i++) {
      // Existing aggregate multiplies points for each matching log row; preserve it.
      const multiplier =
        i === 2
          ? logs.filter((log) =>
              log.last_active
                ? new Date(log.last_active) < cutoff
                : created < cutoff,
            ).length
          : 1;
      const points = eligible[i] ? total * multiplier : 0;
      await manager.query(
        `INSERT INTO leaderboard_score (period, category, member_id, points, version) VALUES (?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE points = VALUES(points), version = version + 1`,
        [period, CATEGORIES[i], detail.member_id, points],
      );
    }
    await manager.query(
      'INSERT INTO leaderboard_outbox (period, member_id) VALUES (?, ?)',
      [period, detail.member_id],
    );
  }

  private async dispatch() {
    if (this.dispatching) return;
    this.dispatching = true;
    try {
      // Multiple pods may enqueue the same event; stable job ID + absolute projection is safe.
      const rows = await this.db.query(
        'SELECT o.id, o.period, o.member_id FROM leaderboard_outbox o INNER JOIN leaderboard_period p ON p.period = o.period AND p.initialized = TRUE WHERE o.delivered_at IS NULL ORDER BY o.id LIMIT 100',
      );
      for (const row of rows) {
        await this.queue.add(
          'update',
          { period: row.period, memberId: Number(row.member_id) },
          {
            jobId: `hof-${row.id}`,
            attempts: 10,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: { age: 86400 },
            removeOnFail: false,
          },
        );
        await this.db.query(
          'UPDATE leaderboard_outbox SET delivered_at = UTC_TIMESTAMP() WHERE id = ?',
          [row.id],
        );  
      }
    } catch (error:any) {
      this.logger.error(`Outbox dispatch failed: ${error.message}`);
    } finally {
      this.dispatching = false;
    }
  }

  async project(period: string, userId: number) {
    if (!this.enabled) return;
    await this.withLock(`hof-projection-${period}`, () =>
      this.db.transaction(async (manager) => {
        const initialized = await this.lockPeriod(manager, period);
        const generation = await this.redis.get(this.pointer(period));
        if (!initialized || !generation)
          throw new Error(`Leaderboard ${period} needs daily sync/rebuild`);
        const rows = await manager.query(
          'SELECT category, points, version FROM leaderboard_score WHERE period = ? AND member_id = ?',
          [period, userId],
        );
        for (const row of rows) {
          const key = `${this.prefix(period)}${generation}:${row.category}`;
          await this.redis.eval(
            UPDATE,
            3,
            key,
            `${key}:versions`,
            `${key}:state`,
            memberKey(userId),
            String(row.points),
            String(row.version),
            new Date().toISOString(),
          );
        }
      }),
    );
  }

  async daily<T>(work: () => Promise<T>): Promise<T> {
    return this.withLock('hof-daily-sync', work, 0);
  }

  private async withLock<T>(
    name: string,
    work: () => Promise<T>,
    wait = 5,
  ): Promise<T> {
    const runner = this.db.createQueryRunner();
    await runner.connect();
    try {
      const [row] = await runner.query('SELECT GET_LOCK(?, ?) acquired', [
        name,
        wait,
      ]);
      if (!Number(row.acquired))
        throw new ServiceUnavailableException('HOF operation already running');
      try {
        return await work();
      } finally {
        await runner.query('SELECT RELEASE_LOCK(?)', [name]);
      }
    } finally {
      await runner.release();
    }
  }

  async sync(period = periodOf(), snapshot = false) {
    if (!this.enabled) return;
    return this.withLock(`hof-projection-${period}`, () =>
      this.rebuild(period, snapshot),
    );
  }

  private async rebuild(period: string, snapshot: boolean) {
    const previous = await this.redis.get(this.pointer(period));
    const generation = randomUUID();
    const keys: string[] = [];
    let scores: any[] = [];
    try {
      await this.db.transaction('READ COMMITTED', async (manager) => {
        // Exclusive DB lock coordinates the database recalculation across pods.
        // ponytail: DB recalculation holds the period lock; use snapshot/replay if measured DB pauses are too long.
        await this.lockPeriod(manager, period, true);
        const rows = await this.aggregate(manager, period);
        await manager.query(
          'UPDATE leaderboard_score SET points = 0, version = version + 1 WHERE period = ?',
          [period],
        );
        for (const row of rows) {
          await manager.query(
            `INSERT INTO leaderboard_score (period, category, member_id, points) VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE points = VALUES(points), version = version + 1`,
            [period, row.category, row.memberId, row.points],
          );
        }
        scores = await manager.query(
          'SELECT * FROM leaderboard_score WHERE period = ?',
          [period],
        );
        await manager.query(
          'UPDATE leaderboard_period SET initialized = TRUE WHERE period = ?',
          [period],
        );
        // Queue reconciliation after commit also repairs any projection from a failed prior sync.
        await manager.query(
          'INSERT INTO leaderboard_outbox (period, member_id) SELECT DISTINCT period, member_id FROM leaderboard_score WHERE period = ?',
          [period],
        );
        if (snapshot) {
          const [year, month] = period.split('-').map(Number);
          const repo = manager.getRepository(HofList);
          for (const category of CATEGORIES) {
            const ranked = rows
              .filter((row) => row.category === category)
              .sort((a, b) => b.points - a.points || a.memberId - b.memberId);
            await repo.delete({ year, month, category });
            if (ranked.length)
              await repo.save(
                ranked.map((row, index) =>
                  repo.create({
                    year,
                    month,
                    category,
                    member_id: row.memberId,
                    total_points: row.points,
                    rank: index + 1,
                  }),
                ),
              );
          }
        }
      });
      for (const category of CATEGORIES) {
        const key = `${this.prefix(period)}${generation}:${category}`;
        keys.push(key, `${key}:versions`, `${key}:state`);
        const pipeline = this.redis.pipeline();
        for (const row of scores.filter((r) => r.category === category)) {
          pipeline.hset(
            `${key}:versions`,
            memberKey(Number(row.member_id)),
            String(row.version),
          );
          if (Number(row.points) > 0)
            pipeline.zadd(
              key,
              String(row.points),
              memberKey(Number(row.member_id)),
            );
        }
        const selected = scores.filter((r) => r.category === category);
        pipeline.hset(
          `${key}:state`,
          'count',
          String(selected.filter((r) => Number(r.points) > 0).length),
          'members',
          String(selected.length),
          'updatedAt',
          new Date().toISOString(),
        );
        // Unpublished keys expire if the process crashes during construction.
        pipeline
          .expire(key, 3600)
          .expire(`${key}:versions`, 3600)
          .expire(`${key}:state`, 3600);
        const results = await pipeline.exec();
        if (results?.some(([error]) => error))
          throw new Error('Redis sync pipeline failed');
      }
      // Database commit precedes publication. Projection lock keeps workers out until
      // the pointer switches; point changes after commit remain in the outbox.
      await this.redis.eval(
        `for i = 2, #KEYS do redis.call('PERSIST', KEYS[i]) end return redis.call('SET', KEYS[1], ARGV[1])`,
        keys.length + 1,
        this.pointer(period),
        ...keys,
        generation,
      );
      if (previous && previous !== generation) {
        const pipeline = this.redis.pipeline();
        for (const category of CATEGORIES) {
          const old = `${this.prefix(period)}${previous}:${category}`;
          pipeline
            .expire(old, 86400)
            .expire(`${old}:versions`, 86400)
            .expire(`${old}:state`, 86400);
        }
        await pipeline
          .exec()
          .catch((error) =>
            this.logger.warn(`Old generation cleanup failed: ${error.message}`),
          );
      }
      this.logger.log(
        `Leaderboard sync complete period=${period} generation=${generation}`,
      );
    } catch (error) {
      // Remove an uncertain publication; readers fall back until the next rebuild.
      await this.redis
        .eval(
          `if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end return 0`,
          1,
          this.pointer(period),
          generation,
        )
        .catch(() => undefined);
      if (keys.length) await this.redis.del(...keys).catch(() => undefined);
      throw error;
    }
  }

  async validate(period = periodOf()) {
    if (!this.enabled)
      throw new ServiceUnavailableException('Leaderboard is disabled');
    return this.withLock(`hof-projection-${period}`, () =>
      this.db.transaction('READ COMMITTED', async (manager) => {
        await this.lockPeriod(manager, period, true);
        const expected = await this.aggregate(manager, period);
        const stored = await manager.query(
          'SELECT category, member_id, points FROM leaderboard_score WHERE period = ? AND points > 0',
          [period],
        );
        const generation = await this.redis.get(this.pointer(period));
        const mismatches: Array<{
          category: string;
          memberId: number;
          expected: number;
          database: number;
          redis: number;
        }> = [];
        let mismatchCount = 0;
        let ready = Boolean(generation);
        for (const category of CATEGORIES) {
          try {
            await this.read(period, category, 0);
          } catch {
            ready = false;
          }
          const key = `${this.prefix(period)}${generation}:${category}`;
          const projected = generation
            ? await this.redis.zrevrange(key, 0, -1, 'WITHSCORES')
            : [];
          const scores = new Map<number, number>();
          for (let i = 0; i < projected.length; i += 2)
            scores.set(memberId(projected[i]), Number(projected[i + 1]));
          const expectedScores = new Map(
            expected
              .filter((row) => row.category === category)
              .map((row) => [row.memberId, row.points]),
          );
          const dbScores = new Map<number, number>(
            stored
              .filter((row) => row.category === category)
              .map((row) => [Number(row.member_id), Number(row.points)]),
          );
          const ids = new Set([
            ...expectedScores.keys(),
            ...dbScores.keys(),
            ...scores.keys(),
          ]);
          for (const id of ids) {
            const values = {
              category,
              memberId: id,
              expected: expectedScores.get(id) || 0,
              database: dbScores.get(id) || 0,
              redis: scores.get(id) || 0,
            };
            if (
              values.expected !== values.database ||
              values.expected !== values.redis
            ) {
              mismatchCount++;
              if (mismatches.length < 100) mismatches.push(values);
            }
          }
        }
        return {
          period,
          ready,
          matches: ready && mismatchCount === 0,
          mismatchCount,
          mismatches,
        };
      }),
    );
  }

  async read(period: string, category: string, userId: number) {
    const raw: any = await this.redis.eval(
      READ,
      1,
      this.pointer(period),
      this.prefix(period),
      category,
      memberKey(userId),
    );
    if (!raw.length)
      throw new ServiceUnavailableException('Leaderboard needs sync');
    const top: Array<{ memberId: number; point: number; rank: number }> = [];
    for (let i = 0; i < raw[1].length; i += 2)
      top.push({
        memberId: memberId(raw[1][i]),
        point: Number(raw[1][i + 1]),
        rank: i / 2 + 1,
      });
    return {
      top,
      updatedAt: raw[4] || null,
      me: {
        point: Number(raw[3]),
        rank: Number(raw[2]) < 0 ? null : Number(raw[2]) + 1,
        ranked: Number(raw[2]) >= 0,
      },
    };
  }
}
