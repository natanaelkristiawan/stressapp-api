import { IsEmail, IsString, Length, validateSync } from 'class-validator';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserAdmin } from '../../entity/user-admin.entity';
import { UserMimateEntity } from '../../entity/user-mimate.entity';

/** Seed-owned errors contain instructions only, never SQL or credential values. */
export class AdminSeedError extends Error {}

/** Formats only known driver codes and seed-owned errors, never raw driver messages. */
export function adminSeedFailure(error: unknown): string {
  if (error instanceof AdminSeedError) return error.message;
  // Drivers can wrap the useful code in driverError/cause or AggregateError.errors.
  const codes = new Set<string>();
  const seen = new Set<object>();
  function collect(value: unknown, depth: number): void {
    if (!value || typeof value !== 'object' || seen.has(value) || depth > 3) return;
    seen.add(value);
    if ('code' in value && typeof value.code === 'string' &&
        /^(?:ER_[A-Z0-9_]+|E[A-Z0-9_]+|PROTOCOL_[A-Z0-9_]+)$/.test(value.code)) {
      codes.add(value.code);
    }
    if ('driverError' in value) collect(value.driverError, depth + 1);
    if ('cause' in value) collect(value.cause, depth + 1);
    if ('errors' in value && Array.isArray(value.errors)) {
      for (const child of value.errors.slice(0, 5)) collect(child, depth + 1);
    }
  }
  collect(error, 0);
  const messages: Record<string, string> = {
    ECONNREFUSED: 'Database connection refused. Check DB_HOST/DB_PORT and database availability.',
    ETIMEDOUT: 'Database connection timed out. Check network and database availability.',
    ENOTFOUND: 'Database hostname could not be resolved. Check DB_HOST.',
    ER_ACCESS_DENIED_ERROR: 'Database login denied. Check DB_USERNAME/DB_PASSWORD and database grants.',
    ER_DBACCESS_DENIED_ERROR: 'Database access denied. Check database-level grants for the configured user.',
    ER_TABLEACCESS_DENIED_ERROR: 'Table access denied. Check SELECT/INSERT/UPDATE grants on the identity tables.',
    ER_NOT_SUPPORTED_AUTH_MODE: 'Database authentication method is unsupported. Check the database user authentication setup.',
    ER_BAD_DB_ERROR: 'Configured database does not exist. Check DB_DATABASE_MIMATE.',
    ER_NO_SUCH_TABLE: 'Required database table is missing. Start the updated API or rerun the updated seed to synchronize development tables.',
    ER_BAD_FIELD_ERROR: 'Database columns do not match the API entities. Check the deployed entity definitions and development synchronization.',
    ER_NO_DEFAULT_FOR_FIELD: 'Database requires a field missing from the seed. Check the deployed schema.',
    ER_DUP_ENTRY: 'An existing record conflicts with the admin seed. Check account/profile uniqueness.',
    ER_DATA_TOO_LONG: 'A seed value exceeds a database column length. Check input lengths and schema.',
    ER_BAD_NULL_ERROR: 'A required database field is null. Check the deployed entities and development synchronization.',
    ER_NO_REFERENCED_ROW_2: 'Admin/profile foreign key failed. Check that users links to the current members table.',
    PROTOCOL_CONNECTION_LOST: 'Database connection was lost. Check database availability and network.',
  };
  if (codes.size) {
    const list = [...codes];
    return `${list.join(', ')}: ${list.map(code => messages[code]).find(Boolean) || 'Database/connection failure. Check the reported code and deployed schema.'}`;
  }
  const name = error instanceof Error ? error.name : '';
  const types: Record<string, string> = {
    EntityMetadataNotFoundError: 'Entity metadata is missing. Check deployed entity files and datasource registration; rebuild the API.',
    DataTypeNotSupportedError: 'An entity column type is unsupported. Check the deployed entity definitions and database driver.',
    TypeORMError: 'TypeORM initialization failed. Check entity relationships and deployed source versions.',
    QueryFailedError: 'A database query failed without a recognized driver code. Check database/schema compatibility.',
    AggregateError: 'Multiple connection attempts failed. Check database host, port and availability.',
  };
  return types[name] ? `${name}: ${types[name]}` :
    'Unclassified seed failure (no recognized driver code). Check deployed source/dependencies; raw errors are withheld to protect credentials.';
}

class AdminSeedInput {
  @IsEmail()
  @Length(1, 254)
  email: string;

  @IsString()
  @Length(8, 72)
  password: string;

  @IsString()
  @Length(1, 100)
  name: string;
}

/** Validates seed configuration without exposing passwords in validation errors. */
export function adminSeedInput(env: NodeJS.ProcessEnv): AdminSeedInput {
  const input = Object.assign(new AdminSeedInput(), {
    email: env.ADMIN_SEED_EMAIL?.trim().toLowerCase(),
    password: env.ADMIN_SEED_PASSWORD,
    name: (env.ADMIN_SEED_NAME || 'CMS Admin').trim(),
  });
  if (validateSync(input).length || Buffer.byteLength(input.password || '', 'utf8') > 72) {
    const fields = validateSync(input).map(error => error.property);
    if (Buffer.byteLength(input.password || '', 'utf8') > 72 && !fields.includes('password')) fields.push('password');
    throw new AdminSeedError(`Invalid ADMIN_SEED fields: ${fields.join(', ')}. Set valid email, password (8–72 UTF-8 bytes), and name (1–100 characters).`);
  }
  return input;
}

/** Creates a linked CMS admin atomically; reruns preserve all existing credentials/profiles. */
export async function seedAdmin(source: DataSource, input: AdminSeedInput): Promise<'created' | 'exists'> {
  const runner = source.createQueryRunner();
  await runner.connect();
  let locked = false;
  try {
    const rows = await runner.query("SELECT GET_LOCK('cms-admin-seed', 10) AS acquired");
    locked = Number(rows[0]?.acquired) === 1;
    if (!locked) throw new AdminSeedError('Admin seed is already running; try again later.');
    await runner.startTransaction();
    const admins = runner.manager.getRepository(UserAdmin);
    const existing = await admins.findOne({ where: { email: input.email }, relations: ['userMimate'] });
    if (existing) {
      if (!existing.userMimate || existing.userMimate.deleted_at || existing.userMimate.is_suspended) {
        throw new AdminSeedError('Existing admin has an unavailable linked profile; seed will not repair or reactivate it.');
      }
      await runner.commitTransaction();
      return 'exists';
    }
    const profiles = runner.manager.getRepository(UserMimateEntity);
    // Never promote or attach an existing member based only on an email match.
    if (await profiles.findOne({ where: { email: input.email }, withDeleted: true })) {
      throw new AdminSeedError('A profile already uses this email; choose a dedicated admin email.');
    }
    const profile = await profiles.save(profiles.create({
      name: input.name, email: input.email, member_role: 1,
      activated_at: new Date(), is_suspended: false,
    }));
    await admins.save(admins.create({
      name: input.name, email: input.email,
      password: await bcrypt.hash(input.password, 10),
      backup_member_id: profile.id, email_verified_at: new Date(),
      created_at: new Date(), updated_at: new Date(),
    }));
    await runner.commitTransaction();
    return 'created';
  } catch (error) {
    if (runner.isTransactionActive) await runner.rollbackTransaction();
    throw error;
  } finally {
    try {
      if (locked) await runner.query("SELECT RELEASE_LOCK('cms-admin-seed')");
    } finally {
      await runner.release();
    }
  }
}
