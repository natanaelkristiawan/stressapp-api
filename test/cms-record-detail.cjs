require('ts-node/register');
require('tsconfig-paths/register');
const assert = require('node:assert/strict');
const { Test } = require('@nestjs/testing');
const { ValidationPipe, UnauthorizedException } = require('@nestjs/common');
const { PsychologistsService } = require('../src/psychologists/psychologists.service');
const { PsychologistsImport } = require('../src/psychologists/psychologists.import');
const { CmsPsychologistsController } = require('../src/psychologists/psychologists.controller');
const { AdminPostContentService } = require('../src/admin-post/admin-post-content.service');
const { PsychoeducationController } = require('../src/admin-post/psychoeducation.controller');
const { CmsMembersGuard } = require('../src/cms-members/cms-members.guard');
const { AdminAuthService } = require('../src/admin-auth/admin-auth.service');
const { MemberAuthService } = require('../src/member-auth/member-auth.service');

/** Exercises actual controllers, live-admin guard, DTO pipe and service mappers with disposable in-memory repository doubles. */
async function main() {
  let branchReads = 0;
  let categoryReads = 0;
  const branch = { id: 4, name: 'Example clinic', branch: 'Main', city: 'Example city', address: 'Example address', phone: '08123456789', contactType: 'whatsapp', contactNotes: '', website: '', serviceMode: 'onsite', latitude: null, longitude: null, status: 'draft', revision: 3, createdAt: new Date(), updatedAt: new Date(), locationKey: 'internal-secret' };
  const directory = new PsychologistsService({ getRepository: () => ({ findOne: async ({ where }) => { branchReads++; return where.id === 4 ? branch : null; } }) });
  const content = new AdminPostContentService({ manager: { getRepository: () => ({ findOne: async ({ where }) => { categoryReads++; assert.equal(where.isContentCategory, true); return where.id === 4 ? { id: 4, title: 'Example category', categoryArchived: true, categoryRevision: 7, internalSecret: 'hidden' } : null; } }) } });
  const module = await Test.createTestingModule({
    controllers: [CmsPsychologistsController, PsychoeducationController],
    providers: [CmsMembersGuard,
      { provide: PsychologistsService, useValue: directory },
      { provide: AdminPostContentService, useValue: content },
      { provide: PsychologistsImport, useValue: {} },
      { provide: MemberAuthService, useValue: {} },
      { provide: AdminAuthService, useValue: { currentAdmin: async id => { if (id !== 1) { throw new UnauthorizedException(); } } } },
    ],
  }).compile();
  const app = module.createNestApplication({ logger: false });
  app.use((request, response, next) => { if (request.headers['x-test-admin']) { request.userData = { id: Number(request.headers['x-test-admin']) }; } next(); });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    for (const path of ['/cms-psychologists', '/admin-post/psychoeducation/categories']) {
      const before = branchReads + categoryReads;
      for (const headers of [{}, { 'x-test-admin': '2' }]) {
        assert.equal((await fetch(`${base}${path}/4`, { headers })).status, 401);
      }
      assert.equal(branchReads + categoryReads, before);
      const headers = { 'x-test-admin': '1' };
      for (const id of ['0', '-1', 'abc', '1.5', '2147483648']) {
        assert.equal((await fetch(`${base}${path}/${id}`, { headers })).status, 400, `${path}/${id}`);
      }
      assert.equal((await fetch(`${base}${path}/88`, { headers })).status, 404);
      const response = await fetch(`${base}${path}/4`, { headers });
      assert.equal(response.status, 200);
      assert.match(response.headers.get('cache-control'), /no-store/);
      const { data } = await response.json();
      assert.equal(data.id, 4);
      if (path === '/cms-psychologists') {
        assert.equal(data.revision, 3);
        assert.equal(data.distanceKm, null);
        assert.equal(data.status, 'draft');
        assert.equal(data.locationKey, undefined);
      } else {
        assert.deepEqual(data, { id: 4, name: 'Example category', active: false, revision: 7 });
      }
    }
    console.log('PASS: real HTTP record detail routes, active-admin guard, bounded IDs, missing records, draft/archived reads, revision/safe response mapping and no-store headers (repository doubles).');
  } finally {
    await app.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
