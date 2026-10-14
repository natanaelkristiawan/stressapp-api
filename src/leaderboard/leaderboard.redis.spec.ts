import { spawn, ChildProcess } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import Redis from 'ioredis';
import { LeaderboardService, UPDATE } from './leaderboard.service';
import { CATEGORIES, memberKey } from './leaderboard.rules';

// Real isolated Redis, using a Unix socket; no application env or production connection.
describe('Redis leaderboard projection', () => {
  let server: ChildProcess,
    redis: Redis,
    directory: string,
    service: LeaderboardService;
  const key = 'hof:2026-10:test:Paling Eksis';
  beforeAll(async () => {
    directory = mkdtempSync('/private/tmp/hof-redis-');
    const socket = join(directory, 'redis.sock');
    server = spawn(process.env.REDIS_TEST_BINARY || 'redis-server', [
      '--port',
      '0',
      '--unixsocket',
      socket,
      '--save',
      '',
      '--appendonly',
      'no',
      '--dir',
      directory,
    ]);
    await new Promise<void>((resolve, reject) => {
      let output = '';
      server.stdout.on('data', (data) => {
        output += String(data);
      });
      server.stderr.on('data', (data) => {
        output += String(data);
      });
      server.once('error', reject);
      server.once('exit', (code) =>
        reject(new Error(`Redis exited ${code}: ${output}`)),
      );
      server.stdout.on('data', (data) => {
        if (String(data).toLowerCase().includes('ready to accept connections'))
          resolve();
      });
    });
    redis = new Redis(socket);
    await redis.ping();
    service = new LeaderboardService(
      {} as any,
      { getOrThrow: () => redis } as any,
      {} as any,
    );
  }, 10000);
  afterAll(async () => {
    if (redis) {
      await redis.quit();
    }
    if (server && server.exitCode === null) {
      const exited = new Promise<void>((resolve) =>
        server.once('exit', () => resolve()),
      );
      server.kill('SIGTERM');
      await exited;
    }
    if (directory) rmSync(directory, { recursive: true, force: true });
  });
  beforeEach(async () => {
    await redis.flushdb();
    await redis.set('hof:2026-10:active', 'test');
    for (const category of CATEGORIES)
      await redis.hset(
        `hof:2026-10:test:${category}:state`,
        'count',
        '0',
        'members',
        '0',
      );
  });
  const update = async (id: number, points: number, version: number) =>
    redis.eval(
      UPDATE,
      3,
      key,
      `${key}:versions`,
      `${key}:state`,
      memberKey(id),
      String(points),
      String(version),
      new Date().toISOString(),
    );
  it('moves Fajar from position 6 to 3 and preserves scores of other members', async () => {
    for (const [index, points] of [100, 90, 80, 70, 60, 50].entries())
      await update(index + 1, points, 1);
    expect((await service.read('2026-10', CATEGORIES[0], 6)).me.rank).toBe(6);
    await update(6, 85, 2);
    const result = await service.read('2026-10', CATEGORIES[0], 6);
    expect(result.top.map((row) => row.memberId)).toEqual([1, 2, 6, 3, 4]);
    expect(result.me).toEqual({ point: 85, rank: 3, ranked: true });
    expect((await service.read('2026-10', CATEGORIES[0], 5)).me.rank).toBe(6);
  });
  it('handles duplicate, stale, concurrent jobs and removal tombstones', async () => {
    await Promise.all([update(2, 50, 1), update(2, 85, 3), update(2, 70, 2)]);
    await update(2, 85, 3);
    expect((await service.read('2026-10', CATEGORIES[0], 2)).me.point).toBe(85);
    await update(2, 0, 4);
    await update(2, 85, 3);
    expect(
      (await service.read('2026-10', CATEGORIES[0], 2)).me.rank,
    ).toBeNull();
  });
  it('uses smaller IDs first for ties', async () => {
    await update(100, 50, 1);
    await update(2, 50, 1);
    await update(11, 50, 1);
    expect(
      (await service.read('2026-10', CATEGORIES[0], 11)).top.map(
        (row) => row.memberId,
      ),
    ).toEqual([2, 11, 100]);
  });
  it('distinguishes a valid empty leaderboard from evicted data', async () => {
    expect((await service.read('2026-10', CATEGORIES[0], 1)).top).toEqual([]);
    await update(1, 10, 1);
    await redis.del(key);
    await expect(service.read('2026-10', CATEGORIES[0], 1)).rejects.toThrow(
      'Leaderboard needs sync',
    );
    await expect(update(1, 11, 2)).rejects.toThrow('Leaderboard data missing');
  });
  it('switches complete generations without leaking another period', async () => {
    await update(1, 10, 1);
    await redis.zadd('hof:2026-10:new:Paling Eksis', 99, memberKey(2));
    await redis.hset(
      'hof:2026-10:new:Paling Eksis:versions',
      memberKey(2),
      '2',
    );
    await redis.hset(
      'hof:2026-10:new:Paling Eksis:state',
      'count',
      '1',
      'members',
      '1',
    );
    expect(
      (await service.read('2026-10', CATEGORIES[0], 1)).top[0].memberId,
    ).toBe(1);
    await redis.set('hof:2026-10:active', 'new');
    expect(
      (await service.read('2026-10', CATEGORIES[0], 2)).top[0].memberId,
    ).toBe(2);
    await expect(service.read('2026-11', CATEGORIES[0], 2)).rejects.toThrow();
  });
  const rebuildService = (failCommit = false) => {
    const scores = [
      {
        period: '2026-10',
        category: CATEGORIES[0],
        member_id: 2,
        points: 99,
        version: 2,
      },
    ];
    const manager = {
      query: jest.fn(async (sql: string) => {
        if (sql.includes('SELECT initialized')) return [{ initialized: 1 }];
        if (sql.includes('SELECT * FROM leaderboard_score')) return scores;
        return [];
      }),
    };
    const runner = {
      connect: jest.fn(),
      release: jest.fn(),
      query: jest.fn(async (sql: string) =>
        sql.includes('GET_LOCK') ? [{ acquired: 1 }] : [],
      ),
    };
    const database = {
      createQueryRunner: () => runner,
      transaction: async (
        _isolation: string,
        work: (manager: any) => Promise<void>,
      ) => {
        await work(manager);
        // Prepared Redis data must not be visible before the DB commit.
        expect(await redis.get('hof:2026-10:active')).toBe('test');
        if (failCommit) throw new Error('Commit failed');
      },
    };
    const instance = new LeaderboardService(
      database as any,
      { getOrThrow: () => redis } as any,
      {} as any,
    );
    jest
      .spyOn(instance as any, 'aggregate')
      .mockResolvedValue([
        { category: CATEGORIES[0], memberId: 2, points: 99 },
      ]);
    return instance;
  };
  it('publishes a complete generation only after DB commit and removes its temporary TTL', async () => {
    const oldFlag = process.env.LEADERBOARD_ENABLED;
    process.env.LEADERBOARD_ENABLED = 'true';
    try {
      await rebuildService().sync('2026-10');
      const generation = await redis.get('hof:2026-10:active');
      expect(generation).not.toBe('test');
      expect((await service.read('2026-10', CATEGORIES[0], 2)).me.point).toBe(
        99,
      );
      expect(
        await redis.ttl(`hof:2026-10:${generation}:${CATEGORIES[0]}:state`),
      ).toBe(-1);
    } finally {
      if (oldFlag === undefined) delete process.env.LEADERBOARD_ENABLED;
      else process.env.LEADERBOARD_ENABLED = oldFlag;
    }
  });
  it('keeps the previous generation if the database commit fails', async () => {
    const oldFlag = process.env.LEADERBOARD_ENABLED;
    process.env.LEADERBOARD_ENABLED = 'true';
    try {
      await update(1, 50, 1);
      await expect(rebuildService(true).sync('2026-10')).rejects.toThrow(
        'Commit failed',
      );
      expect(await redis.get('hof:2026-10:active')).toBe('test');
      expect((await service.read('2026-10', CATEGORIES[0], 1)).me.point).toBe(
        50,
      );
    } finally {
      if (oldFlag === undefined) delete process.env.LEADERBOARD_ENABLED;
      else process.env.LEADERBOARD_ENABLED = oldFlag;
    }
  });
});
