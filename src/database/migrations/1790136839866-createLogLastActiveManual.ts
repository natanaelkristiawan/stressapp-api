import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateLogLastActiveManual1790136839866 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`log_last_active_manual\` (
                \`id\` INT NOT NULL AUTO_INCREMENT,
                \`member_id\` INT NOT NULL,
                \`last_active\` DATETIME NULL,
                \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (\`id\`),
                INDEX \`IDX_log_last_active_manual_member_id\` (\`member_id\`),
                INDEX \`IDX_log_last_active_manual_last_active\` (\`last_active\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS \`log_last_active_manual\`;`);
    }

}
