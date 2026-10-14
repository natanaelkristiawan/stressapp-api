import { MigrationInterface, QueryRunner } from 'typeorm';
export class Leaderboard1791500000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE leaderboard_period (
      period CHAR(7) NOT NULL PRIMARY KEY, initialized BOOLEAN NOT NULL DEFAULT FALSE
    ) ENGINE=InnoDB`);
    await runner.query(`CREATE TABLE leaderboard_score (
      period CHAR(7) NOT NULL, category VARCHAR(40) NOT NULL, member_id INT NOT NULL,
      points BIGINT NOT NULL DEFAULT 0, version BIGINT NOT NULL DEFAULT 1,
      PRIMARY KEY (period, category, member_id)
    ) ENGINE=InnoDB`);
    await runner.query(`CREATE TABLE leaderboard_outbox (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, period CHAR(7) NOT NULL,
      member_id INT NOT NULL, delivered_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX pending (delivered_at, id)
    ) ENGINE=InnoDB`);
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE leaderboard_outbox');
    await runner.query('DROP TABLE leaderboard_score');
    await runner.query('DROP TABLE leaderboard_period');
  }
}
