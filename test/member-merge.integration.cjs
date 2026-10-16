// Run against a disposable local MySQL server: MEMBER_MERGE_TEST_PORT=... node test/member-merge.integration.cjs
// Does not load .env or use the application's database configuration.
require('ts-node/register');
require('tsconfig-paths/register');
const assert = require('node:assert/strict');
const { readdirSync } = require('node:fs');
const { resolve } = require('node:path');
const { DataSource } = require('typeorm');
const { createConnection } = require('mysql2/promise');
const { Member } = require('../src/entity/user-mimate.entity');
const { UserMimateEntity } = require('../src/entity/user-mimate.entity');
const { UserAdmin } = require('../src/entity/user-admin.entity');
const { seedAdmin } = require('../src/database/seeds/admin.seed');
const { MemberAuthService } = require('../src/member-auth/member-auth.service');
const { AdminAuthService } = require('../src/admin-auth/admin-auth.service');
const { JwtService } = require('@nestjs/jwt');

async function main() {
  const port = Number(process.env.MEMBER_MERGE_TEST_PORT);
  assert(Number.isInteger(port) && port > 0 && port <= 65535, 'Set the disposable MySQL port explicitly');
  const options = { host: '127.0.0.1', port, user: 'root', password: '' };
  const schema = `member_merge_test_${process.pid}_${Date.now()}`;
  const admin = await createConnection(options);
  let db;
  try {
    await admin.query(`CREATE DATABASE \`${schema}\``);
    const folder = resolve(__dirname, '../src/entity');
    db = new DataSource({
      type: 'mysql', ...options, username: 'root', database: schema, synchronize: true,
      entities: [...readdirSync(folder)
        .filter(file => /\.entity\.ts$/.test(file) && !/^(user|vehicle|car)\.entity\./.test(file))
        .map(file => resolve(folder, file))],
    });
    await db.initialize();
    assert.equal(Member, UserMimateEntity);
    assert.equal(db.entityMetadatas.filter(meta => meta.tableName === 'members').length, 1);
    assert.equal(db.getMetadata(Member).columns.find(c => c.propertyName === 'passwordHash').isSelect, false);
    assert.equal(db.getMetadata(Member).columns.filter(c => c.isDeleteDate).length, 1);
    const q = db.createQueryRunner();
    await q.connect();
    try {
      assert.equal(await q.hasTable('backup_members'), false);
      assert.equal(await q.hasTable('members_auth_archive'), false);
      for (const field of ['locale', 'timeZone', 'income']) assert.equal(await q.hasColumn('members', field), false);
      assert.equal(await seedAdmin(db, { email: 'newadmin@example.test', name: 'New Admin', password: 'Synthetic123!' }), 'created');
      assert.equal(await seedAdmin(db, { email: 'newadmin@example.test', name: 'New Admin', password: 'Synthetic123!' }), 'exists');
      const profile = await db.getRepository(Member).findOneBy({ email: 'newadmin@example.test' });
      assert.equal(profile.memberAuthEnabled, false);
      assert.equal(profile.passwordHash, undefined);
      await db.getRepository(Member).update(profile.id, { username: 'admin', location: 'Jakarta', preferences: ['Reading'] });
      assert.deepEqual((await db.getRepository(Member).findOneBy({ id: profile.id })).preferences, ['Reading']);
      for (const table of ['users', 'member_sessions', 'member_otps']) {
        assert.equal((await q.getTable(table)).foreignKeys[0].referencedTableName, 'members');
      }
      await assert.rejects(q.query("INSERT INTO members (email) VALUES ('newadmin@example.test')"));
      await assert.rejects(q.query("INSERT INTO member_sessions (tokenHash, memberId, expiresAt) VALUES ('bad', 999, NOW())"));
      // Real auth/database/JWT behavior; only Redis limits and email submission are mocked.
      const deliveries = [];
      const jwt = new JwtService({ secret: 'synthetic-cms-test-secret' });
      const auth = new MemberAuthService(db, { add: async (_name, data) => deliveries.push(data) },
        { getOrThrow: () => ({ eval: async () => 1 }) },
        { get: () => undefined, getOrThrow: () => 'synthetic-member-test-secret' }, jwt);
      const registration = { name: 'Registered', email: 'registered@example.test', password: 'Synthetic123!', agreeTerms: true };
      await auth.register(registration);
      assert.equal(deliveries.length, 1);
      const session = await auth.verify({ email: registration.email, purpose: 'registration', code: deliveries[0].code, password: registration.password });
      assert.equal((await auth.authenticate(session.token)).email, registration.email);
      assert.equal((await auth.login({ email: registration.email, password: registration.password, rememberMe: false })).member.id, session.member.id);
      await db.getRepository(Member).update(session.member.id, { is_suspended: true });
      await assert.rejects(auth.authenticate(session.token));
      await db.getRepository(Member).update(session.member.id, { is_suspended: false });
      await db.getRepository(Member).softDelete(session.member.id);
      await assert.rejects(auth.authenticate(session.token));
      await db.getRepository(Member).restore(session.member.id);
      const rotated = await auth.refresh(session.refreshToken);
      await assert.rejects(auth.refresh(session.refreshToken));
      await auth.logout(rotated.token);
      await assert.rejects(auth.authenticate(rotated.token));
      await auth.register({ ...registration, email: 'newadmin@example.test' });
      assert.equal(deliveries.length, 1, 'Registration must not claim or enable a CMS-only profile');
      await assert.rejects(auth.login({ email: 'newadmin@example.test', password: 'Synthetic123!' }));
      const cms = new AdminAuthService(jwt, db.getRepository(UserAdmin));
      await assert.rejects(cms.validateUser(registration.email, registration.password));
      assert.equal((await cms.validateUser('newadmin@example.test', 'Synthetic123!')).userMimate.memberAuthEnabled, false);
      const before = await q.query('SELECT id, email, password FROM users ORDER BY id');
      await db.synchronize();
      assert.deepEqual(await q.query('SELECT id, email, password FROM users ORDER BY id'), before);
      console.log('Identity sync MySQL checks passed: repeat synchronization preserves records, constraints, FKs, registration/OTP/login/refresh/logout, suspension/deletion, CMS isolation, secret exclusion, profile storage, admin seed.');
    } finally {
      await q.release();
    }
  } finally {
    if (db?.isInitialized) await db.destroy();
    await admin.query(`DROP DATABASE \`${schema}\``);
    await admin.end();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
