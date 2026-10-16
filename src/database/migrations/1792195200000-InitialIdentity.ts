import { MigrationInterface, QueryRunner } from 'typeorm';

/** Initial identity schema for the user-confirmed empty database. */
export class InitialIdentity1792195200000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE \`members\` (
      \`passwordHash\` varchar(60) NULL,
      \`verifiedAt\` datetime NULL,
      \`termsAcceptedAt\` datetime NULL,
      \`memberAuthEnabled\` tinyint NOT NULL DEFAULT 0,
      \`username\` varchar(100) NULL,
      \`location\` varchar(100) NULL,
      \`preferences\` json NULL,
      UNIQUE KEY \`UQ_members_email\` (\`email\`),
      UNIQUE KEY \`UQ_members_username\` (\`username\`),
      \`id\` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
      \`name\` varchar(255) NULL,
      \`memberId\` varchar(255) NULL,
      \`status\` varchar(255) NULL,
      \`email\` varchar(255) NULL,
      \`spaces\` varchar(255) NULL,
      \`externalId\` varchar(255) NULL,
      \`userId\` int NULL,
      \`email_mmid\` varchar(255) NULL,
      \`image_path\` varchar(255) NULL,
      \`profilePictureUrl\` varchar(255) NULL,
      \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      \`deleted_at\` datetime(6) NULL,
      \`last_seen_at\` datetime NULL,
      \`activated_at\` datetime NULL,
      \`total_posts\` int NULL,
      \`total_followers\` int NULL,
      \`total_followings\` int NULL,
      \`total_spaces\` int NULL,
      \`tagline\` varchar(255) NULL,
      \`bio\` varchar(255) NULL,
      \`gender\` varchar(255) NULL,
      \`dob\` date NULL,
      \`hobby\` varchar(255) NULL,
      \`link\` varchar(255) NULL,
      \`post_code\` varchar(255) NULL,
      \`address\` varchar(255) NULL,
      \`sim_expired\` date NULL,
      \`total_comments\` int NULL,
      \`total_likes\` int NULL,
      \`total_shares\` int NULL,
      \`member_role\` int NULL,
      \`is_dealer\` tinyint NOT NULL DEFAULT 0,
      \`mmid_fullname\` varchar(255) NULL,
      \`is_suspended\` tinyint NOT NULL DEFAULT 0,
      \`suspend_reason\` varchar(255) NULL,
      \`member_verified\` tinyint NOT NULL DEFAULT 0,
      \`profilePictureUrl_bak\` varchar(255) NULL,
      \`profilePictureUrl_new\` varchar(255) NULL,
      \`quiz_winner\` int NULL,
      KEY \`IDX_17e60307ba88c3650db249d126\` (\`memberId\`),
      KEY \`IDX_664a889ae0c27c846d0cd321ce\` (\`email\`),
      KEY \`IDX_1bf48a289dc4454425100c443b\` (\`spaces\`),
      KEY \`IDX_058b2c909b8111dd18093f0e6e\` (\`externalId\`),
      KEY \`IDX_d4dee45d1a74a50e0e50f31245\` (\`userId\`),
      KEY \`IDX_45221356bba98b2d9867edb737\` (\`email_mmid\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin`);
    await q.query(`CREATE TABLE member_otps (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, memberId INT NOT NULL, purpose VARCHAR(20) NOT NULL,
      codeHash VARCHAR(64) NOT NULL, attempts INT NOT NULL DEFAULT 0,
      expiresAt DATETIME NOT NULL, sentAt DATETIME NOT NULL, consumedAt DATETIME NULL,
      resetHash VARCHAR(64) NULL UNIQUE, resetExpiresAt DATETIME NULL,
      UNIQUE KEY member_purpose (memberId, purpose), FOREIGN KEY (memberId) REFERENCES members(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await q.query(`CREATE TABLE member_sessions (
      tokenHash VARCHAR(64) NOT NULL PRIMARY KEY, memberId INT NOT NULL, refreshHash VARCHAR(64) NULL UNIQUE, expiresAt DATETIME NOT NULL,
      KEY member_sessions_member (memberId), FOREIGN KEY (memberId) REFERENCES members(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await q.query(`CREATE TABLE \`users\` (
      \`id\` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
      \`name\` varchar(255) NOT NULL,
      \`email\` varchar(255) NOT NULL,
      \`email_verified_at\` datetime NULL,
      \`password\` varchar(255) NOT NULL,
      \`salt\` varchar(255) NULL,
      \`remember_token\` varchar(255) NULL,
      \`created_at\` datetime NULL,
      \`updated_at\` datetime NULL,
      \`backup_member_id\` int NULL,
      UNIQUE KEY \`REL_9414d13705460c570f51e136c1\` (\`backup_member_id\`),
      CONSTRAINT \`FK_cms_admin_profile\` FOREIGN KEY (\`backup_member_id\`) REFERENCES \`members\` (\`id\`) ON DELETE NO ACTION
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE users');
    await q.query('DROP TABLE member_sessions');
    await q.query('DROP TABLE member_otps');
    await q.query('DROP TABLE members');
  }
}
