// Disposable local MySQL only. No application .env, Redis or email delivery is used.
require('ts-node/register');
require('tsconfig-paths/register');
const assert = require('node:assert/strict');
const { readdirSync } = require('node:fs');
const { resolve } = require('node:path');
const { createConnection } = require('mysql2/promise');
const { Test } = require('@nestjs/testing');
const { TypeOrmModule, getDataSourceToken } = require('@nestjs/typeorm');
const { ConfigModule } = require('@nestjs/config');
const { JwtService } = require('@nestjs/jwt');
const { ValidationPipe } = require('@nestjs/common');
const bcrypt = require('bcrypt');
const { CmsMembersModule } = require('../src/cms-members/cms-members.module');
const { AdminAuthModule } = require('../src/admin-auth/admin-auth.module');
const { AdminAuthService } = require('../src/admin-auth/admin-auth.service');
const { AuthService } = require('../src/auth/auth.service');
const { RedisTokenMiddleware } = require('../src/middleware/redis-token.middleware');
const { MemberAuthService } = require('../src/member-auth/member-auth.service');
const { SuccessInterceptor } = require('../src/common/interceptors/success.interceptor');
const { NullToEmptyInterceptor } = require('../src/common/interceptors/null-to-empty.interceptor');
const { AllExceptionsFilter } = require('../src/common/filters/http-exception.filter');
const { Member } = require('../src/entity/user-mimate.entity');
const { UserAdmin } = require('../src/entity/user-admin.entity');
const { MemberSession } = require('../src/entity/member-session.entity');
const { MemberOtp } = require('../src/entity/member-otp.entity');
const { Activity } = require('../src/entity/activity.entity');
const { seedAdmin } = require('../src/database/seeds/admin.seed');
const secret = 'synthetic-cms-members-test-secret';
const password = 'Synthetic123!';

