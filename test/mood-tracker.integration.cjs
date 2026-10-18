// Disposable local MySQL only; S3 transport, Redis and email are boundary mocks.
require('ts-node/register');
require('tsconfig-paths/register');
const assert = require('node:assert/strict');
const { readdirSync } = require('node:fs');
const { resolve } = require('node:path');
const { randomBytes, randomUUID } = require('node:crypto');
const { createConnection } = require('mysql2/promise');
const { Test } = require('@nestjs/testing');
const { TypeOrmModule, getDataSourceToken } = require('@nestjs/typeorm');
const { ValidationPipe } = require('@nestjs/common');
const { JwtService } = require('@nestjs/jwt');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');
const { Member } = require('../src/entity/user-mimate.entity');
const { MemberSession } = require('../src/entity/member-session.entity');
const { MoodEntryEntity } = require('../src/entity/mood-entry.entity');
const { MoodAttachment } = require('../src/entity/mood-attachment.entity');
const { MoodTrackerController } = require('../src/mood-tracker/mood-tracker.controller');
const { MoodTrackerService, localMoodDate, moodRange } = require('../src/mood-tracker/mood-tracker.service');
const { MoodUploadController } = require('../src/upload/mood-upload.controller');
const { MoodUploadService, audioContentType } = require('../src/upload/mood-upload.service');
const { MemberAuthGuard } = require('../src/member-auth/member-auth.guard');
const { MemberAuthService } = require('../src/member-auth/member-auth.service');
const { SuccessInterceptor } = require('../src/common/interceptors/success.interceptor');
const { NullToEmptyInterceptor } = require('../src/common/interceptors/null-to-empty.interceptor');
const { AllExceptionsFilter } = require('../src/common/filters/http-exception.filter');

