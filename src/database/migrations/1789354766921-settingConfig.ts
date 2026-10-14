import { MigrationInterface, QueryRunner } from "typeorm";

export class SettingConfig1789354766921 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`setting_config\` (
                \`id\` INT NOT NULL AUTO_INCREMENT,
                \`key\` VARCHAR(191) NOT NULL,
                \`value\` LONGTEXT NULL,
                \`description\` VARCHAR(255) NULL,
                \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`UQ_setting_config_key\` (\`key\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS \`setting_config\`;`);
    }

}