/** Builds a real Nest HTTP API on isolated MySQL and checks authorization/data integrity. Returns after cleanup. */
async function main() {
  const port = Number(process.env.CMS_MEMBERS_TEST_PORT);
  assert(Number.isInteger(port) && port > 0 && port <= 65535, 'Set CMS_MEMBERS_TEST_PORT to a disposable local MySQL server');
  const options = { host: '127.0.0.1', port, user: 'root', password: '' };
  const schema = `cms_members_test_${process.pid}_${Date.now()}`;
  const admin = await createConnection(options);
  let app;
  try {
    await admin.query(`CREATE DATABASE \`${schema}\``);
    const folder = resolve(__dirname, '../src/entity');
    const module = await Test.createTestingModule({ imports: [
      ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => ({ JWT_SECRET: secret })] }),
      TypeOrmModule.forRoot({
        name: 'mimate', type: 'mysql', ...options, username: 'root', database: schema, timezone: 'Z', synchronize: true,
        entities: readdirSync(folder).filter(file => /\.entity\.ts$/.test(file) && !/^(user|car|vehicle)\.entity\./.test(file)).map(file => resolve(folder, file)),
      }), CmsMembersModule, AdminAuthModule,
    ] }).compile();
    app = module.createNestApplication();
    const db = module.get(getDataSourceToken('mimate'));
    const cms = module.get(AdminAuthService);
    const jwt = new JwtService({ secret });
    const tokenMiddleware = new RedisTokenMiddleware(jwt, new AuthService(db.getRepository(Member)), { getOrNil: () => ({ set: async () => undefined }) });
    app.enableCors({ origin: ['http://127.0.0.1:5182'] });
    app.use((req, res, next) => {
      if (req.path === '/admin-auth/login') return next();
      tokenMiddleware.use(req, res, next).catch(error => res.status(error.getStatus?.() || 500).json({ success: false }));
    });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalInterceptors(new SuccessInterceptor(), new NullToEmptyInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.listen(Number(process.env.CMS_MEMBERS_HTTP_PORT || 0), '127.0.0.1');
    const base = await app.getUrl();
    await seedAdmin(db, { email: 'admin@example.test', name: 'Test Admin', password });
    const adminAccount = await db.getRepository(UserAdmin).findOne({ where: { email: 'admin@example.test' }, relations: ['userMimate'] });
    const token = await cms.login(adminAccount);
    const mobileAuth = new MemberAuthService(db, { add: async () => undefined }, { getOrThrow: () => ({ eval: async () => 1 }) }, { get: () => undefined, getOrThrow: () => secret }, new JwtService());
    const repository = db.getRepository(Member);
    const hash = await bcrypt.hash(password, 4);
    const members = [];
    for (const [name, email, date] of [
      ['Alice', 'alice@example.test', '2026-10-10T00:00:00Z'],
      ['A%_Member', 'literal@example.test', '2026-10-10T23:59:59Z'],
      ['Bob', 'bob@example.test', '2026-10-11T00:00:00Z'],
    ]) members.push(await repository.save(repository.create({ name, email, passwordHash: hash, memberAuthEnabled: true, created_at: new Date(date), verifiedAt: new Date(), termsAcceptedAt: new Date() })));
    await repository.save(repository.create({ name: 'Legacy', email: 'legacy@example.test', memberAuthEnabled: false }));
    // Even an admin profile with memberAuthEnabled=true must be excluded from member management.
    await repository.update(adminAccount.backup_member_id, { memberAuthEnabled: true });

    /** Calls the real HTTP API. Returns parsed status/envelope for assertions. */
    async function request(path = '', method = 'GET', body, accessToken = token) {
      const response = await fetch(`${base}/cms-members${path}`, { method,
        headers: { ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return { status: response.status, body: await response.json() };
    }
    /** Asserts the expected HTTP status. Returns safe response data. */
    async function expectStatus(expected, path, method, body, accessToken) {
      const result = await request(path, method, body, accessToken);
      assert.equal(result.status, expected, `${method || 'GET'} ${path}: ${JSON.stringify(result.body)}`);
      return result.body.data;
    }

    await expectStatus(401, '', 'GET', undefined, null);
    await expectStatus(401, '', 'GET', undefined, 'invalid');
    await expectStatus(401, '', 'GET', undefined, jwt.sign({ id: members[0].id, iss: 'https://mimate.otesuto.com/admin-auth/login', aud: 'cms', kind: 'admin-access' }));
    await expectStatus(401, '', 'GET', undefined, jwt.sign({ id: adminAccount.backup_member_id, iss: 'temu-sobat', aud: 'member', kind: 'member-access' }));
    await expectStatus(401, '', 'GET', undefined, jwt.sign({ id: adminAccount.backup_member_id, iss: 'https://mimate.otesuto.com/admin-auth/login', aud: 'cms', kind: 'admin-access', exp: 1 }));
    const page = await expectStatus(200, '?page=1&pageSize=2');
    assert.equal(page.total, 3); assert.equal(page.items.length, 2);
    assert(!JSON.stringify(page).includes('passwordHash'));
    assert.deepEqual(page.items.map(row => row.name), ['Bob', 'A%_Member'], 'default order remains newest first');
    for (const sortBy of ['name', 'email', 'createdAt']) {
      const ascending = await expectStatus(200, `?sortBy=${sortBy}&sortOrder=asc&pageSize=2`);
      const next = await expectStatus(200, `?sortBy=${sortBy}&sortOrder=asc&pageSize=2&page=2`);
      const descending = await expectStatus(200, `?sortBy=${sortBy}&sortOrder=desc&pageSize=2`);
      assert.equal(ascending.total, 3);
      assert.equal(next.items.length, 1);
      const ordered = [...ascending.items, ...next.items];
      assert.equal(new Set(ordered.map(row => row.id)).size, 3, 'remote pages must not overlap');
      assert(ordered.every((row, index) => !index || ordered[index - 1][sortBy] <= row[sortBy]), `${sortBy} must sort the complete result`);
      assert(descending.items[0][sortBy] >= descending.items[1][sortBy]);
    }
    const usernames = await expectStatus(200, '?sortBy=username&sortOrder=asc&pageSize=2');
    assert.deepEqual(usernames.items.map(row => row.id), [members[2].id, members[1].id], 'equal/null values use stable descending ID order');
    assert.equal((await expectStatus(200, '?name=Alice&sortBy=email&sortOrder=desc')).items[0].id, members[0].id);

    assert.equal((await expectStatus(200, '?name=ALICE&email=alice')).total, 1);
    assert.equal((await expectStatus(200, '?name=%25_')).total, 1, 'search must treat wildcard characters literally');
    assert.equal((await expectStatus(200, '?startDate=2026-10-10&endDate=2026-10-10')).total, 2);
    for (const query of ['?page=0', '?pageSize=101', '?startDate=2026-02-30', '?startDate=2026-10-12&endDate=2026-10-10', '?extra=1', '?sortBy=passwordHash', '?sortBy=name%3BDROP%20TABLE%20members', '?sortOrder=ASC', '?sortOrder=invalid', '?sortBy=', '?sortOrder=']) await expectStatus(400, query);
    for (const id of ['0', '-1', 'bad']) await expectStatus(400, `/${id}`);
    await expectStatus(404, `/${adminAccount.backup_member_id}`);
    await expectStatus(404, '', 'POST', { name: 'No creation endpoint' });
    let alice = await expectStatus(200, `/${members[0].id}`);
    assert(!('passwordHash' in alice) && !('sessions' in alice) && !('termsAcceptedAt' in alice));
    for (const extra of [{ email: 'changed@example.test' }, { member_role: 1 }, { memberAuthEnabled: false }]) {
      await expectStatus(400, `/${alice.id}`, 'PUT', { name: 'Alice', updatedAt: alice.updatedAt, ...extra });
    }
    await expectStatus(400, `/${alice.id}`, 'PUT', { name: ' ', updatedAt: alice.updatedAt });
    await expectStatus(400, `/${alice.id}`, 'PUT', { name: 'Alice', photoUrl: 'http://insecure.example/photo.png', updatedAt: alice.updatedAt });
    const stale = alice.updatedAt;
    alice = await expectStatus(200, `/${alice.id}`, 'PUT', { name: 'Alice Updated', username: 'alice_user', photoUrl: null, updatedAt: stale });
    assert.equal(alice.username, 'alice_user'); assert.equal(alice.email, 'alice@example.test');
    await expectStatus(409, `/${alice.id}`, 'PUT', { name: 'stale', updatedAt: stale });
    const duplicateTarget = await expectStatus(200, `/${members[1].id}`);
    await expectStatus(409, `/${duplicateTarget.id}`, 'PUT', { name: 'Other', username: 'alice_user', updatedAt: duplicateTarget.updatedAt });
    const concurrent = await Promise.all([
      request(`/${alice.id}`, 'PUT', { name: 'Concurrent A', updatedAt: alice.updatedAt }),
      request(`/${alice.id}`, 'PUT', { name: 'Concurrent B', updatedAt: alice.updatedAt }),
    ]);
    assert.deepEqual(concurrent.map(row => row.status).sort(), [200, 409]);
    alice = await expectStatus(200, `/${alice.id}`);
    await expectStatus(400, `/${alice.id}/suspension`, 'PATCH', { suspended: true, reason: ' ', updatedAt: alice.updatedAt });
    const session = await mobileAuth.login({ email: alice.email, password, rememberMe: false });
    alice = await expectStatus(200, `/${alice.id}/suspension`, 'PATCH', { suspended: true, reason: 'Test moderation', updatedAt: alice.updatedAt });
    assert.equal(alice.suspended, true);
    await assert.rejects(mobileAuth.authenticate(session.token));
    assert.equal(await db.getRepository(MemberSession).countBy({ memberId: alice.id }), 0);
    alice = await expectStatus(200, `/${alice.id}/suspension`, 'PATCH', { suspended: false, updatedAt: alice.updatedAt });
    await assert.rejects(mobileAuth.authenticate(session.token));
    await repository.update(members[1].id, { verifiedAt: null });
    let badge = await expectStatus(200, `/${members[1].id}`);
    badge = await expectStatus(200, `/${badge.id}/verification`, 'PATCH', { verified: true, updatedAt: badge.updatedAt });
    assert.equal(badge.profileVerified, true); assert.equal(badge.emailVerified, false);
    badge = await expectStatus(200, `/${badge.id}/verification`, 'PATCH', { verified: false, updatedAt: badge.updatedAt });
    assert.equal(badge.profileVerified, false);
    const toDelete = await mobileAuth.login({ email: alice.email, password, rememberMe: false });
    alice = await expectStatus(200, `/${alice.id}`);
    await expectStatus(200, `/${alice.id}`, 'DELETE', { updatedAt: alice.updatedAt });
    await expectStatus(404, `/${alice.id}`);
    await assert.rejects(mobileAuth.authenticate(toDelete.token));
    assert((await repository.findOne({ where: { id: alice.id }, withDeleted: true })).deleted_at);
    assert.equal((await expectStatus(200, '')).total, 2);
    const audit = await db.getRepository(Activity).find({ where: { targetUserId: alice.id } });
    assert(audit.some(row => row.action === 'member.deleted'));
    assert(audit.every(row => row.userId === adminAccount.backup_member_id && row.source === 'cms'));
    assert.equal(await db.getRepository(MemberOtp).countBy({ memberId: alice.id }), 0);
    await repository.update(adminAccount.backup_member_id, { is_suspended: true });
    await expectStatus(401, '');
    await repository.update(adminAccount.backup_member_id, { is_suspended: false });
    console.log('PASS: CMS member HTTP/MySQL authorization, mobile-only filters, remote sorting/pagination, UTC date boundaries, validation, edits/conflicts, audit, badge isolation, session revocation and soft deletion.');
    if (process.env.CMS_MEMBERS_BROWSER === '1') {
      console.log(`Local browser fixture: ${base}; admin@example.test / ${password}; member list retains two sample records.`);
      await new Promise(resolve => { process.once('SIGTERM', resolve); process.once('SIGINT', resolve); });
    }
  } finally {
    if (app) await app.close();
    await admin.query(`DROP DATABASE \`${schema}\``);
    await admin.end();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
