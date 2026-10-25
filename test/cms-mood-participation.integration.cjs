// Disposable localhost MySQL only. No application .env, external database, Redis or email delivery.
require('ts-node/register'); require('tsconfig-paths/register');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const sharp = require('sharp');
const { readdirSync } = require('node:fs'); const { resolve } = require('node:path');
const { createConnection } = require('mysql2/promise');
const { Test } = require('@nestjs/testing'); const { TypeOrmModule, getDataSourceToken } = require('@nestjs/typeorm');
const { ConfigModule } = require('@nestjs/config'); const { JwtService } = require('@nestjs/jwt'); const { ValidationPipe } = require('@nestjs/common');
const { CmsMoodParticipationModule } = require('../src/cms-mood-participation/cms-mood-participation.module');
const { AdminAuthService } = require('../src/admin-auth/admin-auth.service'); const { AuthService } = require('../src/auth/auth.service');
const { RedisTokenMiddleware } = require('../src/middleware/redis-token.middleware');
const { SuccessInterceptor } = require('../src/common/interceptors/success.interceptor');
const { NullToEmptyInterceptor } = require('../src/common/interceptors/null-to-empty.interceptor');
const { AllExceptionsFilter } = require('../src/common/filters/http-exception.filter');
const { Member } = require('../src/entity/user-mimate.entity'); const { UserAdmin } = require('../src/entity/user-admin.entity');
const { MoodEntryEntity } = require('../src/entity/mood-entry.entity');
const { seedAdmin } = require('../src/database/seeds/admin.seed');
const secret = 'synthetic-cms-mood-secret', password = 'Synthetic123!';

