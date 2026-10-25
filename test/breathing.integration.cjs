require('ts-node/register');
require('tsconfig-paths/register');
const assert = require('node:assert/strict');
const { readdirSync } = require('node:fs');
const { resolve } = require('node:path');
const { createConnection } = require('mysql2/promise');
const { Test } = require('@nestjs/testing');
const { TypeOrmModule, getDataSourceToken } = require('@nestjs/typeorm');
const { ValidationPipe, UnauthorizedException } = require('@nestjs/common');
const { BreathingService } = require('../src/breathing/breathing.service');
const { CmsBreathingController, MemberBreathingController } = require('../src/breathing/breathing.controller');
const { BreathingExercise } = require('../src/entity/breathing-exercise.entity');
const { BreathingPage } = require('../src/entity/breathing-page.entity');
const { BreathingSession } = require('../src/entity/breathing-session.entity');
const { Activity } = require('../src/entity/activity.entity');
const { Member } = require('../src/entity/user-mimate.entity');
const { AdminAuthService } = require('../src/admin-auth/admin-auth.service');
const { MemberAuthService } = require('../src/member-auth/member-auth.service');
const { CmsMembersGuard } = require('../src/cms-members/cms-members.guard');
const { MemberAuthGuard } = require('../src/member-auth/member-auth.guard');
const { SuccessInterceptor } = require('../src/common/interceptors/success.interceptor');
const { NullToEmptyInterceptor } = require('../src/common/interceptors/null-to-empty.interceptor');

