import { readdirSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

import {
  Member,
  MemberOtp,
  MemberSession,
} from '../member-auth/member-auth.entity';
import { MemberAuth1791936000000 } from './migrations/1791936000000-MemberAuth';
import { MemberRefresh1791936001000 } from './migrations/1791936001000-MemberRefresh';
import { CmsAdmin1792108800000 } from './migrations/1792108800000-CmsAdmin';

// Preserve deployed history tables while keeping migration code/configuration together.
export const migrationGroups = [
  {
    migrationsTableName: 'member_auth_migrations',
    migrations: [MemberAuth1791936000000, MemberRefresh1791936001000],
  },
  {
    migrationsTableName: 'cms_auth_migrations',
    migrations: [CmsAdmin1792108800000],
  },
];

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE_MIMATE,
  // Exclude retired external users/vehicles; users remains the CMS table.
  entities: [
    Member,
    MemberOtp,
    MemberSession,
    ...readdirSync(join(__dirname, '../entity'))
      .filter(
        (file) =>
          /\.entity\.(ts|js)$/.test(file) &&
          !/^(user|vehicle|car)\.entity\./.test(file),
      )
      .map((file) => join(__dirname, '../entity', file)),
  ],
  migrations: migrationGroups.flatMap((group) => group.migrations),
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
});
