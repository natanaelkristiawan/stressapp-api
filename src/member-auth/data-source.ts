import { MemberRefresh1791936001000 } from './migrations/1791936001000-MemberRefresh';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Member, MemberOtp, MemberSession } from './member-auth.entity';
import { MemberAuth1791936000000 } from './migrations/1791936000000-MemberAuth';
export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE_MIMATE,
  entities: [Member, MemberOtp, MemberSession],
  migrations: [MemberAuth1791936000000, MemberRefresh1791936001000],
  migrationsTableName: 'member_auth_migrations',
  synchronize: false,
});
