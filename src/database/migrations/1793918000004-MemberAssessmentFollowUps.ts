import { MigrationInterface, QueryRunner } from 'typeorm';

// Hand-written on purpose: production runs with synchronize:false. Stores the
// two follow-up (2-week and 4-week) assessments as separate records per member.
// Re-running is safe: table creation checks information_schema first.
export class MemberAssessmentFollowUps1793918000004
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

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await this.tableExists(queryRunner, 'member_assessment_followups')) {
      return;
    }

    const hasVersions = await this.tableExists(
      queryRunner,
      'assessment_versions',
    );
    const versionConstraint = hasVersions
      ? `,
        CONSTRAINT FK_member_assessment_followups_version
          FOREIGN KEY (versionId) REFERENCES assessment_versions (id)`
      : '';

    await queryRunner.query(`
      CREATE TABLE member_assessment_followups (
        id INT NOT NULL AUTO_INCREMENT,
        memberId INT NOT NULL,
        followUpIndex TINYINT UNSIGNED NOT NULL,
        versionId INT NOT NULL,
        answers JSON NOT NULL,
        result JSON NOT NULL,
        completedAt DATETIME(6) NOT NULL,
        createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE INDEX idx_member_assessment_followups_member (memberId, followUpIndex),
        INDEX idx_member_assessment_followups_version (versionId),
        CONSTRAINT FK_member_assessment_followups_member
          FOREIGN KEY (memberId) REFERENCES members (id) ON DELETE CASCADE
        ${versionConstraint}
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.tableExists(queryRunner, 'member_assessment_followups')) {
      await queryRunner.query(`DROP TABLE member_assessment_followups`);
    }
  }
}
