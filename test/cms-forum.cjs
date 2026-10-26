// Exercise actual forum services and DTOs with an isolated transactional repository double.
require('ts-node/register');
require('tsconfig-paths/register');
const assert = require('node:assert/strict');
const { plainToInstance } = require('class-transformer');
const { validate } = require('class-validator');
const { AdminSpaceService } = require('../src/admin-space/admin-space.service');
const { AdminPostService, forumPostVersion } = require('../src/admin-post/admin-post.service');
const { SpaceEntity } = require('../src/entity/space.entity');
const { PostEntity } = require('../src/entity/post.entity');
const { Activity } = require('../src/entity/activity.entity');
const { MemberSpaceEntity } = require('../src/entity/member-spaces.entity');
const { AdminSpaceCreateDto, AdminSpacePatchDto, AdminSpaceListDto, AdminSpaceIdDto, ForumVersionDto } = require('../src/admin-space/dtos/admin-space.dto');

async function main() {
  const spaces = new Map([[1, { id: 1, name: 'Internal root', backup_space_id: 0 }]]);
  const posts = new Map();
  let sequence = 1;
  let references = 0;
  let failAudit = false;
  let audits = [];
  let locks = 0;
  const manager = {
    async findOne(entity, options) {
      assert.equal(options.lock.mode, 'pessimistic_write');
      locks++;
      const row = (entity === SpaceEntity ? spaces : posts).get(options.where.id);
      if (!row || row.deleted_at || (entity === PostEntity && row.isPsychoeducation)) return null;
      return structuredClone(row);
    },
    async save(entity, row) {
      if (entity === Activity) {
        if (failAudit) throw new Error('audit failed');
        audits.push(structuredClone(row));
        return row;
      }
      const store = entity === SpaceEntity ? spaces : posts;
      if (entity === PostEntity) row.updated_at = new Date();
      store.set(row.id, structuredClone(row));
      return row;
    },
    async count(entity) { return entity === MemberSpaceEntity ? references : 0; },
    async update() {},
    async remove(_entity, row) { spaces.delete(row.id); },
    async softRemove(entity, row) { row.deleted_at = new Date(); await this.save(entity, row); },
    async transaction(work) {
      const beforeSpaces = structuredClone(spaces);
      const beforePosts = structuredClone(posts);
      const beforeAudits = structuredClone(audits);
      try { return await work(this); }
      catch (error) {
        spaces.clear(); beforeSpaces.forEach((value, key) => spaces.set(key, value));
        posts.clear(); beforePosts.forEach((value, key) => posts.set(key, value));
        audits = beforeAudits;
        throw error;
      }
    },
  };
  const spaceRepository = {
    manager,
    create: (row) => row,
    async findOne({ where }) {
      if ('id' in where) return spaces.get(where.id) ?? null;
      return [...spaces.values()].find((space) => space.backup_space_id === where.backup_space_id) ?? null;
    },
    async save(row) { row.id = ++sequence; spaces.set(row.id, structuredClone(row)); return row; },
  };
  const communities = new AdminSpaceService(spaceRepository, {});
  const created = await communities.createSpace({ name: 'Community', description: 'Description' });
  assert.equal(created.description, 'Description');
  assert.match(created.version, /^[a-f0-9]{64}$/);
  assert.equal(spaces.get(created.id).hidden, 0);
  assert.equal(spaces.get(created.id).inviteOnly, 0);
  assert.equal(spaces.get(created.id).backup_space_id, 1);
  const edited = await communities.updateSpace({ id: created.id, version: created.version, name: 'Edited' });
  assert.notEqual(edited.version, created.version);
  await assert.rejects(communities.updateSpace({ id: created.id, version: created.version, name: 'Stale' }), /changed/);
  assert.equal(spaces.get(created.id).name, 'Edited');
  await assert.rejects(communities.deleteSpace({ id: created.id, version: created.version }), /changed/);
  references = 1;
  await assert.rejects(communities.deleteSpace({ id: created.id, version: edited.version }), /cannot be deleted/);
  assert(spaces.has(created.id));
  references = 0;
  for (const operation of [() => communities.viewSpace(1), () => communities.updateSpace({ id: 1, version: edited.version }), () => communities.deleteSpace({ id: 1, version: edited.version })]) {
    await assert.rejects(operation(), /not found/);
  }
  await communities.deleteSpace({ id: created.id, version: edited.version });
  assert(!spaces.has(created.id));
  spaces.delete(1);
  await assert.rejects(communities.createSpace({ name: 'Orphan' }), /root is missing/);

  posts.set(9, { id: 9, title: 'Title', description: 'Preview', textContent: 'Full '.repeat(100), isHidden: false, isPsychoeducation: false, status: 'PUBLISHED', updated_at: new Date(0), backup_member_id: 2, backup_space_id: 3 });
  const postRepository = { manager, findOne: async ({ where }) => posts.get(where.id) ?? null };
  const moderation = new AdminPostService(postRepository, {}, {}, {}, {});
  const detail = await moderation.detail(9);
  assert.equal(detail.textContent, 'Full '.repeat(100));
  assert.equal(detail.version, forumPostVersion(posts.get(9)));
  await moderation.moderatePost(9, detail.version, 'hide', 2);
  assert.equal(posts.get(9).isHidden, true);
  assert.equal(audits[0].action, 'hide');
  await assert.rejects(moderation.moderatePost(9, detail.version, 'show', 2), /changed/);
  assert.equal(posts.get(9).isHidden, true);
  const hiddenVersion = forumPostVersion(posts.get(9));
  failAudit = true;
  await assert.rejects(moderation.moderatePost(9, hiddenVersion, 'show', 2), /audit failed/);
  assert.equal(posts.get(9).isHidden, true, 'audit failure must roll back visibility');
  assert.equal(audits.length, 1);
  failAudit = false;
  await moderation.moderatePost(9, hiddenVersion, 'delete', 2);
  assert(posts.get(9).deleted_at);
  assert.equal(audits[1].action, 'delete');
  await assert.rejects(moderation.moderatePost(9, hiddenVersion, 'show', 2), /not found/);
  posts.set(10, { id: 10, isPsychoeducation: true });
  await assert.rejects(moderation.moderatePost(10, detail.version, 'delete', 2), /not found/);
  assert(locks >= 10);

  for (const [Dto, input] of [
    [AdminSpaceCreateDto, { name: '  ' }],
    [AdminSpaceCreateDto, { name: 'Valid', image: 'javascript:alert(1)' }],
    [AdminSpaceCreateDto, { name: 'Valid', description: 'x'.repeat(501) }],
    [AdminSpacePatchDto, { name: null, version: 'a'.repeat(64) }],
    [AdminSpacePatchDto, { is_dealer: 'false', version: 'a'.repeat(64) }],
    [AdminSpacePatchDto, { name: 'Valid' }],
    [AdminSpaceListDto, { page: -1, limit: 999 }],
    [AdminSpaceIdDto, { id: 1.5 }],
    [ForumVersionDto, { version: 'bad' }],
  ]) assert((await validate(plainToInstance(Dto, input))).length > 0);
  assert.equal((await validate(plainToInstance(AdminSpacePatchDto, { name: 'Valid', version: 'a'.repeat(64) }))).length, 0);
  console.log('PASS: CMS forum creation/discovery flags, full content, root/dependency guards, locked stale writes, atomic audits, DTO validation.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