/** Exercises real CMS HTTP/auth/report queries against synthetic MySQL. Returns after isolated schema cleanup. */
async function main() {
  const port = Number(process.env.CMS_MOOD_TEST_PORT);
  assert(Number.isInteger(port) && port > 0 && port <= 65535, 'Set CMS_MOOD_TEST_PORT to disposable local MySQL');
  Object.assign(process.env, { S3_BUCKET: 'test-public', S3_REGION: 'us-east-1', S3_ACCESS_KEY: 'synthetic-access', S3_SECRET_KEY: 'synthetic-secret', S3_SPACES_ENDPOINT: 'https://minio.example.test', BASE_URL: 'http://127.0.0.1' });
  const connection = await createConnection({ host: '127.0.0.1', port, user: 'root', password: '' });
  const schema = `cms_mood_test_${process.pid}_${Date.now()}`;
  let app;
  try {
    await connection.query(`CREATE DATABASE \`${schema}\``);
    const folder = resolve(__dirname, '../src/entity');
    const module = await Test.createTestingModule({ imports: [
      ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => ({ JWT_SECRET: secret })] }),
      TypeOrmModule.forRoot({ name: 'mimate', type: 'mysql', host: '127.0.0.1', port, username: 'root', password: '', database: schema, timezone: 'Z', synchronize: true,
        entities: readdirSync(folder).filter(file => /\.entity\.ts$/.test(file) && !/^(user|car|vehicle)\.entity\./.test(file)).map(file => resolve(folder, file)),
      }), CmsMoodParticipationModule,
    ] }).compile();
    app = module.createNestApplication();
    const db = module.get(getDataSourceToken('mimate'));
    const cms = module.get(AdminAuthService), jwt = new JwtService({ secret });
    const middleware = new RedisTokenMiddleware(jwt, new AuthService(db.getRepository(Member)), { getOrNil: () => ({ set: async () => undefined }) });
    app.enableCors({ origin: ['http://127.0.0.1:5183'] });
    const image = await sharp({ create: { width: 80, height: 80, channels: 3, background: '#20b8ab' } }).png().toBuffer();
    const audio = Buffer.alloc(8044, 128); audio.write('RIFF'); audio.writeUInt32LE(8036, 4); audio.write('WAVEfmt ', 8); audio.writeUInt32LE(16, 16); audio.writeUInt16LE(1, 20); audio.writeUInt16LE(1, 22); audio.writeUInt32LE(8000, 24); audio.writeUInt32LE(8000, 28); audio.writeUInt16LE(1, 32); audio.writeUInt16LE(8, 34); audio.write('data', 36); audio.writeUInt32LE(8000, 40);
    app.use((req, res, next) => {
      if (req.path.startsWith('/test-public/')) return res.type(req.path.endsWith('.png') ? 'image/png' : 'audio/wav').send(req.path.endsWith('.png') ? image : audio);
      if (req.path === '/admin-auth/login') return next();
      middleware.use(req, res, next).catch(error => res.status(error.getStatus?.() || 500).json({ success: false }));
    });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalInterceptors(new SuccessInterceptor(), new NullToEmptyInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.listen(Number(process.env.CMS_MOOD_HTTP_PORT || 0), '127.0.0.1');
    const base = await app.getUrl();
    if (process.env.CMS_MOOD_BROWSER === '1') process.env.S3_SPACES_ENDPOINT = base;
    await seedAdmin(db, { email: 'admin@example.test', name: 'Synthetic Admin', password });
    const admin = await db.getRepository(UserAdmin).findOne({ where: { email: 'admin@example.test' }, relations: ['userMimate'] });
    const token = await cms.login(admin);
    const repository = db.getRepository(Member);
    const members = [];
    for (const name of ['Alice', 'Bob', 'A%_Member']) members.push(await repository.save({ name, email: `${members.length}@example.test`, memberAuthEnabled: true, verifiedAt: new Date() }));
    await repository.update(members[1].id, { is_suspended: true }); // Historical participation includes suspended members.
    const legacy = await repository.save({ name: 'Excluded legacy', memberAuthEnabled: false });
    const deleted = await repository.save({ name: 'Excluded deleted', memberAuthEnabled: true });
    await repository.softDelete(deleted.id);
    await repository.update(admin.backup_member_id, { memberAuthEnabled: true });
    const month = new Date().toISOString().slice(0, 7);
    /** Stores a fixture daily record whose content is available only through approved admin detail access. Returns its row. */
    async function mood(memberId, day) {
      return db.getRepository(MoodEntryEntity).save({ memberId, dateString: `${month}-${String(day).padStart(2, '0')}`, timeZone: 'Asia/Makassar', score: 1, note: 'PRIVATE-NOTE-MUST-NOT-LEAK', attachmentIds: ['private-attachment-id'], createdAt: new Date('2020-01-01T00:00:00Z'), updatedAt: new Date() });
    }
    for (const member of members) for (let day = 10; day <= 17; day++) await mood(member.id, day);
    for (const memberId of [legacy.id, deleted.id, admin.backup_member_id]) await mood(memberId, 10);
    const range = `from=${month}-01&to=${month}-28`;
    const preflight = await fetch(`${base}/cms-mood-participation/summary`, { method: 'OPTIONS', headers: { Origin: 'http://127.0.0.1:5183', 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'authorization' } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), 'http://127.0.0.1:5183');

    /** Calls an actual read-only CMS route. Returns status, envelope and cache policy. */
    async function request(path = '', bearer = token, method = 'GET') {
      const response = await fetch(`${base}/cms-mood-participation${path}`, { method, headers: bearer ? { Authorization: `Bearer ${bearer}` } : {} });
      return { status: response.status, body: await response.json(), cache: response.headers.get('cache-control') };
    }
    for (const bearer of [null, 'invalid', jwt.sign({ id: members[0].id, iss: 'https://mimate.otesuto.com/admin-auth/login', aud: 'cms', kind: 'admin-access' }), jwt.sign({ id: admin.backup_member_id, iss: 'temu-sobat', aud: 'member', kind: 'member-access' }), jwt.sign({ id: admin.backup_member_id, iss: 'https://mimate.otesuto.com/admin-auth/login', aud: 'cms', kind: 'admin-access', exp: 1 })]) {
      assert.equal((await request(`?${range}`, bearer)).status, 401);
      assert.equal((await request(`/summary?${range}`, bearer)).status, 401);
      assert.equal((await request(`/1`, bearer)).status, 401);
    }
    const summary = await request(`/summary?${range}`);
    assert.equal(summary.status, 200); assert.equal(summary.cache, 'private, no-store');
    assert.equal(summary.body.data.totalEntries, 24); assert.equal(summary.body.data.uniqueParticipants, 3);
    assert.deepEqual(Object.keys(summary.body.data).sort(), ['dateBasis', 'from', 'generatedAt', 'to', 'totalEntries', 'uniqueParticipants']);
    const page1 = await request(`?${range}&pageSize=20`), page2 = await request(`?${range}&pageSize=20&page=2`);
    assert.equal(page1.status, 200); assert.equal(page1.body.data.total, 24); assert.equal(page2.body.data.items.length, 4);
    const rows = [...page1.body.data.items, ...page2.body.data.items];
    assert.equal(new Set(rows.map(row => row.id)).size, 24);
    for (const row of rows) {
      assert.deepEqual(Object.keys(row).sort(), ['dateString', 'id', 'memberName']);
      assert.match(row.dateString, /^\d{4}-\d{2}-\d{2}$/); assert(!row.memberName.startsWith('Excluded'));
    }
    assert(!JSON.stringify(rows).includes('PRIVATE-NOTE')); assert(!JSON.stringify(rows).includes('private-attachment'));
    assert.equal((await request(`?${range}&name=ALICE`)).body.data.total, 8);
    assert.equal((await request(`?${range}&name=%25_`)).body.data.total, 8);
    const asc = (await request(`?${range}&sortBy=memberName&sortOrder=asc&pageSize=100`)).body.data.items;
    assert.equal(asc[0].memberName, 'A%_Member'); assert.equal(asc.at(-1).memberName, 'Bob');
    const oldest = (await request(`?${range}&sortBy=dateString&sortOrder=asc`)).body.data.items;
    assert.equal(oldest[0].dateString, `${month}-10`);
    const dashboard = await request(`/dashboard?${range}`);
    assert.equal(dashboard.status, 200);
    assert.equal(dashboard.cache, 'private, no-store');
    assert.equal(dashboard.body.data.totalEntries, 24);
    assert.equal(dashboard.body.data.daily.reduce((sum, row) => sum + row.count, 0), 24);
    assert.equal(dashboard.body.data.recent.length, 4);
    for (const row of dashboard.body.data.recent) {
      assert.deepEqual(Object.keys(row).sort(), ['dateString', 'id', 'memberName']);
    }
    assert.equal((await request(`/dashboard?${range}`, null)).status, 401);
    assert.equal((await request('/dashboard?from=2026-02-30&to=2026-03-01')).status, 400);
    const emptyDashboard = (await request('/dashboard?from=2001-01-01&to=2001-01-02')).body.data;
    assert.deepEqual(emptyDashboard.daily, []);
    assert.deepEqual(emptyDashboard.recent, []);
    const single = (await request(`/summary?from=${month}-10&to=${month}-10`)).body.data;
    assert.equal(single.totalEntries, 3); assert.equal(single.uniqueParticipants, 3);
    const empty = (await request(`/summary?from=2001-01-01&to=2001-01-02`)).body.data;
    assert.equal(empty.totalEntries, 0); assert.equal(empty.uniqueParticipants, 0);
    assert.deepEqual((await request('?from=2001-01-01&to=2001-01-02')).body.data.items, []);
    for (const suffix of ['&page=0', '&pageSize=101', '&sortBy=score', '&sortOrder=invalid', '&email=private@example.test', '&name=' + 'x'.repeat(101)]) assert.equal((await request(`?${range}${suffix}`)).status, 400);
    for (const bad of ['from=2026-02-30&to=2026-03-01', 'from=2026-10-10&to=2026-10-01', 'from=2001-01-01&to=2026-01-01', 'to=2026-10-01']) {
      assert.equal((await request(`?${bad}`)).status, 400); assert.equal((await request(`/summary?${bad}`)).status, 400);
    }
    assert.equal((await request(`/summary?${range}&name=Alice`)).status, 400);
    assert.equal((await request(`?${range}`, token, 'PUT')).status, 404);
    const first = await db.getRepository(MoodEntryEntity).findOneBy({ memberId: members[0].id, dateString: `${month}-10` });
    const { AssetsEntity } = require('../src/entity/asset.entity');
    const photoId = randomUUID(), audioId = randomUUID(), foreignId = randomUUID(), missingId = randomUUID();
    for (const [mediaId, memberId, type, contentType, extension] of [[photoId, members[0].id, 'Image', 'image/png', 'png'], [audioId, members[0].id, 'Audio', 'audio/wav', 'wav'], [foreignId, members[1].id, 'Image', 'image/png', 'png']]) {
      await db.getRepository(AssetsEntity).save({ mediaId, memberId, type, contentType, size: 80, bucket: 'test-public', path: `${mediaId}.${extension}`, url: 'synthetic', url_open: 'synthetic', created_at: new Date() });
    }
    await db.getRepository(MoodEntryEntity).update(first.id, { attachmentIds: [photoId, audioId, foreignId, missingId], updatedAt: new Date('2026-10-18T06:00:00Z') });
    const detail = await request(`/${first.id}`);
    assert.equal(detail.status, 200); assert.equal(detail.cache, 'private, no-store');
    assert.equal(detail.body.data.memberName, 'Alice'); assert.equal(detail.body.data.score, 1);
    assert.equal(detail.body.data.note, 'PRIVATE-NOTE-MUST-NOT-LEAK');
    assert.equal(detail.body.data.createdAt, '2020-01-01T00:00:00.000Z');
    assert.equal(detail.body.data.updatedAt, '2026-10-18T06:00:00.000Z');
    assert.deepEqual(detail.body.data.attachments.map(file => file.id), [photoId, audioId]);
    assert.equal(detail.body.data.unavailableAttachmentCount, 2);
    assert(!JSON.stringify(detail.body).includes(foreignId));
    for (const file of detail.body.data.attachments) assert.deepEqual(Object.keys(file).sort(), ['contentType', 'id', 'size', 'type', 'url']);
    for (const id of ['invalid', '0', '-1', '1.5', '2147483648']) assert.equal((await request(`/${id}`)).status, 400);
    assert.equal((await request('/2147483647')).status, 404);
    for (const memberId of [legacy.id, deleted.id, admin.backup_member_id]) {
      const hidden = await db.getRepository(MoodEntryEntity).findOneBy({ memberId });
      assert.equal((await request(`/${hidden.id}`)).status, 404);
    }
    assert.equal((await request(`/${first.id}`, token, 'PUT')).status, 404);
    await db.getRepository(MoodEntryEntity).update(first.id, { score: 5, note: 'PRIVATE-UPDATED' });
    assert.equal((await request(`/summary?${range}`)).body.data.totalEntries, 24, 'Editing a daily record is not an additional participation event');
    await repository.update(admin.backup_member_id, { is_suspended: true });
    assert.equal((await request(`?${range}`)).status, 401); assert.equal((await request(`/summary?${range}`)).status, 401); assert.equal((await request(`/${first.id}`)).status, 401);
    await repository.update(admin.backup_member_id, { is_suspended: false });
    console.log('PASS: CMS participation HTTP/MySQL eligibility, exact aggregate reconciliation, compact list shape, authorized content/media detail, date boundaries, remote filtering/sorting/pagination, invalid input and live admin authorization.');
    if (process.env.CMS_MOOD_BROWSER === '1') {
      console.log(`Synthetic browser fixture ${base}; admin@example.test / ${password}`);
      await new Promise(resolve => { process.once('SIGINT', resolve); process.once('SIGTERM', resolve); });
    }
  } finally {
    if (app) await app.close();
    await connection.query(`DROP DATABASE IF EXISTS \`${schema}\``); await connection.end();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
