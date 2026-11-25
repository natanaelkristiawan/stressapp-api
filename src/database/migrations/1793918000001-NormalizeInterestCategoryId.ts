import { MigrationInterface, QueryRunner } from 'typeorm';

// Follow-up for environments where `interests.categoryId` already existed
// before the InterestCategories migration: an earlier failed synchronize or an
// ad-hoc ALTER can leave the column UNSIGNED / NOT NULL DEFAULT 0. Category id 0
// is not a valid reference, so the API returned it and the CMS rejected the row.
// This migration makes the column signed nullable and clears legacy zero values.
export class NormalizeInterestCategoryId1793918000001
  implements MigrationInterface
{
  private async tableExists(
    queryRunner: QueryRunner,
    table: string,
  ): Promise<boolean> {
    const result = await queryRunner.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '${table}' LIMIT 1`,
    );
    return Array.isArray(result) && result.length > 0;
  }

  private async columnInfo(
    queryRunner: QueryRunner,
  ): Promise<{ type: string; nullable: string } | null> {
    const result = await queryRunner.query(
      `SELECT COLUMN_TYPE AS type, IS_NULLABLE AS nullable FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'interests' AND column_name = 'categoryId' LIMIT 1`,
    );
    return Array.isArray(result) && result.length > 0
      ? {
          type: String(result[0].type),
          nullable: String(result[0].nullable),
        }
      : null;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.tableExists(queryRunner, 'interests'))) {
      return;
    }
    const column = await this.columnInfo(queryRunner);
    if (!column) {
      return;
    }
    if (
      column.type.toLowerCase().includes('unsigned') ||
      column.nullable.toUpperCase() === 'NO'
    ) {
      await queryRunner.query(
        `ALTER TABLE interests MODIFY COLUMN categoryId INT NULL DEFAULT NULL`,
      );
    }
    await queryRunner.query(
      `UPDATE interests SET categoryId = NULL WHERE categoryId = 0`,
    );
  }

  public async down(): Promise<void> {
    // Data normalization is intentionally not reversed: zero is not a category.
  }
}
