import { MigrationInterface, QueryRunner } from 'typeorm';

// Hand-written (same reason as DashboardIndexes: the entities/tables have drifted,
// so migration:generate would rebuild tables). These indexes target the member-facing
// feed + comment endpoints that saturate the DB under load:
//
//   idx_hidden_published        /post/latest   : removes full scan of backup_post_with_attributes
//                                                 + filesort on every request.
//   idx_member_published        /profile/member/post : member FK existed but still filesorted
//                                                 published_at; this composite removes the sort.
//   idx_highlight_hidden_order  /post/highlight : removes the filesort on the `order` column.
//   idx_comments_post_parent    /comment/list   : covers WHERE post + parent IS NULL + ORDER BY
//                                                 created_at so the top-level page needs no sort.
//
// Every index is an online build. DDL auto-commits in MySQL, so a failed run keeps the
// indexes it already built: checking information_schema makes it safe to simply run again.
export class MemberApiIndexes1793916000000 implements MigrationInterface {
  private readonly indexes: Array<
    [table: string, name: string, columns: string]
  > = [
    [
      'backup_post_with_attributes',
      'idx_hidden_published',
      'isHidden, published_at',
    ],
    [
      'backup_post_with_attributes',
      'idx_member_published',
      'backup_member_id, published_at',
    ],
    [
      'backup_post_with_attributes',
      'idx_highlight_hidden_order',
      'is_highlight, isHidden, `order`',
    ],
    [
      'backup_comments',
      'idx_comments_post_parent',
      'backup_post_with_attribute_id, backup_comment_id, created_at',
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

