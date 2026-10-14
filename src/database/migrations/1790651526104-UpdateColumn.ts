import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateColumn1790651526104 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`highlights\`
            ADD COLUMN \`need_token\` TINYINT(1) NOT NULL DEFAULT 0 AFTER \`link\`;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`highlights\`
            DROP COLUMN \`need_token\`;
        `);
    }

}
