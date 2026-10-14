import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateQuestBackup1789005157920 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`quest_backup\` (
                \`id\` INT NOT NULL AUTO_INCREMENT,
                \`member_id\` INT NULL,
                \`year\` INT NULL DEFAULT 0,
                \`month\` INT NULL DEFAULT 0,
                \`total_points\` INT NOT NULL DEFAULT 0,
                \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (\`id\`),
                INDEX \`IDX_quest_backup_member_id\` (\`member_id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS \`quest_backup\`;`);
    }

}
