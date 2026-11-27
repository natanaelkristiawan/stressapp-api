import { MigrationInterface, QueryRunner } from 'typeorm';

// Hand-written on purpose: production runs with synchronize:false. Adds the
// catalog-backed interest selection column to members while keeping the legacy
// free-text `preferences` column for back-compat. Re-running is safe: the column
// check uses information_schema.
export class AddMemberInterestIds1793918000003 implements MigrationInterface {
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

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await this.columnExists(queryRunner, 'members', 'interestIds')) {
      return;
    }
    await queryRunner.query(
      `ALTER TABLE members ADD COLUMN interestIds JSON NULL AFTER preferences`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.columnExists(queryRunner, 'members', 'interestIds')) {
      await queryRunner.query(`ALTER TABLE members DROP COLUMN interestIds`);
    }
  }
}
