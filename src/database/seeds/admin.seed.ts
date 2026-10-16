import { IsEmail, IsString, Length, validateSync } from 'class-validator';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserAdmin } from '../../entity/user-admin.entity';
import { UserMimateEntity } from '../../entity/user-mimate.entity';

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
    throw new Error('Set valid ADMIN_SEED_EMAIL, ADMIN_SEED_PASSWORD (8–72 UTF-8 bytes), and ADMIN_SEED_NAME (1–100 characters).');
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
    if (!locked) throw new Error('Admin seed is already running; try again later.');
    await runner.startTransaction();
    const admins = runner.manager.getRepository(UserAdmin);
    const existing = await admins.findOne({ where: { email: input.email }, relations: ['userMimate'] });
    if (existing) {
      if (!existing.userMimate || existing.userMimate.deleted_at || existing.userMimate.is_suspended) {
        throw new Error('Existing admin has an unavailable linked profile; seed will not repair or reactivate it.');
      }
      await runner.commitTransaction();
      return 'exists';
    }
    const profiles = runner.manager.getRepository(UserMimateEntity);
    // Never promote or attach an existing member based only on an email match.
    if (await profiles.findOne({ where: { email: input.email }, withDeleted: true })) {
      throw new Error('A profile already uses this email; choose a dedicated admin email.');
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
