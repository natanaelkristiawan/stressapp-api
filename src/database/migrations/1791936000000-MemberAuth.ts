import { MigrationInterface, QueryRunner } from 'typeorm';
export class MemberAuth1791936000000 implements MigrationInterface {
  /** Applies this additive authentication schema migration.
   * @returns Promise<void> after SQL succeeds; errors abort migration execution.
   */
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE members (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, email VARCHAR(254) COLLATE utf8mb4_bin NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL, passwordHash VARCHAR(60) NOT NULL, verifiedAt DATETIME NULL,
      suspended TINYINT NOT NULL DEFAULT 0, deletedAt DATETIME NULL,
      termsAcceptedAt DATETIME NOT NULL, createdAt DATETIME NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await q.query(`CREATE TABLE member_otps (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, memberId INT NOT NULL, purpose VARCHAR(20) NOT NULL,
      codeHash VARCHAR(64) NOT NULL, attempts INT NOT NULL DEFAULT 0,
      expiresAt DATETIME NOT NULL, sentAt DATETIME NOT NULL, consumedAt DATETIME NULL,
      resetHash VARCHAR(64) NULL UNIQUE, resetExpiresAt DATETIME NULL,
      UNIQUE KEY member_purpose (memberId, purpose), FOREIGN KEY (memberId) REFERENCES members(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await q.query(`CREATE TABLE member_sessions (
      tokenHash VARCHAR(64) NOT NULL PRIMARY KEY, memberId INT NOT NULL, expiresAt DATETIME NOT NULL,
      KEY member_sessions_member (memberId), FOREIGN KEY (memberId) REFERENCES members(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }
  /** Reverts this migration; review retained auth data before running rollback.
   * @returns Promise<void> after the migration columns/tables are removed.
   */
  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE member_sessions');
    await q.query('DROP TABLE member_otps');
    await q.query('DROP TABLE members');
  }
}
