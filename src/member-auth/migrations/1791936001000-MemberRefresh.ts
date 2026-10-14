import { MigrationInterface, QueryRunner } from 'typeorm';
export class MemberRefresh1791936001000 implements MigrationInterface {
  /** Applies this additive authentication schema migration.
   * @returns Promise<void> after SQL succeeds; errors abort migration execution.
   */
  async up(q: QueryRunner): Promise<void> {
    await q.query(
      'ALTER TABLE member_sessions ADD refreshHash VARCHAR(64) NULL, ADD UNIQUE KEY member_refresh_hash (refreshHash)',
    );
  }
  /** Reverts this migration; review retained auth data before running rollback.
   * @returns Promise<void> after the migration columns/tables are removed.
   */
  async down(q: QueryRunner): Promise<void> {
    await q.query(
      'ALTER TABLE member_sessions DROP INDEX member_refresh_hash, DROP COLUMN refreshHash',
    );
  }
}
