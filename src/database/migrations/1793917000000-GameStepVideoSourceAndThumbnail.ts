import { MigrationInterface, QueryRunner } from 'typeorm';

export class GameStepVideoSourceAndThumbnail1793917000000
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
    // 1. Ensure game_levels table exists
    const hasGameLevels = await this.tableExists(queryRunner, 'game_levels');
    if (!hasGameLevels) {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS game_levels (
          id INT AUTO_INCREMENT PRIMARY KEY,
          level_number INT NOT NULL UNIQUE,
          title VARCHAR(120) NOT NULL,
          target_description TEXT NULL,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    }

    // 2. Ensure games table exists
    const hasGames = await this.tableExists(queryRunner, 'games');
    if (!hasGames) {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS games (
          id INT AUTO_INCREMENT PRIMARY KEY,
          level_id INT NOT NULL,
          \`key\` VARCHAR(100) NOT NULL UNIQUE,
          name VARCHAR(150) NOT NULL,
          order_index INT NOT NULL DEFAULT 0,
          success_message TEXT NULL,
          have_next_level TINYINT(1) NOT NULL DEFAULT 1,
          points_reward INT NOT NULL DEFAULT 50,
          is_published TINYINT(1) NOT NULL DEFAULT 1,
          created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          deleted_at DATETIME(6) NULL,
          INDEX idx_games_level_id (level_id),
          CONSTRAINT fk_games_level FOREIGN KEY (level_id) REFERENCES game_levels (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    }

    // 3. Ensure game_steps table exists with video_source and thumbnail_url
    const hasGameSteps = await this.tableExists(queryRunner, 'game_steps');
    if (!hasGameSteps) {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS game_steps (
          id INT AUTO_INCREMENT PRIMARY KEY,
          game_id INT NOT NULL,
          step_order INT NOT NULL DEFAULT 1,
          layout VARCHAR(50) NOT NULL,
          title VARCHAR(150) NOT NULL,
          description TEXT NOT NULL,
          description_extra TEXT NULL,
          instruction TEXT NULL,
          video_url VARCHAR(2048) NULL,
          video_source VARCHAR(50) NULL DEFAULT 'youtube',
          thumbnail_url VARCHAR(2048) NULL,
          reflective_title VARCHAR(150) NULL,
          reflective_question TEXT NULL,
          created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          INDEX idx_game_steps_game_id (game_id),
          CONSTRAINT fk_game_steps_game FOREIGN KEY (game_id) REFERENCES games (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    } else {
      // If game_steps already exists, ensure the new columns are present
      const hasVideoSource = await this.columnExists(
        queryRunner,
        'game_steps',
        'video_source',
      );
      if (!hasVideoSource) {
        await queryRunner.query(
          `ALTER TABLE game_steps ADD COLUMN video_source VARCHAR(50) NULL DEFAULT 'youtube' AFTER video_url`,
        );
      }

      const hasThumbnailUrl = await this.columnExists(
        queryRunner,
        'game_steps',
        'thumbnail_url',
      );
      if (!hasThumbnailUrl) {
        await queryRunner.query(
          `ALTER TABLE game_steps ADD COLUMN thumbnail_url VARCHAR(2048) NULL AFTER video_source`,
        );
      }
    }

    // 4. Ensure member_game_progress table exists
    const hasMemberGameProgress = await this.tableExists(
      queryRunner,
      'member_game_progress',
    );
    if (!hasMemberGameProgress) {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS member_game_progress (
          id INT AUTO_INCREMENT PRIMARY KEY,
          member_id INT NOT NULL,
          game_id INT NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'available',
          completed_at DATETIME NULL,
          created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          UNIQUE KEY uq_member_game (member_id, game_id),
          INDEX idx_mgp_member_id (member_id),
          INDEX idx_mgp_game_id (game_id),
          CONSTRAINT fk_mgp_game FOREIGN KEY (game_id) REFERENCES games (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    }

    // 5. Ensure member_game_submissions table exists
    const hasMemberGameSubmissions = await this.tableExists(
      queryRunner,
      'member_game_submissions',
    );
    if (!hasMemberGameSubmissions) {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS member_game_submissions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          member_id INT NOT NULL,
          game_id INT NOT NULL,
          note TEXT NULL,
          attachments JSON NULL,
          confidence_score INT NULL,
          list_answers JSON NULL,
          reflective_answer TEXT NULL,
          created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          INDEX idx_mgs_member_id (member_id),
          INDEX idx_mgs_game_id (game_id),
          CONSTRAINT fk_mgs_game FOREIGN KEY (game_id) REFERENCES games (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasGameSteps = await this.tableExists(queryRunner, 'game_steps');
    if (hasGameSteps) {
      const hasThumbnailUrl = await this.columnExists(
        queryRunner,
        'game_steps',
        'thumbnail_url',
      );
      if (hasThumbnailUrl) {
        await queryRunner.query(
          `ALTER TABLE game_steps DROP COLUMN thumbnail_url`,
        );
      }

      const hasVideoSource = await this.columnExists(
        queryRunner,
        'game_steps',
        'video_source',
      );
      if (hasVideoSource) {
        await queryRunner.query(
          `ALTER TABLE game_steps DROP COLUMN video_source`,
        );
      }
    }
  }
}
