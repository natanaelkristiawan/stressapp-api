import { readdirSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'mysql',
  timezone: 'Z',
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
  synchronize: true,
});
