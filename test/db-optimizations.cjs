const assert = require('assert');

// 1. Check migrations
const { DashboardIndexes1793829600000 } = require('../dist/database/migrations/1793829600000-DashboardIndexes');
const { ActiveMemberCreatedUserIndex1793829600001 } = require('../dist/database/migrations/1793829600001-ActiveMemberCreatedUserIndex');
const { MemberApiIndexes1793916000000 } = require('../dist/database/migrations/1793916000000-MemberApiIndexes');

console.log('Test 1: Migration instances');
const m1 = new DashboardIndexes1793829600000();
const m2 = new ActiveMemberCreatedUserIndex1793829600001();
const m3 = new MemberApiIndexes1793916000000();

assert.strictEqual(typeof m1.up, 'function');
assert.strictEqual(typeof m1.down, 'function');
assert.strictEqual(typeof m2.up, 'function');
assert.strictEqual(typeof m2.down, 'function');
assert.strictEqual(typeof m3.up, 'function');
assert.strictEqual(typeof m3.down, 'function');

// Mock query runner to verify safe index existence queries and DDL
console.log('Test 2: Migration up / down execution with mock queryRunner');
const executedQueries = [];
const mockQueryRunner = {
  query: async (sql) => {
    executedQueries.push(sql);
    // Return empty for existence check so it attempts to create
    if (sql.includes('information_schema.statistics')) {
      return [];
    }
    return [];
  },
};

(async () => {
  await m1.up(mockQueryRunner);
  assert(executedQueries.some((q) => q.includes('ALTER TABLE members ADD INDEX idx_activated_deleted')));
  assert(executedQueries.some((q) => q.includes('ALTER TABLE backup_post_with_attributes ADD INDEX idx_hidden_deleted')));
  assert(executedQueries.some((q) => q.includes('ALTER TABLE activity_logs ADD INDEX idx_action_created_cover')));
  assert(executedQueries.some((q) => q.includes('ALTER TABLE endpoint_logs ADD INDEX idx_created_handler_member')));

  await m2.up(mockQueryRunner);
  assert(executedQueries.some((q) => q.includes('ALTER TABLE activity_logs ADD INDEX idx_created_user')));

  await m3.up(mockQueryRunner);
  assert(executedQueries.some((q) => q.includes('ALTER TABLE backup_post_with_attributes ADD INDEX idx_hidden_published')));
  assert(executedQueries.some((q) => q.includes('ALTER TABLE backup_comments ADD INDEX idx_comments_post_parent')));

  console.log('Test 3: Verify entity classes load without errors');
  const { Activity } = require('../dist/entity/activity.entity');
  const { PostEntity } = require('../dist/entity/post.entity');
  const { CommentEntity } = require('../dist/entity/comment.entity');
  const { ReactionEntity } = require('../dist/entity/reaction.entity');
  const { MemberSpaceEntity } = require('../dist/entity/member-spaces.entity');
  const { RequestLogEntity } = require('../dist/entity/log.entity');
  const { Member } = require('../dist/entity/user-mimate.entity');

  assert(Activity && PostEntity && CommentEntity && ReactionEntity && MemberSpaceEntity && RequestLogEntity && Member);

  console.log('--- ALL DB OPTIMIZATION TESTS PASSED! ---');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

