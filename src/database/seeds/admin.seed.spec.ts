import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { adminSeedFailure, adminSeedInput, seedAdmin } from './admin.seed';
import { UserAdmin } from '../../entity/user-admin.entity';

describe('CMS admin seed', () => {
  const input = () => adminSeedInput({ ADMIN_SEED_EMAIL: ' Admin@example.com ', ADMIN_SEED_PASSWORD: ' password ' });
  function setup(existing: unknown = null) {
    const admins = { findOne: jest.fn().mockResolvedValue(existing), create: jest.fn(v => v), save: jest.fn() };
    const profiles = { findOne: jest.fn().mockResolvedValue(null), create: jest.fn(v => v), save: jest.fn().mockResolvedValue({ id: 7 }) };
    const runner = {
      connect: jest.fn(), query: jest.fn().mockResolvedValue([{ acquired: 1 }]),
      startTransaction: jest.fn(), commitTransaction: jest.fn(), rollbackTransaction: jest.fn(), release: jest.fn(),
      isTransactionActive: true,
      manager: { getRepository: jest.fn(entity => entity === UserAdmin ? admins : profiles) },
    };
    const source = { createQueryRunner: () => runner } as unknown as DataSource;
    return { source, runner, admins, profiles };
  }
  it('validates before database access, normalizes email and preserves password whitespace', () => {
    expect(input().email).toBe('admin@example.com');
    expect(input().password).toBe(' password ');
    for (const env of [{}, { ADMIN_SEED_EMAIL: 'bad', ADMIN_SEED_PASSWORD: 'password' }, { ADMIN_SEED_EMAIL: 'a@b.com', ADMIN_SEED_PASSWORD: '😀'.repeat(30) }]) {
      expect(() => adminSeedInput(env)).toThrow('Invalid ADMIN_SEED');
    }
  });
  it('reports actionable errors without leaking driver messages or credentials', () => {
    expect(adminSeedFailure({ code: 'ER_NO_SUCH_TABLE', message: 'secret SQL' })).toContain('table is missing');
    expect(adminSeedFailure({ code: 'ER_ACCESS_DENIED_ERROR', message: 'secret password' })).toContain('login denied');
    expect(adminSeedFailure(new Error('secret password'))).not.toContain('secret password');
    try { adminSeedInput({}); } catch (error) {
      expect(adminSeedFailure(error)).toContain('email, password');
    }
  });
  it('creates linked records with a password hash and commits', async () => {
    const { source, admins, profiles, runner } = setup();
    expect(await seedAdmin(source, input())).toBe('created');
    expect(profiles.create).toHaveBeenCalledWith(expect.objectContaining({ member_role: 1 }));
    const saved = admins.save.mock.calls[0][0];
    expect(saved.backup_member_id).toBe(7);
    expect(await bcrypt.compare(' password ', saved.password)).toBe(true);
    expect(runner.commitTransaction).toHaveBeenCalled();
    expect(runner.release).toHaveBeenCalled();
  });
  it('preserves existing credentials and refuses unavailable profiles', async () => {
    const existing = { userMimate: { is_suspended: false } };
    const state = setup(existing);
    expect(await seedAdmin(state.source, input())).toBe('exists');
    expect(state.admins.save).not.toHaveBeenCalled();
    existing.userMimate.is_suspended = true;
    await expect(seedAdmin(state.source, input())).rejects.toThrow('unavailable');
    expect(state.runner.rollbackTransaction).toHaveBeenCalled();
  });
  it('rolls back a failed write and refuses to promote an existing profile', async () => {
    const state = setup();
    state.admins.save.mockRejectedValue(new Error('write failed'));
    await expect(seedAdmin(state.source, input())).rejects.toThrow('write failed');
    expect(state.runner.rollbackTransaction).toHaveBeenCalled();
    state.profiles.findOne.mockResolvedValue({ id: 9 });
    await expect(seedAdmin(state.source, input())).rejects.toThrow('dedicated admin email');
  });
});