async function main() {
  const port = Number(process.env.BREATHING_TEST_PORT);
  assert(Number.isInteger(port) && port > 0, 'Set BREATHING_TEST_PORT to a disposable local MySQL server');
  const schema = `breathing_test_${process.pid}_${Date.now()}`;
  const connection = await createConnection({ host: '127.0.0.1', port, user: 'root', password: '' });
  let app;
  try {
    await connection.query(`CREATE DATABASE \`${schema}\``);
    const folder = resolve(__dirname, '../src/entity');
    let db;
    const tokens = new Map();
    const module = await Test.createTestingModule({
      imports: [TypeOrmModule.forRoot({ name: 'mimate', type: 'mysql', host: '127.0.0.1', port, username: 'root', password: '', database: schema, timezone: 'Z', synchronize: true, entities: readdirSync(folder).filter(file => /\.entity\.ts$/.test(file) && !/^(user|car|vehicle)\.entity\./.test(file)).map(file => resolve(folder, file)) })],
      controllers: [CmsBreathingController, MemberBreathingController],
      providers: [BreathingService, CmsMembersGuard, MemberAuthGuard,
        { provide: AdminAuthService, useValue: { currentAdmin: async id => { if (id !== 1) { throw new UnauthorizedException(); } } } },
        { provide: MemberAuthService, useValue: { limit: async () => {}, authenticateSession: async token => {
          const id = tokens.get(token);
          const member = id ? await db.getRepository(Member).findOneBy({ id }) : null;
          if (!member || member.is_suspended) { throw new UnauthorizedException(); }
          return { member, sessionId: 'synthetic' };
        } } },
      ],
    }).compile();
    db = module.get(getDataSourceToken('mimate'));
    app = module.createNestApplication();
    // Test-only identity setup; guards still reject unknown/missing/wrong-scope tokens.
    app.use((req, _res, next) => { if (req.headers.authorization === 'Bearer cms') { req.userData = { id: 1 }; } next(); });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalInterceptors(new SuccessInterceptor(), new NullToEmptyInterceptor());
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const member = await db.getRepository(Member).save({ name: 'Synthetic participant', email: 'breathing@example.test', username: 'breathing_test', memberAuthEnabled: true });
    const other = await db.getRepository(Member).save({ name: 'Other participant', email: 'other-breathing@example.test', username: 'other_breathing', memberAuthEnabled: true });
    // Audit actor must exist because activity_logs already links actors to members.
    assert.equal(member.id, 1);
    tokens.set('member', member.id); tokens.set('other', other.id);
    async function call(method, path, body, token = 'cms') {
      const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      const value = await response.json();
      return { status: response.status, data: value.data, body: value };
    }
    const cms = '/cms-breathing', mobile = '/me/breathing';
    // Exercise the actual mobile transport and adapter against real HTTP envelopes.
    const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
    function mobileModule(file, mocks) {
      const exports = {};
      const mobileRequire = require('node:module').createRequire(resolve(__dirname, '../../stressapp/package.json'));
      const code = ts.transpileModule(fs.readFileSync(resolve(__dirname, '../../stressapp', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
      vm.runInNewContext(code, { exports, AbortController, FormData, fetch, setTimeout, clearTimeout, process: { env: { EXPO_PUBLIC_API_URL: base } }, require: name => name in mocks ? mocks[name] : mobileRequire(name) });
      return exports;
    }
    const transport = mobileModule('lib/member-auth-api.ts', { 'react-native': { Platform: { OS: 'ios' } } });
    transport.configureMemberSession({ version: () => 1, refresh: async () => 'member' });
    const memberAdapter = mobileModule('lib/breathing-api.ts', { './member-auth-api': transport, '@/stores/auth-store': { useAuthStore: { getState: () => ({ token: 'member' }) } } }).breathingApi;
    const actualCatalog = await memberAdapter.catalog();
    assert.equal(actualCatalog.exercises.length, 3);
    const adapterSession = await memberAdapter.start(1, 1, 'synthetic-mobile-transport');
    assert.equal(adapterSession.status, 'in_progress');
    assert.equal((await memberAdapter.end({ id: adapterSession.id, status: 'stopped', elapsedSeconds: 0 })).status, 'stopped');
    // Remove only this synthetic adapter session before the fixed report-cohort assertions below.
    await db.getRepository(Activity).delete({ breathingSessionId: adapterSession.id });
    await db.getRepository(BreathingSession).delete(adapterSession.id);

    assert.equal((await call('GET', mobile, null, '')).status, 401);
    assert.equal((await call('GET', cms + '/exercises', null, 'member')).status, 401);
    assert.equal((await call('GET', mobile, null, 'cms')).status, 401);
    assert.equal((await call('GET', mobile, null, 'member')).data.exercises.length, 3);
    const page = (await call('GET', cms + '/page')).data;
    assert.deepEqual(page.durationOptions, [1, 3, 5, 10]);
    assert.equal((await call('PUT', cms + '/page', { ...page, defaultDuration: 2 })).status, 400);
    assert.equal((await call('PUT', cms + '/page', { ...page, durationOptions: [1, 1] })).status, 400);
    assert.equal((await call('PUT', cms + '/page', { ...page, defaultDuration: '3' })).status, 400);
    const pageChanges = await Promise.all([call('PUT', cms + '/page', { ...page, title: 'Updated breathing page' }), call('PUT', cms + '/page', { ...page, title: 'Conflicting page' })]);
    assert.deepEqual(pageChanges.map(result => result.status).sort(), [200, 409]);
    const input = { title: 'Custom 4-4-4-1', tag: 'Custom', description: 'Synthetic exercise', steps: ['Inhale', 'Hold', 'Exhale', 'Hold'], inhaleSeconds: 4, hold1Seconds: 4, exhaleSeconds: 4, hold2Seconds: 1, themeColor: '#123456', artwork: 'relaxation', imageUrl: null, guideImageUrl: null, sortOrder: 0, status: 'draft' };
    for (const patch of [{ inhaleSeconds: 0 }, { hold1Seconds: -1 }, { exhaleSeconds: '4' }, { hold2Seconds: 31 }, { steps: [] }, { steps: [' '] }, { status: 'public' }, { themeColor: 'red' }, { imageUrl: 'https://unowned.example.test/image.png' }, { ownerId: other.id }]) {
      assert.equal((await call('POST', cms + '/exercises', { ...input, ...patch })).status, 400, JSON.stringify(patch));
    }
    const draft = (await call('POST', cms + '/exercises', input)).data;
    assert.equal(draft.slug, '4-4-4-1');
    assert.equal(draft.imageUrl, null);
    assert(!(await call('GET', mobile, null, 'member')).data.exercises.some(row => row.id === draft.id));
    assert.equal((await call('POST', mobile + '/sessions', { requestId: 'synthetic-start-draft', exerciseId: draft.id, durationMinutes: 1 }, 'member')).status, 404);
    const edits = await Promise.all([call('PATCH', cms + '/exercises/' + draft.id, { ...input, revision: draft.revision, status: 'published' }), call('PATCH', cms + '/exercises/' + draft.id, { ...input, revision: draft.revision, title: 'Conflicting exercise' })]);
    assert.deepEqual(edits.map(result => result.status).sort(), [200, 409]);
    let exercise = (await call('GET', cms + '/exercises/' + draft.id)).data;
    // Whichever concurrent save won, publish the current revision explicitly.
    if (exercise.status !== 'published') { exercise = (await call('PATCH', cms + '/exercises/' + draft.id, { ...input, revision: exercise.revision, status: 'published' })).data; }
    const start = { requestId: 'synthetic-start-session', exerciseId: exercise.id, durationMinutes: 1 };
    assert.equal((await call('POST', mobile + '/sessions', { ...start, durationMinutes: 2 }, 'member')).status, 400);
    assert.equal((await call('POST', mobile + '/sessions', { ...start, memberId: other.id }, 'member')).status, 400);
    assert.equal((await call('POST', mobile + '/sessions', { ...start, durationMinutes: '1' }, 'member')).status, 400);
    const starts = await Promise.all([call('POST', mobile + '/sessions', start, 'member'), call('POST', mobile + '/sessions', start, 'member')]);
    assert(starts.every(result => result.status === 201), JSON.stringify(starts));
    assert.equal(starts[0].data.id, starts[1].data.id);
    const session = starts[0].data;
    assert.equal(await db.getRepository(Activity).countBy({ breathingSessionId: session.id, action: 'breathing-started' }), 1);
    assert.equal((await call('POST', mobile + '/sessions', { ...start, durationMinutes: 3 }, 'member')).status, 409);
    assert.equal((await call('PUT', mobile + '/sessions/' + session.id + '/end', { status: 'completed', elapsedSeconds: 60 }, 'other')).status, 404);
    assert.equal((await call('PUT', mobile + '/sessions/' + session.id + '/end', { status: 'completed', elapsedSeconds: 60 }, 'member')).status, 400);
    assert.equal((await call('PUT', mobile + '/sessions/' + session.id + '/end', { status: 'completed', elapsedSeconds: 5 }, 'member')).status, 400);
    await db.getRepository(BreathingSession).update(session.id, { startedAt: new Date(Date.now() - 61000) });
    const ends = await Promise.all([call('PUT', mobile + '/sessions/' + session.id + '/end', { status: 'completed', elapsedSeconds: 60 }, 'member'), call('PUT', mobile + '/sessions/' + session.id + '/end', { status: 'completed', elapsedSeconds: 60 }, 'member')]);
    assert(ends.every(result => result.status === 200));
    assert.equal(await db.getRepository(Activity).countBy({ breathingSessionId: session.id, action: 'breathing-completed' }), 1);
    assert.equal((await call('PUT', mobile + '/sessions/' + session.id + '/end', { status: 'stopped', elapsedSeconds: 10 }, 'member')).status, 409);
    const stopped = (await call('POST', mobile + '/sessions', { ...start, requestId: 'synthetic-stopped-session' }, 'member')).data;
    assert.equal((await call('PUT', mobile + '/sessions/' + stopped.id + '/end', { status: 'stopped', elapsedSeconds: 0 }, 'member')).status, 200);
    const unknown = (await call('POST', mobile + '/sessions', { ...start, requestId: 'synthetic-unknown-session' }, 'member')).data;
    await db.getRepository(BreathingSession).update(unknown.id, { startedAt: new Date(Date.now() - 25 * 3600000) });
    await call('PATCH', cms + '/exercises/' + exercise.id, { ...input, title: 'Renamed later', revision: exercise.revision, status: 'draft' });
    assert.equal((await call('POST', mobile + '/sessions', { ...start, requestId: 'synthetic-hidden-session' }, 'member')).status, 404);
    const from = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10), to = new Date().toISOString().slice(0, 10);
    const range = `?from=${from}&to=${to}`;
    const history = await call('GET', cms + '/history' + range + '&pageSize=1');
    assert.equal(history.status, 200, JSON.stringify(history));
    assert.equal(history.data.total, 3); assert.equal(history.data.items.length, 1);
    assert.notEqual(history.data.items[0].snapshot.title, 'Renamed later');
    assert.equal((await call('GET', cms + '/history' + range + '&status=unconfirmed')).data.total, 1);
    assert.equal((await call('GET', cms + '/history' + range + '&search=%25')).data.total, 0);
    assert.equal((await call('GET', cms + '/history?from=2026-02-30&to=2026-03-01')).status, 400);
    assert.equal((await call('GET', cms + '/history' + range + '&sort=member.passwordHash')).status, 400);
    let summary = (await call('GET', cms + '/summary' + range)).data;
    assert.equal(summary.started, 3); assert.equal(summary.completed, 1); assert.equal(summary.participants, 1); assert.equal(summary.completionRate, 1 / 3);
    const dashboard = await call('GET', cms + '/dashboard' + range);
    assert.equal(dashboard.status, 200);
    assert.equal(dashboard.data.started, 3);
    assert.equal(dashboard.data.daily.reduce((sum, row) => sum + row.count, 0), 1);
    assert.equal(dashboard.data.patterns.reduce((sum, row) => sum + row.started, 0), 3);
    assert.equal(dashboard.data.patterns[0].completed, 1);
    assert.equal(dashboard.data.recent.length, 3);
    assert.notEqual(dashboard.data.patterns[0].title, 'Renamed later');
    for (const token of [null, 'member']) {
      assert.equal((await call('GET', cms + '/dashboard' + range, null, token)).status, 401);
    }
    assert.equal((await call('GET', cms + '/dashboard?from=2026-02-30&to=2026-03-01')).status, 400);
    const emptyDashboard = (await call('GET', cms + '/dashboard?from=2000-01-01&to=2000-01-01')).data;
    assert.equal(emptyDashboard.completionRate, null);
    assert.deepEqual(emptyDashboard.patterns, []);
    assert.deepEqual(emptyDashboard.recent, []);
    assert.equal((await call('PUT', mobile + '/sessions/' + unknown.id + '/end', { status: 'completed', elapsedSeconds: 60 }, 'member')).status, 200);
    assert.equal((await call('GET', cms + '/summary' + range)).data.completed, 2);
    assert.equal((await call('GET', cms + '/summary?from=2000-01-01&to=2000-01-01')).data.completionRate, null);
    await db.getRepository(Member).update(member.id, { is_suspended: true });
    assert.equal((await call('GET', mobile, null, 'member')).status, 401);
    const service = module.get(BreathingService);
    const title = (await service.page()).title;
    await service.onModuleInit(); await db.synchronize(); await db.synchronize();
    assert.equal((await service.page()).title, title);
    assert.equal((await service.detail(exercise.id)).title, 'Renamed later');
    assert.equal(await db.getRepository(BreathingSession).count(), 3);
    console.log('Breathing HTTP/MySQL checks passed: auth, validation, draft/published, revisions, session replay/concurrency, ownership, early finish, log deduplication, snapshots, UTC reports, late sync, summary and repeat schema sync.');
  } finally {
    if (app) { await app.close(); }
    await connection.query(`DROP DATABASE IF EXISTS \`${schema}\``);
    await connection.end();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
