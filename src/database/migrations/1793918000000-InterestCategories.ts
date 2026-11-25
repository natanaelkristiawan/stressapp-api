import { MigrationInterface, QueryRunner } from 'typeorm';

// Hand-written on purpose: production runs with synchronize:false, and the
// InterestCategory entity is new. `interests.id` is a signed INT, so
// `interests.categoryId` must also be signed; an UNSIGNED column makes MySQL
// reject the foreign key as incompatible. Re-running is safe: every step checks
// information_schema first.
export class InterestCategories1793918000000 implements MigrationInterface {
  private async tableExists(
    queryRunner: QueryRunner,
    table: string,
  ): Promise<boolean> {
    const result = await queryRunner.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '${table}' LIMIT 1`,
    );
    return Array.isArray(result) && result.length > 0;
  }

  private async columnExists(
    queryRunner: QueryRunner,
    table: string,
    column: string,
  ): Promise<boolean> {
    const result = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = '${table}' AND column_name = '${column}' LIMIT 1`,
    );
    return Array.isArray(result) && result.length > 0;
  }

  private async columnType(
    queryRunner: QueryRunner,
    table: string,
    column: string,
  ): Promise<string | null> {
    const result = await queryRunner.query(
      `SELECT COLUMN_TYPE FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = '${table}' AND column_name = '${column}' LIMIT 1`,
    );
    return Array.isArray(result) && result.length > 0
      ? String(result[0].COLUMN_TYPE)
      : null;
  }

  private async foreignKeyOnColumnExists(
    queryRunner: QueryRunner,
    table: string,
    column: string,
    referencedTable: string,
  ): Promise<boolean> {
    const result = await queryRunner.query(
      `SELECT 1 FROM information_schema.key_column_usage WHERE table_schema = DATABASE() AND table_name = '${table}' AND column_name = '${column}' AND referenced_table_name = '${referencedTable}' LIMIT 1`,
    );
    return Array.isArray(result) && result.length > 0;
  }

  private async indexOnColumnExists(
    queryRunner: QueryRunner,
    table: string,
    column: string,
  ): Promise<boolean> {
    const result = await queryRunner.query(
      `SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = '${table}' AND column_name = '${column}' LIMIT 1`,
    );
    return Array.isArray(result) && result.length > 0;
  }

  private async foreignKeyNameOnColumn(
    queryRunner: QueryRunner,
    table: string,
    column: string,
    referencedTable: string,
  ): Promise<string | null> {
    const result = await queryRunner.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.key_column_usage WHERE table_schema = DATABASE() AND table_name = '${table}' AND column_name = '${column}' AND referenced_table_name = '${referencedTable}' LIMIT 1`,
    );
    return Array.isArray(result) && result.length > 0
      ? String(result[0].CONSTRAINT_NAME)
      : null;
  }

  private async indexPathName(
    queryRunner: QueryRunner,
    table: string,
    column: string,
  ): Promise<string | null> {
    const result = await queryRunner.query(
      `SELECT INDEX_NAME FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = '${table}' AND column_name = '${column}' AND index_name <> 'PRIMARY' LIMIT 1`,
    );
    return Array.isArray(result) && result.length > 0
      ? String(result[0].INDEX_NAME)
      : null;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.tableExists(queryRunner, 'interest_categories'))) {
      await queryRunner.query(`
        CREATE TABLE interest_categories (
          id INT NOT NULL AUTO_INCREMENT,
          name VARCHAR(100) NOT NULL,
          nameKey VARCHAR(64) NOT NULL,
          description VARCHAR(500) NOT NULL DEFAULT '',
          sortOrder INT UNSIGNED NOT NULL DEFAULT 0,
          isActive TINYINT(1) NOT NULL DEFAULT 1,
          revision INT UNSIGNED NOT NULL DEFAULT 1,
          createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          PRIMARY KEY (id),
          UNIQUE INDEX uq_interest_categories_name_key (nameKey)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
      `);
    }

    const hasInterests = await this.tableExists(queryRunner, 'interests');
    if (!hasInterests) {
      return;
    }

    if (!(await this.columnExists(queryRunner, 'interests', 'categoryId'))) {
      await queryRunner.query(
        `ALTER TABLE interests ADD COLUMN categoryId INT NULL DEFAULT NULL AFTER description`,
      );
    } else if (
      (await this.columnType(queryRunner, 'interests', 'categoryId'))
        ?.toLowerCase()
        .includes('unsigned')
    ) {
      // A previous failed synchronize may have left the column UNSIGNED.
      // It must match the signed interest_categories.id for the FK to be valid.
      await queryRunner.query(
        `ALTER TABLE interests MODIFY COLUMN categoryId INT NULL DEFAULT NULL`,
      );
    }

    if (
      !(await this.indexOnColumnExists(queryRunner, 'interests', 'categoryId'))
    ) {
      await queryRunner.query(
        `ALTER TABLE interests ADD INDEX idx_interests_categoryId (categoryId), ALGORITHM=INPLACE, LOCK=NONE`,
      );
    }

    if (
      !(await this.foreignKeyOnColumnExists(
        queryRunner,
        'interests',
        'categoryId',
        'interest_categories',
      ))
    ) {
      await queryRunner.query(`
        ALTER TABLE interests
        ADD CONSTRAINT FK_interests_interest_category
        FOREIGN KEY (categoryId) REFERENCES interest_categories (id)
        ON DELETE SET NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.tableExists(queryRunner, 'interests')) {
      const foreignKey = await this.foreignKeyNameOnColumn(
        queryRunner,
        'interests',
        'categoryId',
        'interest_categories',
      );
      if (foreignKey) {
        await queryRunner.query(
          `ALTER TABLE interests DROP FOREIGN KEY \`${foreignKey}\``,
        );
      }
      const indexName = await this.indexPathName(
        queryRunner,
        'interests',
        'categoryId',
      );
      if (indexName) {
        await queryRunner.query(
          `ALTER TABLE interests DROP INDEX \`${indexName}\``,
        );
      }
      if (await this.columnExists(queryRunner, 'interests', 'categoryId')) {
        await queryRunner.query(`ALTER TABLE interests DROP COLUMN categoryId`);
      }
    }

    if (await this.tableExists(queryRunner, 'interest_categories')) {
      await queryRunner.query(`DROP TABLE interest_categories`);
    }
  }
}
