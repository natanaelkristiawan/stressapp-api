import { MigrationInterface, QueryRunner } from 'typeorm';

// export/active-member filters activity_logs by createdAt ONLY (no action predicate),
// so none of the DashboardIndexes composites (which lead with action/userId) can seek it.
// This (createdAt, userId) index lets that query range-seek the date window and cover the
// join to members. It pairs with the rewrite in
// ExportRevisionService.exportDataToExcelActiveMember (select the distinct active member
// ids first, then join). On 7.5M rows the pair took the query from ~15s to ~0.3s, with
// byte-for-byte identical rows.
//
// Online build; checking information_schema makes it safe to run again.
export class ActiveMemberCreatedUserIndex1793829600001
  implements MigrationInterface
{
  private async indexExists(
    queryRunner: QueryRunner,
    table: string,
    indexName: string,
  ): Promise<boolean> {
    const result = await queryRunner.query(
      `SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = '${table}' AND index_name = '${indexName}' LIMIT 1`,
    );
    return Array.isArray(result) && result.length > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await this.indexExists(
      queryRunner,
      'activity_logs',
      'idx_created_user',
    );
    if (!exists) {
      await queryRunner.query(
        `ALTER TABLE activity_logs ADD INDEX idx_created_user (createdAt, userId), ALGORITHM=INPLACE, LOCK=NONE`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const exists = await this.indexExists(
      queryRunner,
      'activity_logs',
      'idx_created_user',
    );
    if (exists) {
      await queryRunner.query(
        `ALTER TABLE activity_logs DROP INDEX idx_created_user`,
      );
    }
  }
}

