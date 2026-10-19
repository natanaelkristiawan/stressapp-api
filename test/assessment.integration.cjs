// Synthetic fixtures only. Creates and drops a unique schema on an explicitly selected local test MySQL.
require('ts-node/register');
require('tsconfig-paths/register');
const assert = require('node:assert/strict');
const { readdirSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { randomBytes } = require('node:crypto');
const { createConnection } = require('mysql2/promise');
const { Test } = require('@nestjs/testing');
const { TypeOrmModule, getDataSourceToken } = require('@nestjs/typeorm');
const { ValidationPipe } = require('@nestjs/common');
const { JwtService } = require('@nestjs/jwt');
const { AdminAuthController } = require('../src/admin-auth/admin-auth.controller');
const { AssessmentController } = require('../src/assessment/assessment.controller');
const { CmsAssessmentController } = require('../src/assessment/cms-assessment.controller');
const { AssessmentService } = require('../src/assessment/assessment.service');
const { AssessmentVersion } = require('../src/entity/assessment-version.entity');
const { MemberAssessment } = require('../src/entity/member-assessment.entity');
const { Member } = require('../src/entity/user-mimate.entity');
const { MemberSession } = require('../src/entity/member-session.entity');
const { UserAdmin } = require('../src/entity/user-admin.entity');
const { MemberAuthService } = require('../src/member-auth/member-auth.service');
const { MemberAuthGuard } = require('../src/member-auth/member-auth.guard');
const { AdminAuthService } = require('../src/admin-auth/admin-auth.service');
const { CmsMembersGuard } = require('../src/cms-members/cms-members.guard');
const { RedisTokenMiddleware } = require('../src/middleware/redis-token.middleware');
const { seedAdmin } = require('../src/database/seeds/admin.seed');
const { SuccessInterceptor } = require('../src/common/interceptors/success.interceptor');
const { NullToEmptyInterceptor } = require('../src/common/interceptors/null-to-empty.interceptor');
const { AllExceptionsFilter } = require('../src/common/filters/http-exception.filter');

/** Returns a synthetic configuration; these questions and thresholds are never seeded into the application. */
function definition() {
  return {
    title: 'Synthetic assessment', disclaimer: 'Synthetic test disclaimer',
    sourceReference: 'Test only', scoringNotes: 'Direct scoring, test fixture only',
    questions: Array.from({ length: 6 }, (_, i) => ({ id: `q${i + 1}`, text: `Question ${i + 1}`,
      reverseScored: false, options: [1, 2, 3, 4].map(value => ({ value, label: `Answer ${value}` })) })),
    categories: [
      { id: 'low', label: 'Low', min: 6, max: 9, interpretation: 'Test low' },
      { id: 'moderate', label: 'Moderate', min: 10, max: 15, interpretation: 'Test moderate' },
      { id: 'high', label: 'High', min: 16, max: 24, interpretation: 'Test high' },
    ],
  };
}

/** Exercises the actual DTO/guard/service/SQL paths with mocked queue/Redis boundaries. Drops only its own schema. */
async function main() {
  const port = Number(process.env.ASSESSMENT_TEST_PORT);
  assert(Number.isInteger(port) && port > 0 && port <= 65535, 'Set ASSESSMENT_TEST_PORT to a disposable local MySQL');
  const options = { host: '127.0.0.1', port, user: 'root', password: '' };
  const schema = `assessment_test_${process.pid}_${Date.now()}`;
  const connection = await createConnection(options);
  const secret = 'synthetic-assessment-secret';
  const jwt = new JwtService({ secret });
  let app;
  try {
    await connection.query(`CREATE DATABASE \`${schema}\``);
    const folder = resolve(__dirname, '../src/entity');
    const module = await Test.createTestingModule({
      imports: [TypeOrmModule.forRoot({ name: 'mimate', type: 'mysql', ...options, username: 'root',
        database: schema, timezone: 'Z', synchronize: true,
        entities: readdirSync(folder).filter(f => /\.entity\.ts$/.test(f) && !/^(user|car|vehicle)\.entity\./.test(f)).map(f => resolve(folder, f)),
      })],
      controllers: [AssessmentController, CmsAssessmentController, AdminAuthController],
      providers: [AssessmentService, MemberAuthGuard, CmsMembersGuard,
        { provide: MemberAuthService, inject: [getDataSourceToken('mimate')],
          useFactory: db => new MemberAuthService(db, { add: async () => undefined },
            { getOrThrow: () => ({ eval: async () => 1 }) }, { get: () => secret, getOrThrow: () => secret }, jwt) },
        { provide: AdminAuthService, inject: [getDataSourceToken('mimate')],
          useFactory: db => new AdminAuthService(jwt, db.getRepository(UserAdmin)) },
      ],
    }).compile();
    app = module.createNestApplication();
    const db = module.get(getDataSourceToken('mimate'));
    await db.synchronize(); // Repeat schema sync must remain safe.
    const middleware = new RedisTokenMiddleware(jwt,
      { getLocalMember: id => db.getRepository(Member).findOneBy({ id }) },
      { getOrNil: () => ({ set: async () => undefined }) }, module.get(MemberAuthService));
    app.use((req, res, next) => {
      if (req.method === 'OPTIONS' || req.path.startsWith('/me/assessment') || req.path === '/admin-auth/login') return next();
      middleware.use(req, res, next).catch(next);
    });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalInterceptors(new SuccessInterceptor(), new NullToEmptyInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());
    app.enableCors({ origin: ['http://127.0.0.1:5188'] });
    await app.listen(Number(process.env.ASSESSMENT_HTTP_PORT || 0), '127.0.0.1');
    const base = await app.getUrl();
    await seedAdmin(db, { email: 'assessment-admin@example.test', name: 'Test Admin', password: 'Syntheticpass123!' });
    const account = await db.getRepository(UserAdmin).findOne({ where: { email: 'assessment-admin@example.test' }, relations: ['userMimate'] });
    const admin = await module.get(AdminAuthService).login(account);
    const repo = db.getRepository(Member);
    const alice = await repo.save({ name: 'Alice', email: 'assessment-alice@example.test', memberAuthEnabled: true, verifiedAt: new Date() });
    const bob = await repo.save({ name: 'Bob', email: 'assessment-bob@example.test', memberAuthEnabled: true, verifiedAt: new Date() });
    const carol = await repo.save({ name: 'Carol', email: 'assessment-carol@example.test', memberAuthEnabled: true, verifiedAt: new Date() });
    /** Creates an actual persisted session. Returns a synthetic member JWT. */
    async function access(member) {
      const sid = randomBytes(32).toString('hex');
      await db.getRepository(MemberSession).save({ tokenHash: sid, memberId: member.id, expiresAt: new Date(Date.now() + 3600000) });
      return jwt.sign({ sid, kind: 'member-access' }, { subject: String(member.id), issuer: 'temu-sobat', audience: 'member', expiresIn: 3600 });
    }
    const token = await access(alice), other = await access(bob), third = await access(carol);
    /** Calls a real HTTP endpoint. Returns status and safe parsed envelope. */
    async function request(path, method = 'GET', body, bearer = token) {
      const response = await fetch(base + path, { method,
        headers: { ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}) });
      return { status: response.status, body: await response.json() };
    }
    /** Checks expected status. Returns response data for assertions. */
    async function expectStatus(status, path, method, body, bearer) {
      const response = await request(path, method, body, bearer);
      assert.equal(response.status, status, `${method || 'GET'} ${path}: ${JSON.stringify(response.body)}`);
      return response.body.data;
    }
    const cms = '/cms-assessments', me = '/me/assessment';
    await expectStatus(401, me, 'GET', undefined, '');
    await expectStatus(401, me, 'GET', undefined, 'invalid');
    await expectStatus(401, me, 'GET', undefined, admin);
    await expectStatus(401, cms, 'GET', undefined, token);
    await expectStatus(401, cms, 'GET', undefined, '');
    const forgedRole = jwt.sign({ id: alice.id, iss: 'https://mimate.otesuto.com/admin-auth/login', aud: 'cms', kind: 'admin-access' });
    await expectStatus(401, cms, 'GET', undefined, forgedRole);
    let state = await expectStatus(200, me);
    assert.equal(state.initialMood, null); assert.equal(state.result, null); assert.equal(state.nextStep, 'mood');
    assert.equal((await expectStatus(200, cms, 'GET', undefined, admin)).activeVersionId, null);
    const body = { versionId: 1, answers: definition().questions.map(q => ({ questionId: q.id, value: 1 })) };
    await expectStatus(400, me, 'PUT', body);
    for (const score of [0, 6, '3', null, 2.5]) await expectStatus(400, `${me}/mood`, 'PUT', { score });
    await expectStatus(400, `${me}/mood`, 'PUT', { score: 3, memberId: bob.id });
    const mood = await expectStatus(200, `${me}/mood`, 'PUT', { score: 2 });
    assert.equal(mood.feedbackType, 'empathetic');
    assert.deepEqual(await expectStatus(200, `${me}/mood`, 'PUT', { score: 2 }), mood);
    assert.equal((await expectStatus(200, me)).nextStep, 'unavailable');
    await expectStatus(503, me, 'PUT', body);
    for (const mutate of [
      d => d.questions.pop(), d => { d.questions[0].reverseScored = 'false'; },
      d => { d.questions[0].options[0].value = '1'; }, d => { d.questions[1].id = 'q1'; },
      d => { d.categories[2].max = 21; }, d => { d.categories[1].min = 9; },
      d => { d.questions[0].options[3].value = 3; }, d => { d.extra = true; },
      d => { d.disclaimer = ' '; }, d => { d.questions[0].options[0].extra = 1; },
    ]) { const invalid = definition(); mutate(invalid); await expectStatus(400, cms, 'POST', invalid, admin); }
    let draft = await expectStatus(201, cms, 'POST', definition(), admin);
    assert.equal(draft.publishedAt, null); assert.equal(draft.revision, 1);
    const id = draft.id; body.versionId = id;
    await expectStatus(400, `${cms}/bad`, 'GET', undefined, admin);
    await expectStatus(404, `${cms}/2147483647`, 'GET', undefined, admin);
    await expectStatus(400, `${cms}?pageSize=101`, 'GET', undefined, admin);
    await expectStatus(400, `${cms}/${id}/publish`, 'POST', { revision: 1, scoringApproved: false }, admin);
    await expectStatus(400, `${cms}/${id}/publish`, 'POST', { revision: 1, scoringApproved: 'true' }, admin);
    await expectStatus(409, `${cms}/${id}`, 'PUT', { ...definition(), revision: 2 }, admin);
    draft = await expectStatus(200, `${cms}/${id}`, 'PUT', { ...definition(), revision: 1 }, admin);
    const publication = { revision: draft.revision, scoringApproved: true };
    const published = await expectStatus(201, `${cms}/${id}/publish`, 'POST', publication, admin);
    assert.equal(published.revision, 3);
    assert.deepEqual(await expectStatus(201, `${cms}/${id}/publish`, 'POST', publication, admin), published);
    await expectStatus(409, `${cms}/${id}`, 'PUT', { ...definition(), revision: 3 }, admin);
    state = await expectStatus(200, me);
    assert.equal(state.nextStep, 'assessment'); assert.equal(state.questionnaire.questions.length, 6);
    assert(!('reverseScored' in state.questionnaire.questions[0])); assert(!('scoringNotes' in state.questionnaire));
    for (const invalid of [
      { ...body, answers: body.answers.slice(1) },
      { ...body, answers: [...body.answers.slice(0, 5), body.answers[0]] },
      { ...body, answers: body.answers.map((a, i) => i ? a : { ...a, value: 5 }) },
      { ...body, answers: body.answers.map((a, i) => i ? a : { ...a, questionId: 'unknown' }) },
      { ...body, score: 24 }, { ...body, memberId: bob.id },
      { ...body, versionId: '1' },
    ]) await expectStatus(400, me, 'PUT', invalid);
    const results = await Promise.all([request(me, 'PUT', body), request(me, 'PUT', body)]);
    assert(results.every(r => r.status === 200)); assert.deepEqual(results[0].body.data, results[1].body.data);
    assert.equal(results[0].body.data.result.score, 6);
    assert.equal(await db.getRepository(MemberAssessment).countBy({ memberId: alice.id }), 1);
    state = await expectStatus(200, me);
    assert.equal(state.completed, true); assert.equal(state.nextStep, 'home');
    assert.equal(state.result.score, 6);
    const changed = { ...body, answers: body.answers.map(a => ({ ...a, value: 4 })) };
    await expectStatus(409, me, 'PUT', changed);
    await expectStatus(409, `${me}/mood`, 'PUT', { score: 5 });
    assert.equal((await expectStatus(200, me, 'GET', undefined, other)).result, null);
    await expectStatus(200, `${me}/mood`, 'PUT', { score: 5 }, other);
    await expectStatus(200, `${me}/mood`, 'PUT', { score: 3 }, third);
    const next = definition(); next.questions[4].reverseScored = true; next.title = 'New instrument';
    const v2 = await expectStatus(201, cms, 'POST', next, admin);
    await expectStatus(201, `${cms}/${v2.id}/publish`, 'POST', { revision: 1, scoringApproved: true }, admin);
    await expectStatus(409, me, 'PUT', body, other);
    await expectStatus(409, `${cms}/${id}/publish`, 'POST', publication, admin);
    const historical = await expectStatus(200, me);
    assert.equal(historical.questionnaire.versionId, id); assert.equal(historical.result.score, 6);
    assert.deepEqual(await expectStatus(200, me, 'PUT', body), results[0].body.data);
    const bobResult = await expectStatus(200, me, 'PUT', { ...body, versionId: v2.id }, other);
    assert.equal(bobResult.result.score, 9);
    // Concurrent conflicting submissions: one succeeds and the other must not overwrite it.
    const conflicts = await Promise.all([
      request(me, 'PUT', { ...body, versionId: v2.id }, third),
      request(me, 'PUT', { ...changed, versionId: v2.id }, third),
    ]);
    assert.deepEqual(conflicts.map(r => r.status).sort(), [200, 409]);
    const day = new Date().toISOString().slice(0, 10);
    const range = `from=${day}&to=${day}`;
    const history = `${cms}/history`;
    await expectStatus(401, `${history}?${range}`, 'GET', undefined, token);
    const historyPage = await expectStatus(200, `${history}?${range}&pageSize=2&sortBy=score&sortOrder=asc`, 'GET', undefined, admin);
    assert.equal(historyPage.total, 3); assert.equal(historyPage.items.length, 2);
    assert(historyPage.items[0].score <= historyPage.items[1].score);
    const secondPage = await expectStatus(200, `${history}?${range}&pageSize=2&page=2&sortBy=score&sortOrder=asc`, 'GET', undefined, admin);
    assert.equal(new Set([...historyPage.items, ...secondPage.items].map(row => row.id)).size, 3);
    assert.equal((await expectStatus(200, `${history}?${range}&name=Alice`, 'GET', undefined, admin)).total, 1);
    assert.equal((await expectStatus(200, `${history}?${range}&name=%25_`, 'GET', undefined, admin)).total, 0);
    for (const query of ['from=2026-02-30&to=2026-03-01', 'from=2026-10-19&to=2026-10-18', 'from=2020-01-01&to=2026-10-18', `${range}&sortBy=passwordHash`, `${range}&pageSize=101`, `${range}&extra=1`])
      await expectStatus(400, `${history}?${query}`, 'GET', undefined, admin);
    const bobDetail = await expectStatus(200, `${history}/${bob.id}`, 'GET', undefined, admin);
    assert.equal(bobDetail.answers.length, 6);
    assert.equal(bobDetail.answers[4].value, 1); assert.equal(bobDetail.answers[4].points, 4);
    assert.equal(bobDetail.answers.reduce((total, answer) => total + answer.points, 0), bobDetail.result.score);
    assert(!JSON.stringify(bobDetail).includes('email'));
    const originalDetail = await expectStatus(200, `${history}/${alice.id}`, 'GET', undefined, admin);
    assert.equal(originalDetail.versionId, id); assert.equal(originalDetail.result.score, 6);
    await expectStatus(404, `${history}/${alice.id}`, 'PUT', { answers: [] }, admin);
    await expectStatus(404, `${history}/${alice.id}`, 'DELETE', undefined, admin);
    assert.deepEqual(await expectStatus(200, `${history}/${alice.id}`, 'GET', undefined, admin), originalDetail);
    await expectStatus(400, `${history}/bad`, 'GET', undefined, admin);
    await repo.softDelete(bob.id);
    await expectStatus(404, `${history}/${bob.id}`, 'GET', undefined, admin);
    await repo.restore(bob.id);
    await repo.update(bob.id, {memberAuthEnabled: false});
    await expectStatus(404, `${history}/${bob.id}`, 'GET', undefined, admin);
    await repo.update(bob.id, {memberAuthEnabled: true});
    const entry = await db.getRepository(MemberAssessment).findOneBy({memberId: alice.id});
    await db.getRepository(MemberAssessment).save({...entry, memberId: account.backup_member_id});
    await expectStatus(404, `${history}/${account.backup_member_id}`, 'GET', undefined, admin);
    assert.equal((await expectStatus(200, `${history}?${range}`, 'GET', undefined, admin)).total, 3);
    await db.getRepository(MemberAssessment).delete({memberId: account.backup_member_id});
    await db.getRepository(MemberAssessment).update(alice.id, {completedAt: new Date('2026-10-18T00:00:00.000Z')});
    await db.getRepository(MemberAssessment).update(bob.id, {completedAt: new Date('2026-10-18T23:59:59.999Z')});
    await db.getRepository(MemberAssessment).update(carol.id, {completedAt: new Date('2026-10-19T00:00:00.000Z')});
    assert.equal((await expectStatus(200, `${history}?from=2026-10-18&to=2026-10-18`, 'GET', undefined, admin)).total, 2);
    await db.getRepository(MemberAssessment).update(alice.id, {completedAt: new Date(historical.completedAt)});
    await db.getRepository(MemberAssessment).update(bob.id, {completedAt: new Date()});
    await db.getRepository(MemberAssessment).update(carol.id, {completedAt: new Date()});
    if (process.env.ASSESSMENT_TEST_SERVE === '1') {
      console.log(`Synthetic assessment CMS fixture ready at ${base}`);
      await new Promise(resolve => { process.once('SIGTERM', resolve); process.once('SIGINT', resolve); });
    }
    const restored = await access(alice);
    assert.deepEqual(await expectStatus(200, me, 'GET', undefined, restored), historical);
    await db.getRepository(MemberSession).delete({ memberId: carol.id });
    await expectStatus(401, me, 'GET', undefined, third);
    await repo.update(alice.id, { is_suspended: true });
    await expectStatus(401, me);
    await repo.update(account.backup_member_id, { is_suspended: true });
    await expectStatus(401, cms, 'GET', undefined, admin);
    assert.equal(await db.query('SELECT COUNT(*) AS total FROM member_moods').then(r => Number(r[0].total)), 0);
    assert((await db.getRepository(AssessmentVersion).count()) >= 2);
    // Production wiring must exempt member routes from the legacy admin middleware and omit body logging.
    const appSource = readFileSync(resolve(__dirname, '../src/app.module.ts'), 'utf8');
    assert.equal((appSource.match(/path: 'me\/assessment'/g) || []).length, 2);
    for (const name of ['AssessmentController', 'CmsAssessmentController']) {
      assert(readFileSync(resolve(__dirname, '../src/common/interceptors/logging.interceptor.ts'), 'utf8').includes(`'${name}'`));
    }
    console.log('Assessment HTTP/MySQL integration passed: schema/repeat sync, guards, DTOs, publication, scoring, privacy, history and concurrency.');
  } finally {
    if (app) await app.close();
    await connection.query(`DROP DATABASE IF EXISTS \`${schema}\``);
    await connection.end();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
