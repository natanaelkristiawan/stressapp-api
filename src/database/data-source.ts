import { readdirSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

import { InitialIdentity1792195200000 } from './migrations/1792195200000-InitialIdentity';

export const migrationGroups = [{
  migrationsTableName: 'typeorm_migrations',
  migrations: [InitialIdentity1792195200000],
}];

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
