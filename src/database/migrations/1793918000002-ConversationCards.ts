import { MigrationInterface, QueryRunner } from 'typeorm';

// Hand-written on purpose: production runs with synchronize:false. The table is
// new and `interest_categories.id` is signed, so `conversation_cards.categoryId`
// is also signed to satisfy the foreign key. Re-running is safe: table creation
// checks information_schema first.
export class ConversationCards1793918000002 implements MigrationInterface {
  private async tableExists(
    queryRunner: QueryRunner,
    table: string,
  ): Promise<boolean> {
    const result = await queryRunner.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '${table}' LIMIT 1`,
    );
    return Array.isArray(result) && result.length > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await this.tableExists(queryRunner, 'conversation_cards')) {
      return;
    }

    await queryRunner.query(`
      CREATE TABLE conversation_cards (
        id INT NOT NULL AUTO_INCREMENT,
        title VARCHAR(100) NOT NULL,
        prompt VARCHAR(500) NOT NULL,
        subPrompt VARCHAR(500) NULL DEFAULT NULL,
        color VARCHAR(20) NOT NULL,
        textColor VARCHAR(20) NOT NULL,
        visual VARCHAR(20) NOT NULL DEFAULT 'keseharian',
        categoryId INT NULL DEFAULT NULL,
        sortOrder INT UNSIGNED NOT NULL DEFAULT 0,
        isActive TINYINT(1) NOT NULL DEFAULT 1,
        revision INT UNSIGNED NOT NULL DEFAULT 1,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        INDEX idx_conversation_cards_categoryId (categoryId),
        CONSTRAINT FK_conversation_cards_interest_category
          FOREIGN KEY (categoryId) REFERENCES interest_categories (id)
          ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.tableExists(queryRunner, 'conversation_cards')) {
      await queryRunner.query(`DROP TABLE conversation_cards`);
    }
  }
}
