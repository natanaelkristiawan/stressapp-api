import { MigrationInterface, QueryRunner } from 'typeorm';

export class CmsAdmin1792108800000 implements MigrationInterface {
  /** Creates missing CMS identity tables; existing tables and data are preserved. */
  async up(q: QueryRunner): Promise<void> {
    await q.query(
      'CREATE TABLE IF NOT EXISTS `backup_members` (\n      `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,\n      `name` varchar(255) NULL,\n      `memberId` varchar(255) NULL,\n      `locale` varchar(255) NULL,\n      `status` varchar(255) NULL,\n      `email` varchar(255) NULL,\n      `spaces` varchar(255) NULL,\n      `externalId` varchar(255) NULL,\n      `userId` int NULL,\n      `email_mmid` varchar(255) NULL,\n      `timeZone` varchar(255) NULL,\n      `image_path` varchar(255) NULL,\n      `profilePictureUrl` varchar(255) NULL,\n      `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),\n      `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),\n      `deleted_at` datetime(6) NULL,\n      `last_seen_at` datetime NULL,\n      `activated_at` datetime NULL,\n      `total_posts` int NULL,\n      `total_followers` int NULL,\n      `total_followings` int NULL,\n      `total_spaces` int NULL,\n      `tagline` varchar(255) NULL,\n      `bio` varchar(255) NULL,\n      `gender` varchar(255) NULL,\n      `dob` date NULL,\n      `hobby` varchar(255) NULL,\n      `income` varchar(255) NULL,\n      `link` varchar(255) NULL,\n      `post_code` varchar(255) NULL,\n      `address` varchar(255) NULL,\n      `sim_expired` date NULL,\n      `total_comments` int NULL,\n      `total_likes` int NULL,\n      `total_shares` int NULL,\n      `member_role` int NULL,\n      `is_dealer` tinyint NOT NULL DEFAULT 0,\n      `mmid_fullname` varchar(255) NULL,\n      `is_suspended` tinyint NOT NULL DEFAULT 0,\n      `suspend_reason` varchar(255) NULL,\n      `member_verified` tinyint NOT NULL DEFAULT 0,\n      `profilePictureUrl_bak` varchar(255) NULL,\n      `profilePictureUrl_new` varchar(255) NULL,\n      `quiz_winner` int NULL,\n      KEY `IDX_17e60307ba88c3650db249d126` (`memberId`),\n      KEY `IDX_664a889ae0c27c846d0cd321ce` (`email`),\n      KEY `IDX_1bf48a289dc4454425100c443b` (`spaces`),\n      KEY `IDX_058b2c909b8111dd18093f0e6e` (`externalId`),\n      KEY `IDX_d4dee45d1a74a50e0e50f31245` (`userId`),\n      KEY `IDX_45221356bba98b2d9867edb737` (`email_mmid`)\n    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin',
    );
    await q.query(
      'CREATE TABLE IF NOT EXISTS `users` (\n      `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,\n      `name` varchar(255) NOT NULL,\n      `email` varchar(255) NOT NULL,\n      `email_verified_at` datetime NULL,\n      `password` varchar(255) NOT NULL,\n      `salt` varchar(255) NULL,\n      `remember_token` varchar(255) NULL,\n      `created_at` datetime NULL,\n      `updated_at` datetime NULL,\n      `backup_member_id` int NULL,\n      UNIQUE KEY `REL_9414d13705460c570f51e136c1` (`backup_member_id`),\n      CONSTRAINT `FK_cms_admin_profile` FOREIGN KEY (`backup_member_id`) REFERENCES `backup_members` (`id`) ON DELETE NO ACTION\n    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin',
    );
  }

  /** Shared legacy profiles must never be dropped by an automatic auth rollback. */
  async down(): Promise<void> {
    throw new Error(
      'CMS baseline rollback is disabled: users and backup_members may contain shared data.',
    );
  }
}
