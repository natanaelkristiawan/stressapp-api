import { MigrationInterface, QueryRunner } from "typeorm";

export class CampaignWinner1790223563098 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`campaign_winner\` (
                \`id\` INT NOT NULL AUTO_INCREMENT,
                \`member_id\` INT NULL,
                \`category\` VARCHAR(100) NOT NULL,
                \`month\` INT NOT NULL DEFAULT 0,
                \`year\` INT NOT NULL DEFAULT 0,
                \`total_points\` INT NOT NULL DEFAULT 0,
                \`rank\` INT NOT NULL DEFAULT 0,
                \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (\`id\`),   
                INDEX \`IDX_campaign_winner_member_id\` (\`member_id\`),
                INDEX \`IDX_campaign_winner_period_category\` (\`year\`, \`month\`, \`category\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS \`campaign_winner\`;`);
    }

}
