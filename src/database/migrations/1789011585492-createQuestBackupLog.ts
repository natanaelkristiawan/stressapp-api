import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateQuestBackupLog1789011585492 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`quest_backup_log\` (
                \`id\` INT NOT NULL AUTO_INCREMENT,
                \`year\` INT NULL DEFAULT 0,
                \`month\` INT NULL DEFAULT 0,
                \`action\` VARCHAR(50) NULL,
                \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (\`id\`),
                INDEX \`IDX_quest_backup_log_year\` (\`year\`),
                INDEX \`IDX_quest_backup_log_month\` (\`month\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS \`quest_backup_log\`;`);
    }

}