/** Exercises real HTTP/DTO/auth/MySQL paths. Returns after dropping only its unique synthetic schema. */
async function main() {
  const port = Number(process.env.MOOD_TEST_PORT);
  assert(Number.isInteger(port) && port > 0 && port <= 65535, 'Set MOOD_TEST_PORT to disposable local MySQL');
  Object.assign(process.env, { S3_BUCKET: 'test-public', S3_PRIVATE_BUCKET: 'test-private', S3_ACCESS_KEY: 'synthetic-access', S3_SECRET_KEY: 'synthetic-secret', S3_SPACES_ENDPOINT: 'https://minio.example.test', BASE_URL: 'http://127.0.0.1' });
  const schema = `mood_test_${process.pid}_${Date.now()}`;
  const connection = await createConnection({ host: '127.0.0.1', port, user: 'root', password: '' });
  const originalSend = S3Client.prototype.send;
  const puts = [];
  S3Client.prototype.send = async function(command) { if (command instanceof PutObjectCommand) puts.push(command.input); return {}; };
  let app;
  try {
    await connection.query(`CREATE DATABASE \`${schema}\``);
    const folder = resolve(__dirname, '../src/entity');
    let rateCount = 1;
    const jwt = new JwtService();
    const secret = 'synthetic-mood-test-secret';
    const module = await Test.createTestingModule({
      imports: [TypeOrmModule.forRoot({ name: 'mimate', type: 'mysql', host: '127.0.0.1', port, username: 'root', password: '', database: schema, timezone: 'Z', synchronize: true,
        entities: readdirSync(folder).filter(file => /\.entity\.ts$/.test(file) && !/^(user|car|vehicle)\.entity\./.test(file)).map(file => resolve(folder, file)),
      })],
      controllers: [MoodTrackerController, MoodUploadController],
      providers: [MoodTrackerService, MoodUploadService, MemberAuthGuard, {
        provide: MemberAuthService, inject: [getDataSourceToken('mimate')],
        useFactory: db => new MemberAuthService(db, { add: async () => undefined }, { getOrThrow: () => ({ eval: async () => rateCount }) }, { get: () => secret, getOrThrow: () => secret }, jwt),
      }],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalInterceptors(new SuccessInterceptor(), new NullToEmptyInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const db = module.get(getDataSourceToken('mimate'));
    const repo = db.getRepository(Member);
    const alice = await repo.save({ email: 'alice@example.test', name: 'Alice', memberAuthEnabled: true, verifiedAt: new Date() });
    const bob = await repo.save({ email: 'bob@example.test', name: 'Bob', memberAuthEnabled: true, verifiedAt: new Date() });
    /** Creates a real revocable member JWT fixture. Returns only a synthetic access token. */
    async function access(member) {
      const sid = randomBytes(32).toString('hex');
      await db.getRepository(MemberSession).save({ tokenHash: sid, memberId: member.id, expiresAt: new Date(Date.now() + 3600000) });
      return jwt.sign({ sid, kind: 'member-access' }, { secret, subject: String(member.id), issuer: 'temu-sobat', audience: 'member', expiresIn: 3600 });
    }
    const token = await access(alice), other = await access(bob);
    const timeZone = 'Asia/Makassar';
    const today = localMoodDate(new Date(), timeZone);
    const yesterday = new Date(Date.parse(today) - 86400000).toISOString().slice(0, 10);
    const tomorrow = new Date(Date.parse(today) + 86400000).toISOString().slice(0, 10);
    const query = new URLSearchParams({ from: yesterday, to: tomorrow, timeZone });
    /** Calls a real HTTP route. Returns status and parsed envelope. */
    async function request(path, method = 'GET', body, bearer = token) {
      const response = await fetch(base + path, { method, headers: { ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      return { status: response.status, body: await response.json() };
    }
    /** Posts multipart data through Multer. Returns status and parsed envelope. */
    async function upload(kind, buffer, mime, bearer = token) {
      const form = new FormData(); form.append('file', new Blob([buffer], { type: mime }), 'fixture');
      const response = await fetch(`${base}/upload/mood/${kind}`, { method: 'POST', headers: bearer ? { Authorization: `Bearer ${bearer}` } : {}, body: form });
      return { status: response.status, body: await response.json() };
    }
    assert.equal((await request(`/me/moods?${query}`, 'GET', undefined, '')).status, 401);
    assert.equal((await request(`/me/moods?${query}`, 'GET', undefined, jwt.sign({ sub: String(alice.id) }, { secret, audience: 'admin' }))).status, 401);
    const expired = jwt.sign({ sid: randomBytes(32).toString('hex'), kind: 'member-access' }, { secret, subject: String(alice.id), issuer: 'temu-sobat', audience: 'member', expiresIn: -1 });
    assert.equal((await request(`/me/moods?${query}`, 'GET', undefined, expired)).status, 401);
    assert.equal((await request(`/me/moods/${today}?timeZone=${timeZone}`)).status, 404);
    assert.deepEqual((await request(`/me/moods?${query}`)).body.data.items, []);
    const privateResponse = await fetch(`${base}/me/mood-summary?${query}`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(privateResponse.headers.get('cache-control'), 'private, no-store');
    const empty = (await privateResponse.json()).data;
    assert.deepEqual(empty.days.map(day => day.score), [null, null, null]);
    assert.equal(empty.stats.total, 0);
    for (const score of [0, 6, 1.5, '4', null]) assert.equal((await request(`/me/moods/${today}`, 'PUT', { score, timeZone })).status, 400);
    for (const body of [{ score: 4, timeZone: 'bad' }, { score: 4, timeZone, memberId: bob.id }, { score: 4, timeZone, note: 'a'.repeat(2001) }, { score: 4, timeZone, attachmentIds: [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()] }]) assert.equal((await request(`/me/moods/${today}`, 'PUT', body)).status, 400);
    assert.equal((await request('/me/moods/2026-02-30', 'PUT', { score: 4, timeZone })).status, 400);
    for (const date of [yesterday, tomorrow]) assert.equal((await request(`/me/moods/${date}`, 'PUT', { score: 4, timeZone })).status, 400);
    assert.equal((await request(`/me/moods?${query}&pageSize=101`)).status, 400);
    assert.equal((await request(`/me/moods?${query}&timeZone=bad`)).status, 400);
    assert.equal((await request(`/me/moods?from=${tomorrow}&to=${yesterday}&timeZone=${timeZone}`)).status, 400);
    assert.equal((await request(`/me/moods?from=2020-01-01&to=${today}&timeZone=${timeZone}`)).status, 400);
    const saved = await request(`/me/moods/${today}`, 'PUT', { score: 1, timeZone, note: 'private reflection' });
    assert.equal(saved.status, 200); assert.equal(saved.body.data.mood, 'sangat_buruk');
    const createdAt = saved.body.data.createdAt;
    const concurrent = await Promise.all([1, 5, 3, 5].map(score => request(`/me/moods/${today}`, 'PUT', { score, timeZone })));
    assert(concurrent.every(result => result.status === 200));
    assert.equal(await db.getRepository(MoodEntryEntity).countBy({ memberId: alice.id }), 1);
    const final = await request(`/me/moods/${today}`, 'PUT', { score: 5, timeZone });
    assert.equal(final.body.data.id, saved.body.data.id); assert.equal(final.body.data.createdAt, createdAt);
    assert.equal((await request(`/me/moods/${today}?timeZone=${timeZone}`, 'GET', undefined, other)).status, 404);
    const chart = (await request(`/me/mood-summary?${query}&grouping=month`)).body.data;
    assert.deepEqual(chart.days.map(day => day.score), [null, 5, null]); assert.equal(chart.stats.sangatBaik, 1);
    // Seed one older owned record to verify history pagination without enabling backdated writes.
    await db.getRepository(MoodEntryEntity).save({ memberId: alice.id, dateString: yesterday, score: 2, note: '', attachmentIds: [], timeZone, createdAt: new Date(), updatedAt: new Date() });
    const page = (await request(`/me/moods?${query}&pageSize=1&page=2`)).body.data;
    assert.equal(page.total, 2); assert.equal(page.items[0].dateString, yesterday);
    assert.equal((await request(`/me/moods/${today}`, 'DELETE')).status, 404);
    const image = await sharp({ create: { width: 4, height: 4, channels: 3, background: 'red' } }).png().toBuffer();
    const photo = await upload('image', image, 'image/png');
    assert.equal(photo.status, 201); assert.equal(photo.body.data.type, 'photo');
    const signed = new URL(photo.body.data.url);
    assert.equal(signed.searchParams.get('X-Amz-Expires'), '300'); assert(signed.searchParams.has('X-Amz-Signature'));
    assert.equal(puts[0].Bucket, 'test-private'); assert.equal(puts[0].ContentType, 'image/webp');
    assert.equal((await upload('image', Buffer.from('fake'), 'image/png')).status, 400);
    assert.equal((await upload('image', Buffer.alloc(5 * 1024 * 1024 + 1), 'image/png')).status, 413);
    assert.equal((await upload('image', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'), 'image/png')).status, 400);
    assert.equal((await upload('image', image, 'image/png', '')).status, 401);
    const wav = Buffer.alloc(44); wav.write('RIFF'); wav.write('WAVE', 8);
    const audio = await upload('audio', wav, 'audio/wav');
    assert.equal(audio.status, 201); assert.equal(audio.body.data.type, 'audio');
    assert.equal((await upload('audio', Buffer.from('not audio'), 'audio/wav')).status, 400);
    rateCount = 61;
    assert.equal((await upload('audio', wav, 'audio/wav')).status, 429);
    rateCount = 1;
    assert.equal((await upload('audio', Buffer.alloc(10 * 1024 * 1024 + 1), 'audio/wav')).status, 413);
    assert.equal((await request(`/upload/mood/${photo.body.data.id}`, 'GET', undefined, other)).status, 404);
    assert.equal((await request(`/upload/mood/${photo.body.data.id}`)).status, 200);
    assert.equal((await request(`/upload/mood/not-uuid`)).status, 400);
    const ids = [photo.body.data.id, audio.body.data.id];
    assert.equal((await request(`/me/moods/${today}`, 'PUT', { score: 4, timeZone, attachmentIds: ids }, other)).status, 404);
    assert.equal((await request(`/me/moods/${today}`, 'PUT', { score: 4, timeZone, attachmentIds: [ids[0], ids[0]] })).status, 400);
    assert.equal((await request(`/me/moods/${today}`, 'PUT', { score: 4, timeZone, attachmentIds: [randomUUID()] })).status, 404);
    const attached = await request(`/me/moods/${today}`, 'PUT', { score: 4, timeZone, attachmentIds: ids });
    assert.equal(attached.status, 200); assert.equal(attached.body.data.attachments.length, 2);
    assert.equal(await db.getRepository(MoodAttachment).count(), 2);
    const privateBucket = process.env.S3_PRIVATE_BUCKET; delete process.env.S3_PRIVATE_BUCKET;
    assert.equal((await upload('audio', wav, 'audio/wav')).status, 503);
    process.env.S3_PRIVATE_BUCKET = process.env.S3_BUCKET;
    assert.equal((await upload('audio', wav, 'audio/wav')).status, 503);
    process.env.S3_PRIVATE_BUCKET = privateBucket;
    await repo.update(alice.id, { is_suspended: true });
    assert.equal((await request(`/me/moods?${query}`)).status, 401);
    assert.equal((await upload('audio', wav, 'audio/wav')).status, 401);
    await repo.update(alice.id, { is_suspended: false });
    await db.getRepository(MemberSession).delete({ memberId: alice.id });
    assert.equal((await request(`/me/moods?${query}`)).status, 401);
    assert.equal(localMoodDate(new Date('2026-10-17T16:30:00Z'), 'Asia/Makassar'), '2026-10-18');
    assert.equal(localMoodDate(new Date('2026-10-18T00:30:00Z'), 'America/Los_Angeles'), '2026-10-17');
    assert.equal(moodRange({ from: '2024-02-28', to: '2024-03-01' }), 3);
    assert.throws(() => audioContentType(Buffer.from('<html>'), 'audio/mpeg'));
    await db.synchronize(); // Verify repeated development synchronization preserves entries.
    assert.equal(await db.getRepository(MoodEntryEntity).countBy({ memberId: alice.id }), 2);
    console.log('Mood HTTP/MySQL integration passed: validation, authorization, daily upsert/concurrency, gaps, private upload ownership and session revocation. S3/Redis/email are mocked.');
  } finally {
    S3Client.prototype.send = originalSend;
    if (app) await app.close();
    await connection.query(`DROP DATABASE IF EXISTS \`${schema}\``);
    await connection.end();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
