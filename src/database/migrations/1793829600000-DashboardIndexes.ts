import { MigrationInterface, QueryRunner } from 'typeorm';

// Hand-written on purpose. Do not replace with migration:generate: the entities
// and tables have drifted (activity_logs.targetType is an enum in the database
// but varchar(20) in the entity), so a generated migration would rebuild tables.
//
// Every index is an online build. Run off-peak, smallest tables first.
// DDL auto-commits in MySQL, so a failed run keeps the indexes it already
// built: checking information_schema makes it safe to simply run again.
export class DashboardIndexes1793829600000 implements MigrationInterface {
  private readonly indexes: Array<
    [table: string, name: string, columns: string]
  > = [
    ['members', 'idx_activated_deleted', 'activated_at, deleted_at'],
    ['backup_member_space', 'idx_created_space', 'created_at, backup_space_id'],
    [
      'backup_post_with_attributes',
      'idx_hidden_deleted',
      'isHidden, deleted_at',
    ],
    ['backup_post_with_attributes', 'idx_published_at', 'published_at'],
    ['backup_post_with_attributes', 'idx_created_at', 'created_at'],
    ['backup_comments', 'idx_created_at', 'created_at'],
    ['backup_reactions', 'idx_created_at', 'created_at'],
    [
      'activity_logs',
      'idx_action_created_cover',
      'action, createdAt, userId, targetType, postId',
    ],
    ['activity_logs', 'idx_user_action_created', 'userId, action, createdAt'],
    [
      'endpoint_logs',
      'idx_created_handler_member',
      'createdAt, handler, backup_member_id',
    ],
  ];

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
    for (const [table, name, columns] of this.indexes) {
      const exists = await this.indexExists(queryRunner, table, name);
      if (!exists) {
        await queryRunner.query(
          `ALTER TABLE ${table} ADD INDEX ${name} (${columns}), ALGORITHM=INPLACE, LOCK=NONE`,
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [table, name] of [...this.indexes].reverse()) {
      const exists = await this.indexExists(queryRunner, table, name);
      if (exists) {
        await queryRunner.query(
          `ALTER TABLE ${table} DROP INDEX ${name}`,
        );
      }
    }
  }
}

