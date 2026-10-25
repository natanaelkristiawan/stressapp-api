// Isolated localhost MySQL only; no production configuration or records.
require('ts-node/register');
require('tsconfig-paths/register');
const assert = require('node:assert/strict');
const { readdirSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { createConnection } = require('mysql2/promise');
const { Test } = require('@nestjs/testing');
const { TypeOrmModule, getDataSourceToken } = require('@nestjs/typeorm');
const { ValidationPipe, UnauthorizedException } = require('@nestjs/common');
const { AdminDashboardModule } = require('../src/admin-dashboard/admin-dashboard.module');
const { AdminDashboardService } = require('../src/admin-dashboard/admin-dashboard.service');
const { ExportPostService } = require('../src/admin-dashboard/export-post.service');
const { ExportRevisionService } = require('../src/admin-dashboard/export-revision.service');
const { CardRevisionService } = require('../src/admin-dashboard/card-revision.service');
const { AdminAuthService } = require('../src/admin-auth/admin-auth.service');
const { Member } = require('../src/entity/user-mimate.entity');
const { UserAdmin } = require('../src/entity/user-admin.entity');
const { PostEntity } = require('../src/entity/post.entity');
const { CommentEntity } = require('../src/entity/comment.entity');
const { ReactionEntity } = require('../src/entity/reaction.entity');
const { Activity } = require('../src/entity/activity.entity');
const { SuccessInterceptor } = require('../src/common/interceptors/success.interceptor');
const ExcelJS = require('exceljs');

/** Reconciles actual queries, module wiring, HTTP guards and current identity exports. */
async function main() {
  const port = Number(process.env.ADMIN_DASHBOARD_TEST_PORT);
  assert(Number.isInteger(port) && port > 0, 'Set ADMIN_DASHBOARD_TEST_PORT to disposable localhost MySQL');
  const schema = `dashboard_test_${process.pid}_${Date.now()}`;
  const connection = await createConnection({ host: '127.0.0.1', port, user: 'root', password: '' });
  let app;
  try {
    await connection.query(`CREATE DATABASE \`${schema}\``);
    const folder = resolve(__dirname, '../src/entity');
    let adminActive = true;
    const module = await Test.createTestingModule({ imports: [
      TypeOrmModule.forRoot({ name: 'mimate', type: 'mysql', host: '127.0.0.1', port, username: 'root', password: '', database: schema, timezone: 'Z', synchronize: true, entities: readdirSync(folder).filter(file => /\.entity\.ts$/.test(file) && !/^(user|car|vehicle)\.entity\./.test(file)).map(file => resolve(folder, file)) }),
      AdminDashboardModule,
    ] }).overrideProvider(AdminAuthService).useValue({ currentAdmin: async id => { if (id !== 1 || !adminActive) { throw new UnauthorizedException(); } } }).compile();
    const db = module.get(getDataSourceToken('mimate'));
    app = module.createNestApplication();
    app.use((req, _res, next) => { if (req.headers.authorization === 'Bearer cms') { req.userData = { id: 1 }; } next(); });
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    app.useGlobalInterceptors(new SuccessInterceptor());
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    async function request(query, token = 'cms') {
      const response = await fetch(`${base}/admin/dashboard/forum?${query}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      return { status: response.status, data: (await response.json()).data, cache: response.headers.get('cache-control') };
    }
    const member = await db.getRepository(Member).save({ name: 'Current Name', username: 'current_member', mmid_fullname: 'RETIRED NAME', userId: 99999, email: 'current@example.test', memberAuthEnabled: true });
    const legacy = await db.getRepository(Member).save({ name: 'Legacy', username: 'legacy_member', email: 'legacy@example.test', memberAuthEnabled: false });
    const staff = await db.getRepository(Member).save({ name: 'Staff', username: 'staff_member', email: 'staff@example.test', memberAuthEnabled: true });
    await db.getRepository(UserAdmin).save({ name: 'Staff', email: staff.email, password: 'synthetic', backup_member_id: staff.id });
    const start = '2026-10-01T00:00:00Z';
    async function post(patch = {}) { return db.getRepository(PostEntity).save({ title: 'Synthetic forum post', member, isPsychoeducation: false, isHidden: false, published_at: new Date(start), ...patch }); }
    const forum = await post();
    const educational = await post({ isPsychoeducation: true });
    const hidden = await post({ isHidden: true });
    await post({ member: legacy }); await post({ member: staff });
    const deleted = await post(); await db.getRepository(PostEntity).softDelete(deleted.id);
    await post({ published_at: new Date('2026-10-02T00:00:00Z') });
    await post({ published_at: new Date('2026-10-01T23:59:59.000Z') });
    for (const target of [forum, educational, hidden, deleted]) {
      await db.getRepository(CommentEntity).save({ post: target, member, title: 'Synthetic reply', moderationStatus: 'approved', created_at: new Date(start) });
      await db.getRepository(ReactionEntity).save({ post: target, member, reaction: 'like', created_at: new Date(start) });
    }
    await db.getRepository(CommentEntity).save({ post: forum, member, title: 'Pending', moderationStatus: 'pending', created_at: new Date(start) });
    await db.getRepository(CommentEntity).save({ post: forum, member: legacy, moderationStatus: 'approved', created_at: new Date(start) });
    const range = 'from=2026-10-01&to=2026-10-01';
    const report = await request(range);
    assert.equal(report.status, 200); assert.equal(report.cache, 'private, no-store');
    assert.deepEqual([report.data.posts, report.data.replies, report.data.reactions], [2, 1, 1]);
    assert.deepEqual(report.data.daily, [{ date: '2026-10-01', posts: 2, replies: 1, reactions: 1 }]);
    const parallel = await Promise.all([request(range), request('from=2026-10-02&to=2026-10-03')]);
    assert.equal(parallel[0].data.posts, 2); assert.equal(parallel[1].data.posts, 1);
    assert.deepEqual(parallel[1].data.daily[1], { date: '2026-10-03', posts: 0, replies: 0, reactions: 0 });
    for (const bad of ['from=2026-02-30&to=2026-03-01', 'from=2026-10-02&to=2026-10-01', 'from=2020-01-01&to=2026-10-01', `${range}&score=1`, 'from=2026-10-01']) {
      assert.equal((await request(bad)).status, 400);
    }
    for (const token of [null, 'member', 'invalid']) { assert.equal((await request(range, token)).status, 401); }
    adminActive = false; assert.equal((await request(range)).status, 401); adminActive = true;
    assert.equal((await fetch(base + '/admin/dashboard/clear-member', { headers: { Authorization: 'Bearer cms' } })).status, 404);
    const service = module.get(AdminDashboardService);
    const memberExport = await module.get(ExportRevisionService).exportDataToExcelNewMember(new Date('2000-01-01'), new Date('2100-01-01'));
    const memberBook = new ExcelJS.Workbook(); await memberBook.xlsx.load(memberExport.buffer);
    assert.equal(memberBook.worksheets[0].rowCount, 2);
    assert(memberBook.worksheets[0].getRow(2).values.includes('current_member'));

    const exported = await service.writeToExcel([{ name: member.name, username: member.username, email: member.email }], 'Members', 'members');
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(exported.buffer);
    const sheet = workbook.worksheets[0];
    assert.deepEqual(sheet.getRow(1).values.slice(1, 4), ['Name', 'Username', 'Email']);
    assert.deepEqual(sheet.getRow(2).values.slice(1, 4), [member.name, member.username, member.email]);
    const revisionExport = await module.get(ExportRevisionService).writeToExcel([{ id: member.id, name: member.name, username: member.username, email: member.email }], 'Members', 'members');
    const revisionBook = new ExcelJS.Workbook(); await revisionBook.xlsx.load(revisionExport.buffer);
    assert.deepEqual(revisionBook.worksheets[0].getRow(2).values.slice(1, 5), [member.id, member.name, member.username, member.email]);
    const postExport = await module.get(ExportPostService).exportNewPosts(new Date(start), new Date(start));
    const postBook = new ExcelJS.Workbook(); await postBook.xlsx.load(postExport.buffer);
    const postSheet = postBook.worksheets[0];
    assert(postSheet.getRow(1).values.includes('Username'));
    assert.equal(postSheet.rowCount, 3);
    assert(!JSON.stringify(postSheet.getRows(1, postSheet.rowCount).map(row => row.values)).includes('RETIRED NAME'));
    for (const file of readdirSync(resolve(__dirname, '../src/admin-dashboard')).filter(file => file.endsWith('.ts'))) {
      const source = readFileSync(resolve(__dirname, '../src/admin-dashboard', file), 'utf8');
      assert(!/mmid|vehicleList|mimatePoint|quizWinner/i.test(source), file);
    }
    await db.getRepository(Activity).save({ userId: member.id, action: 'login', createdAt: new Date('2025-08-11T12:00:00Z') });
    await db.getRepository(Activity).save({ userId: member.id, action: 'login', createdAt: new Date('2025-08-12T12:00:00Z') });
    const history = await module.get(CardRevisionService).historyByDays(new Date('2025-08-11'), new Date('2025-08-12'));
    assert.equal(history.totalActivity, 1);
    assert.equal(history.data.length, 2);
    assert(history.data.every(row => row.activity === 1));
    const emptyHistory = await module.get(CardRevisionService).historyByDays(new Date('2001-01-01'), new Date('2001-01-02'));
    assert.equal(emptyHistory.totalActivity, 0); assert.deepEqual(emptyHistory.data, []);
    assert(module.get(CardRevisionService));
    await db.synchronize();
    console.log('PASS: actual module/HTTP/MySQL forum counts, UTC boundaries, concurrent ranges, isolation, guards, input validation, current member exports and retired maintenance route.');
  } finally {
    if (app) { await app.close(); }
    await connection.query(`DROP DATABASE IF EXISTS \`${schema}\``);
    await connection.end();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
