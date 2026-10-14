import { DataSource } from 'typeorm';
import { createConnection, Connection } from 'mysql2/promise';
import { LeaderboardService } from './leaderboard.service';
import { Leaderboard1791500000000 } from '../database/migrations/1791500000000-Leaderboard';
import { CATEGORIES } from './leaderboard.rules';

// Opt-in only: never reads .env or the application's database configuration.
const mysqlTests = process.env.MYSQL_TEST_URL ? describe : describe.skip;
mysqlTests('MySQL leaderboard transaction and locks', () => {
  let admin: Connection, db: DataSource, service: LeaderboardService;
  let previousEnabled: string | undefined;
  const schema = `leaderboard_test_${process.pid}_${Date.now()}`;
  beforeAll(async () => {
    const url = new URL(process.env.MYSQL_TEST_URL);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
      throw new Error('MySQL tests require a local isolated server');
    const options = {
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
    };
    admin = await createConnection(options);
    await admin.query(`CREATE DATABASE \`${schema}\``);
    db = new DataSource({
      type: 'mysql',
      host: options.host,
      port: options.port,
      username: options.user,
      password: options.password,
      database: schema,
      timezone: 'Z',
    });
    await db.initialize();
    await db.query(
      'CREATE TABLE backup_members (id INT PRIMARY KEY, created_at DATETIME, deleted_at DATETIME NULL) ENGINE=InnoDB',
    );
    await db.query(
      'CREATE TABLE quest_points (member_id INT PRIMARY KEY, total_points INT NOT NULL) ENGINE=InnoDB',
    );
    await db.query(
      'CREATE TABLE quest_point_detail (id INT AUTO_INCREMENT PRIMARY KEY, member_id INT, points INT, note TEXT NULL, created_at DATETIME, post_id INT NULL, comment_id INT NULL, reaction_id INT NULL) ENGINE=InnoDB',
    );
    await db.query(
      'CREATE TABLE log_last_active_manual (member_id INT, last_active DATETIME NULL) ENGINE=InnoDB',
    );
    const runner = db.createQueryRunner();
    try {
      await new Leaderboard1791500000000().up(runner);
    } finally {
      await runner.release();
    }
    // record() needs only the existing member table/soft-delete metadata.
    jest.spyOn(db, 'getMetadata').mockReturnValue({
      tableName: 'backup_members',
      deleteDateColumn: { databaseName: 'deleted_at' },
    } as any);
    service = new LeaderboardService(db, {} as any, {} as any);
    previousEnabled = process.env.LEADERBOARD_ENABLED;
    process.env.LEADERBOARD_ENABLED = 'true';
  }, 15000);
  afterAll(async () => {
    if (previousEnabled === undefined) delete process.env.LEADERBOARD_ENABLED;
    else process.env.LEADERBOARD_ENABLED = previousEnabled;
    if (db?.isInitialized) await db.destroy();
    if (admin) {
      await admin.query(`DROP DATABASE IF EXISTS \`${schema}\``);
      await admin.end();
    }
  });
  beforeEach(async () => {
    for (const table of [
      'leaderboard_outbox',
      'leaderboard_score',
      'leaderboard_period',
      'quest_point_detail',
      'quest_points',
      'log_last_active_manual',
      'backup_members',
    ])
      await db.query(`DELETE FROM ${table}`);
    await db.query(
      "INSERT INTO backup_members (id, created_at) VALUES (1, '2026-08-01')",
    );
    await db.query(
      "INSERT INTO leaderboard_period (period, initialized) VALUES ('2026-10', TRUE)",
    );
  });
  const award = (points: number, fail = false) =>
    db.transaction(async (manager) => {
      await service.lockPeriod(manager, '2026-10');
      await manager.query(
        'SELECT id FROM backup_members WHERE id = 1 FOR UPDATE',
      );
      await manager.query(
        'INSERT INTO quest_points (member_id, total_points) VALUES (1, ?) ON DUPLICATE KEY UPDATE total_points = total_points + VALUES(total_points)',
        [points],
      );
      const result = await manager.query(
        "INSERT INTO quest_point_detail (member_id, points, note, created_at, post_id) VALUES (1, ?, 'post', '2026-10-09 00:00:00', 1)",
        [points],
      );
      await service.record(manager, {
        id: result.insertId,
        member_id: 1,
        points,
        created_at: new Date('2026-10-09T00:00:00Z'),
      });
      if (fail) throw new Error('Injected transaction failure');
    });
  it('keeps all concurrent awards, one monthly row per category, and durable events', async () => {
    await Promise.all(Array.from({ length: 20 }, () => award(5)));
    const [total] = await db.query('SELECT total_points FROM quest_points');
    expect(total.total_points).toBe(100);
    const rows = await db.query(
      'SELECT category, points FROM leaderboard_score',
    );
    expect(rows).toHaveLength(3);
    expect(
      Number(rows.find((row) => row.category === CATEGORIES[0]).points),
    ).toBe(100);
    expect(
      Number(rows.find((row) => row.category === CATEGORIES[1]).points),
    ).toBe(100);
    const [outbox] = await db.query(
      'SELECT COUNT(*) total FROM leaderboard_outbox',
    );
    expect(Number(outbox.total)).toBe(20);
  });
  it('rolls back points, history, accumulated scores and outbox together', async () => {
    await expect(award(35, true)).rejects.toThrow(
      'Injected transaction failure',
    );
    for (const table of [
      'quest_points',
      'quest_point_detail',
      'leaderboard_score',
      'leaderboard_outbox',
    ]) {
      const [row] = await db.query(`SELECT COUNT(*) total FROM ${table}`);
      expect(Number(row.total)).toBe(0);
    }
  });
  it('holds new awards until the exclusive rebuild lock is released', async () => {
    let release: () => void, acquired: () => void;
    const ready = new Promise<void>((resolve) => {
      acquired = resolve;
    });
    const unblock = new Promise<void>((resolve) => {
      release = resolve;
    });
    const rebuilding = db.transaction(async (manager) => {
      await service.lockPeriod(manager, '2026-10', true);
      acquired();
      await unblock;
    });
    await ready;
    let finished = false;
    const pending = award(35).then(() => {
      finished = true;
    });
    try {
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(finished).toBe(false);
    } finally {
      release();
    }
    await rebuilding;
    await pending;
    const [row] = await db.query('SELECT total_points FROM quest_points');
    expect(row.total_points).toBe(35);
  });
});
