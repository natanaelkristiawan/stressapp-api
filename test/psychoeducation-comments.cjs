require('reflect-metadata');
require('ts-node/register');
require('tsconfig-paths/register');
const assert = require('node:assert/strict');
const { plainToInstance } = require('class-transformer');
const { validate } = require('class-validator');
const { PsychoeducationCommentListDto, ModeratePsychoeducationCommentDto } = require('../src/admin-post/dtos/psychoeducation.dto');
const { AdminPostContentService } = require('../src/admin-post/admin-post-content.service');
const { PsychoeducationController } = require('../src/admin-post/psychoeducation.controller');
const { CmsMembersGuard } = require('../src/cms-members/cms-members.guard');

async function main() {
  const invalid = [{ page: 0 }, { pageSize: 101 }, { user: 'x'.repeat(101) }, { comment: 'x'.repeat(261) }, { article: 'x'.repeat(201) }, { startDate: '2026-02-30' }, { endDate: '2026-10-24T00:00:00Z' }];
  for (const input of invalid) {
    assert((await validate(plainToInstance(PsychoeducationCommentListDto, input))).length > 0);
  }
  assert.equal((await validate(plainToInstance(ModeratePsychoeducationCommentDto, { reason: 'admin_delete', version: 'a'.repeat(64) }))).length, 0);
  assert((await validate(plainToInstance(ModeratePsychoeducationCommentDto, { reason: 'approve', version: 'a'.repeat(64) }))).length > 0);
  assert(Reflect.getMetadata('__guards__', PsychoeducationController).includes(CmsMembersGuard));
  const calls = [];
  const query = {};
  for (const method of ['innerJoinAndSelect', 'leftJoinAndSelect', 'where', 'andWhere', 'orderBy', 'addOrderBy', 'skip', 'take']) {
    query[method] = (...args) => { calls.push([method, ...args]); return query; };
  }
  query.getManyAndCount = async () => [[{ id: 7, description: '<script>text</script>', member: { name: 'Member', email: 'member@example.test' }, post: { id: 9, title: 'Article', contentType: 'article' }, moderationStatus: 'rejected', created_at: new Date(), updated_at: new Date() }], 1];
  const service = new AdminPostContentService({ manager: { getRepository: () => ({ createQueryBuilder: () => query }) } });
  const result = await service.allComments({ page: 2, pageSize: 10, user: '%_', comment: 'text', article: 'Article', startDate: '2026-10-24', endDate: '2026-10-24' });
  assert.equal(result.items[0].postId, 9);
  assert.equal(result.items[0].moderationStatus, 'rejected');
  assert.equal(result.items[0].content, '<script>text</script>');
  assert(calls.some(([method, value]) => method === 'skip' && value === 10));
  assert(calls.some(([, sql, params]) => sql.includes?.('isPsychoeducation') && params.educational === true));
  assert(calls.some(([, sql, params]) => sql.includes?.('LOCATE(:user') && params.user === '%_'));
  assert(calls.some(([, sql, params]) => sql.includes?.('created_at <') && params.end.toISOString() === '2026-10-25T00:00:00.000Z'));
  await assert.rejects(service.allComments({ page: 1, pageSize: 20, startDate: '2026-10-25', endDate: '2026-10-24' }), /End date/);
  console.log('PASS: comment query boundaries, CMS guard, literal searches, UTC inclusive end, stable pagination, AI read-only action boundary and safe response mapping.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
