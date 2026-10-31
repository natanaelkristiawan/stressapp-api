require('ts-node/register');
require('tsconfig-paths/register');
const assert = require('node:assert/strict');
const { readdirSync } = require('node:fs');
const { resolve } = require('node:path');
const { spawnSync } = require('node:child_process');
const { DataSource, FindOperator } = require('typeorm');
const { Test } = require('@nestjs/testing');
const { getDataSourceToken } = require('@nestjs/typeorm');
const { getQueueToken } = require('@nestjs/bullmq');
const {
  NotificationEventsModule,
} = require('../src/notification-events/notification-events.module');
const {
  PushNotificationsService,
} = require('../src/push-devices/push-notifications.service');
const { MemberAuthService } = require('../src/member-auth/member-auth.service');
const {
  MemberOtpEmailProcessor,
  OTP_EMAIL_QUEUE,
} = require('../src/member-auth/member-auth.email.processor');
const { AdminAuthService } = require('../src/admin-auth/admin-auth.service');
const { ServiceUnavailableException } = require('@nestjs/common');
const {
  NotificationEvent,
} = require('../src/entity/notification-event.entity');
const {
  MemberNotification,
  NotificationType,
} = require('../src/entity/member-notification.entity');
const { Member } = require('../src/entity/user-mimate.entity');
const { MoodEntryEntity } = require('../src/entity/mood-entry.entity');
const {
  moodReminderClock,
} = require('../src/notification-events/mood-reminder-clock');
const { Message } = require('../src/entity/message.entity');
const { PostEntity } = require('../src/entity/post.entity');
const { CommentEntity } = require('../src/entity/comment.entity');
const {
  NotificationEventsProcessor,
} = require('../src/notification-events/notification-events.processor');
const {
  notificationSource,
  notificationRecipients,
} = require('../src/notification-events/notification-source');
const {
  recordNotificationEvent,
} = require('../src/notification-events/record-notification-event');
const {
  renderTemplateText,
} = require('../src/notification-templates/notification-templates.render');
const { PostService } = require('../src/post/post.service');
const { CommentService } = require('../src/comment/comment.service');
const { DateHelper } = require('../src/common/helpers/date.helper');

// Execute actual generated audience SELECTs with the standard-library SQLite engine.
// MySQL metadata/query generation is real; MySQL synchronization/locking still needs Docker.
const sqlite = `
import json, sqlite3, sys
v=json.load(sys.stdin)
c=sqlite3.connect(':memory:')
c.executescript('CREATE TABLE members (id INTEGER PRIMARY KEY, memberAuthEnabled INTEGER, verifiedAt TEXT, is_suspended INTEGER, deleted_at TEXT, notificationTimeZone TEXT); CREATE TABLE user_follows (followerId INTEGER, followingId INTEGER, status TEXT); CREATE TABLE backup_member_space (backup_member_id INTEGER, backup_space_id INTEGER, follow INTEGER);')
c.executemany('INSERT INTO members VALUES (?,?,?,?,?,?)', [(m['id'],m['memberAuthEnabled'],m.get('verifiedAt'),m['is_suspended'],m.get('deleted_at'),m.get('notificationTimeZone')) for m in v['members']])
c.executemany('INSERT INTO user_follows VALUES (?,?,?)', [(r['followerId'],r['followingId'],r['status']) for r in v['friends']])
c.executemany('INSERT INTO backup_member_space VALUES (?,?,?)', [(r['backup_member_id'],r['backup_space_id'],r['follow']) for r in v['memberships']])
cur=c.execute(v['sql'],v['params'])
i=[col[0] for col in cur.description].index('member_id')
print(json.dumps([{'id': r[i]} for r in cur.fetchall()]))
`;

function member(id, patch = {}) {
  return {
    id,
    notificationTimeZone: null,
    name: `Member ${id}`,
    memberAuthEnabled: true,
    verifiedAt: new Date(0),
    is_suspended: false,
    deleted_at: null,
    ...patch,
  };
}
function matches(row, where) {
  return Object.entries(where).every(([key, value]) => {
    if (value instanceof FindOperator) {
      if (value.type === 'isNull') return row[key] === null;
      if (value.type === 'lessThanOrEqual') return row[key] <= value.value;
      throw new Error('Unexpected predicate');
    }
    return row[key] === value;
  });
}

function harness(metadata) {
  let state = {
    events: [],
    moods: [],
    notifications: [],
    members: [
      member(1),
      member(2),
      member(3),
      member(4),
      member(5),
      member(6),
      member(8, { is_suspended: true }),
      member(9, { deleted_at: new Date() }),
      member(10, { verifiedAt: null }),
      member(11, { memberAuthEnabled: false }),
    ],
    friends: [
      { followerId: 1, followingId: 2, status: 'accepted' },
      { followerId: 3, followingId: 1, status: 'accepted' },
      { followerId: 1, followingId: 6, status: 'pending' },
    ],
    memberships: [2, 4, 8, 9, 10, 11]
      .map((id) => ({ backup_member_id: id, backup_space_id: 9, follow: true }))
      .concat({ backup_member_id: 5, backup_space_id: 9, follow: false }),
    posts: [],
    comments: [],
    messages: [],
  };
  const actor = state.members[0];
  const post = {
    id: 100,
    member: state.members[1],
    moderation: { action: 'publish' },
    isPsychoeducation: false,
    status: 'PUBLISHED',
    isHidden: false,
    deleted_at: null,
    createdBy: null,
    space: { id: 9, backup_space_id: 1, hidden: 0, inviteOnly: 0 },
  };
  state.posts.push(
    structuredClone(post),
    structuredClone({ ...post, id: 101, member: actor }),
  );
  state.comments.push(
    structuredClone({
      id: 200,
      member: actor,
      post,
      parent: {
        id: 199,
        member: state.members[2],
        moderationStatus: 'approved',
      },
      moderationStatus: 'approved',
      moderation: { action: 'publish' },
    }),
  );
  state.messages.push({
    id: 300,
    sender: actor,
    conversation: { id: 50, participants: [actor, state.members[1]] },
    content: 'PRIVATE TEXT MUST NEVER BE QUEUED',
  });
  let tail = Promise.resolve();
  let failInsert = false;
  let templateMissing = false;
  let templateRevision = 1;
  let configured = false;
  let failPush = false;
  const sends = [];
  const queries = [];
  const table = (entity) => {
    if (entity === NotificationEvent) return state.events;
    if (entity === Member) return state.members;
    if (entity === MoodEntryEntity) return state.moods;
    if (entity === MemberNotification) return state.notifications;
    if (entity === PostEntity) return state.posts;
    if (entity === CommentEntity) return state.comments;
    if (entity === Message) return state.messages;
    throw new Error('Unexpected entity');
  };
  function audienceQuery() {
    const qb = metadata.getRepository(Member).createQueryBuilder('member');
    const getMany = async () => {
      const [sql, params] = qb.getQueryAndParameters();
      queries.push({ sql, params });
      const result = spawnSync('python3', ['-c', sqlite], {
        input: JSON.stringify({ ...state, sql, params }),
        encoding: 'utf8',
      });
      assert.equal(result.status, 0, result.stderr);
      return JSON.parse(result.stdout).map((row) =>
        structuredClone(state.members.find((member) => member.id === row.id)),
      );
    };
    qb.getMany = getMany;
    qb.getOne = async () => (await getMany())[0] ?? null;
    return qb;
  }
  function sourceQuery(entity) {
    let sourceId;
    const qb = {};
    for (const name of ['select', 'addSelect', 'leftJoin', 'leftJoinAndSelect'])
      qb[name] = () => qb;
    qb.where = (_sql, params) => {
      sourceId = params.id;
      return qb;
    };
    qb.getOne = async () =>
      structuredClone(table(entity).find((row) => row.id === sourceId) ?? null);
    return qb;
  }
  const manager = {
    getRepository(entity) {
      if (entity === Member) return { createQueryBuilder: audienceQuery };
      if ([PostEntity, CommentEntity].includes(entity))
        return { createQueryBuilder: () => sourceQuery(entity) };
      return {
        find: async ({ where, take } = {}) =>
          structuredClone(
            table(entity)
              .filter((row) => !where || matches(row, where))
              .slice(0, take ?? Infinity),
          ),
        update: async (where, patch) => manager.update(entity, where, patch),
        insert: async (value) => manager.insert(entity, value),
        existsBy: async (where) =>
          table(entity).some((row) => matches(row, where)),
        count: async ({ where }) =>
          table(entity).filter((row) => matches(row, where)).length,
      };
    },
    async findOne(entity, options) {
      if (entity === Message) assert.deepEqual(options.select, { id: true });
      else assert.equal(options.lock.mode, 'pessimistic_write');
      return structuredClone(
        table(entity).find((row) => matches(row, options.where)) ?? null,
      );
    },
    async count(entity, { where }) {
      return table(entity).filter((row) => matches(row, where)).length;
    },
    async findOneBy(entity, where) {
      return structuredClone(
        table(entity).find((row) => matches(row, where)) ?? null,
      );
    },
    async insert(entity, value) {
      if (failInsert) throw new Error('Synthetic insert failure');
      if (entity === NotificationEvent) {
        assert(Number.isSafeInteger(value.sourceId) && value.sourceId > 0);
        if (state.events.some((event) => event.key === value.key)) {
          throw Object.assign(new Error('Duplicate event'), {
            code: 'ER_DUP_ENTRY',
          });
        }
        state.events.push({
          attempts: 0,
          lastMemberId: 0,
          completedAt: null,
          snapshot: null,
          failureCode: null,
          createdAt: new Date(),
          ...structuredClone(value),
        });
      } else {
        assert.equal(entity, MemberNotification);
        assert(
          !state.notifications.some(
            (row) =>
              row.eventKey === value.eventKey &&
              row.memberId === value.memberId,
          ),
        );
        state.notifications.push({
          id: state.notifications.length + 1,
          pushAccepted: 0,
          pushFailed: 0,
          pushFailureCode: null,
          ...structuredClone(value),
        });
      }
    },
    async update(entity, where, patch) {
      let affected = 0;
      for (const row of table(entity).filter((row) => matches(row, where))) {
        for (const [key, value] of Object.entries(patch))
          row[key] =
            typeof value === 'function' ? row[key] + 1 : structuredClone(value);
        affected++;
      }
      return { affected };
    },
    async save(entity, value) {
      const rows = table(entity);
      const saved = { ...value, id: value.id ?? rows.length + 1000 };
      const index = rows.findIndex((row) => row.id === saved.id);
      if (index === -1) rows.push(structuredClone(saved));
      else rows[index] = structuredClone(saved);
      return saved;
    },
  };
  const db = {
    getRepository: manager.getRepository,
    transaction(callback) {
      const result = tail.then(async () => {
        const snapshot = structuredClone(state);
        try {
          return await callback(manager);
        } catch (error) {
          state = snapshot;
          throw error;
        }
      });
      tail = result.catch(() => undefined);
      return result;
    },
  };
  const templates = {
    render: async (type, values) => {
      if (templateMissing)
        throw new ServiceUnavailableException('not configured');
      return {
        ...renderTemplateText(
          type,
          `Template ${templateRevision}`,
          type === NotificationType.MoodReminder
            ? 'Catat mood hari ini.'
            : '{{actorName}} memiliki aktivitas baru.',
          values,
        ),
        templateRevision,
      };
    },
  };
  const push = {
    status: () => ({ configured }),
    sendNotification: async (...args) => {
      sends.push(args);
      if (failPush) throw new Error('SECRET raw provider text');
      return {
        attempted: 2,
        accepted: 1,
        failed: 1,
        failures: [
          { code: 'messaging/registration-token-not-registered', count: 1 },
        ],
      };
    },
  };
  const processor = new NotificationEventsProcessor(db, templates, push);
  processor.logger = { warn() {}, error() {} };
  return {
    db,
    manager,
    processor,
    sends,
    queries,
    state: () => state,
    failInsert: (value) => {
      failInsert = value;
    },
    templateMissing: (value) => {
      templateMissing = value;
    },
    templateRevision: (value) => {
      templateRevision = value;
    },
    configured: (value) => {
      configured = value;
    },
    failPush: (value) => {
      failPush = value;
    },
    add: (type, id) =>
      db.transaction((em) => recordNotificationEvent(em, type, id)),
  };
}

async function main() {
  const folder = resolve(__dirname, '../src/entity');
  const metadata = new DataSource({
    type: 'mysql',
    database: 'synthetic_metadata_only',
    entities: readdirSync(folder)
      .filter(
        (file) =>
          /\.entity\.ts$/.test(file) &&
          !/^(user|car|vehicle)\.entity\./.test(file),
      )
      .map((file) => resolve(folder, file)),
  });
  await metadata.buildMetadatas();
  const wiring = await Test.createTestingModule({
    imports: [NotificationEventsModule],
  })
    .overrideProvider(PushNotificationsService)
    .useValue({})
    .overrideProvider(MemberAuthService)
    .useValue({})
    .overrideProvider(AdminAuthService)
    .useValue({})
    .overrideProvider(MemberOtpEmailProcessor)
    .useValue({})
    .overrideProvider(getQueueToken(OTP_EMAIL_QUEUE))
    .useValue({})
    .useMocker((token) =>
      token === getDataSourceToken('mimate') ? metadata : {},
    )
    .compile();
  assert(
    wiring.get(NotificationEventsProcessor) instanceof
      NotificationEventsProcessor,
  );
  await wiring.close();
  assert(
    metadata
      .getMetadata(MemberNotification)
      .uniques.some(
        (index) =>
          index.columns.map((column) => column.propertyName).join(',') ===
          'eventKey,memberId',
      ) ||
      metadata
        .getMetadata(MemberNotification)
        .indices.some(
          (index) =>
            index.isUnique &&
            index.columns.map((column) => column.propertyName).join(',') ===
              'eventKey,memberId',
        ),
  );
  let h = harness(metadata);
  await h.add(NotificationType.Message, 300);
  assert(!JSON.stringify(h.state().events).includes('PRIVATE TEXT'));
  await h.processor.materialize('message:300');
  assert.deepEqual(
    h.state().notifications.map((row) => row.memberId),
    [2],
  );
  await h.processor.materialize('message:300');
  assert.equal(h.state().notifications.length, 1);
  h.configured(true);
  await Promise.all([h.processor.deliver(1), h.processor.deliver(1)]);
  assert.equal(h.sends.length, 1);
  assert.equal(h.state().notifications[0].pushStatus, 'accepted');
  assert.equal(h.state().notifications[0].pushFailed, 1);
  assert.equal(h.state().notifications[0].readAt, null);
  assert(!JSON.stringify(h.sends).includes('PRIVATE TEXT'));

  for (const flag of ['readAt', 'deletedAt']) {
    h = harness(metadata);
    await h.add(NotificationType.Message, 300);
    await h.processor.materialize('message:300');
    h.state().notifications[0][flag] = new Date();
    await h.processor.deliver(1);
    assert.equal(h.state().notifications[0].pushStatus, 'skipped');
    assert.equal(h.sends.length, 0);
  }
  h = harness(metadata);
  await h.add(NotificationType.Message, 300);
  await h.processor.materialize('message:300');
  h.state().friends = [];
  await h.processor.deliver(1);
  assert.equal(h.sends.length, 0);
  h = harness(metadata);
  await h.add(NotificationType.Message, 300);
  await h.processor.materialize('message:300');
  h.failPush(true);
  await h.processor.deliver(1);
  await h.processor.deliver(1);
  assert.equal(h.sends.length, 1);
  assert.equal(h.state().notifications[0].pushStatus, 'failed');
  assert.equal(
    h.state().notifications[0].pushFailureCode,
    'messaging/request-failed',
  );
  assert.equal(h.state().notifications.length, 1);

  h = harness(metadata);
  await h.add(NotificationType.Forum, 101);
  await h.processor.materialize('forum:101');
  assert.deepEqual(
    h.state().notifications.map((row) => row.memberId),
    [2, 3, 4],
  );
  assert(
    h.queries.some(
      ({ sql }) =>
        sql.includes('EXISTS') &&
        sql.includes('user_follows') &&
        sql.includes('backup_member_space'),
    ),
  );
  h.state().posts[1].createdBy = 'Anonim';
  await h.processor.deliver(1);
  assert.equal(h.sends.length, 0);
  assert.equal(h.state().notifications[0].pushStatus, 'skipped');
  h.state().posts[1].isHidden = true;
  await h.processor.deliver(2);
  assert.equal(h.sends.length, 0);
  h = harness(metadata);
  h.state().posts[1].createdBy = 'Anonim';
  await h.add(NotificationType.Forum, 101);
  await h.processor.materialize('forum:101');
  assert(
    h.state().notifications.every((row) => row.body.startsWith('Anonim ')),
  );
  h = harness(metadata);
  h.state().posts[1].space.backup_space_id = 0;
  await h.add(NotificationType.Forum, 101);
  await h.processor.materialize('forum:101');
  assert.deepEqual(
    h.state().notifications.map((row) => row.memberId),
    [2, 3],
  );

  for (const patch of [
    { isHidden: true },
    { deleted_at: new Date() },
    { status: 'DRAFT' },
    { isPsychoeducation: true },
    { moderation: { action: 'pending' } },
    { space: { id: 9, backup_space_id: 1, hidden: 1, inviteOnly: 0 } },
    { member: member(1, { is_suspended: true }) },
  ]) {
    h = harness(metadata);
    Object.assign(h.state().posts[1], patch);
    await h.add(NotificationType.Forum, 101);
    await h.processor.materialize('forum:101');
    assert.equal(h.state().notifications.length, 0);
    assert(h.state().events[0].completedAt);
  }
  h = harness(metadata);
  await h.add(NotificationType.CommentReply, 200);
  await h.processor.materialize('comment-reply:200');
  assert.deepEqual(
    h.state().notifications.map((row) => row.memberId),
    [2, 3],
  );
  assert.deepEqual(h.state().notifications[0].destination, {
    kind: 'comment',
    id: '200',
    postId: '100',
  });
  h = harness(metadata);
  h.state().comments[0].parent.member.id = 2;
  await h.add(NotificationType.CommentReply, 200);
  await h.processor.materialize('comment-reply:200');
  assert.deepEqual(
    h.state().notifications.map((row) => row.memberId),
    [2],
  );
  h = harness(metadata);
  h.state().posts[0].member.id = 1;
  await h.add(NotificationType.CommentReply, 200);
  await h.processor.materialize('comment-reply:200');
  assert.deepEqual(
    h.state().notifications.map((row) => row.memberId),
    [3],
  );
  h = harness(metadata);
  h.state().comments[0].moderationStatus = 'pending';
  assert.equal(
    await notificationSource(h.manager, {
      type: NotificationType.CommentReply,
      sourceId: 200,
    }),
    null,
  );

  h = harness(metadata);
  await h.add(NotificationType.Forum, 101);
  h.templateMissing(true);
  await h.processor.tick();
  assert.equal(h.state().notifications.length, 0);
  assert.equal(h.state().events[0].failureCode, 'template-unavailable');
  assert.equal(h.state().events[0].attempts, 1);
  assert.equal(h.state().events[0].completedAt, null);
  h.templateMissing(false);
  h.state().events[0].retryAt = new Date(0);
  await h.processor.tick();
  assert.equal(h.state().notifications.length, 3);
  assert(h.state().notifications.every((row) => row.pushStatus === 'pending'));
  h.configured(true);
  await h.processor.tick();
  assert.equal(h.sends.length, 3);

  h = harness(metadata);
  await h.add(NotificationType.Forum, 101);
  h.failInsert(true);
  await assert.rejects(
    h.processor.materialize('forum:101'),
    /Synthetic insert failure/,
  );
  assert.equal(h.state().notifications.length, 0);
  assert.equal(h.state().events[0].lastMemberId, 0);
  h.failInsert(false);
  for (let id = 20; id <= 220; id++) {
    h.state().members.push(member(id));
    h.state().memberships.push({
      backup_member_id: id,
      backup_space_id: 9,
      follow: true,
    });
  }
  await h.processor.materialize('forum:101');
  assert.equal(h.state().notifications.length, 200);
  assert.equal(h.state().events[0].completedAt, null);
  h.templateRevision(2);
  await h.processor.materialize('forum:101');
  assert.equal(h.state().notifications.length, 204);
  assert(h.state().events[0].completedAt);
  assert(h.state().notifications.every((row) => row.templateRevision === 1));
  h.state().notifications[0].deletedAt = new Date();
  await h.processor.materialize('forum:101');
  assert.equal(h.state().notifications.length, 204);
  assert(h.state().notifications[0].deletedAt);

  // 20:00 local scheduling, daily deduplication, DST and completed-day suppression.
  const reminderNow = new Date('2026-10-28T12:00:00Z');
  assert.deepEqual(moodReminderClock(reminderNow, 'Asia/Makassar'), {
    date: '2026-10-28',
    due: true,
  });
  assert.equal(
    moodReminderClock(new Date('2026-10-28T11:59:00Z'), 'Asia/Makassar').due,
    false,
  );
  assert.equal(
    moodReminderClock(new Date('2026-11-01T00:00:00Z'), 'America/New_York').due,
    true,
  );
  assert.equal(
    moodReminderClock(new Date('2026-11-02T01:00:00Z'), 'America/New_York').due,
    true,
  );
  assert.equal(
    moodReminderClock(new Date('2026-11-02T00:59:00Z'), 'America/New_York').due,
    false,
  );
  assert.equal(
    moodReminderClock(new Date('2026-10-28T16:00:00Z'), 'Asia/Makassar').due,
    false,
  );
  h = harness(metadata);
  h.state().members[0].notificationTimeZone = 'Asia/Makassar';
  h.state().members[1].notificationTimeZone = 'Asia/Makassar';
  h.state().moods.push({ memberId: 2, dateString: '2026-10-28' });
  await h.processor.enqueueMoodReminders(new Date('2026-10-28T11:59:00Z'));
  assert.equal(h.state().events.length, 0);
  await h.processor.enqueueMoodReminders(reminderNow);
  await h.processor.enqueueMoodReminders(reminderNow);
  assert.equal(h.state().events.length, 1);
  const reminderKey = 'mood-reminder:1:2026-10-28';
  assert.equal(h.state().events[0].key, reminderKey);
  await h.processor.materialize(reminderKey, reminderNow);
  assert.deepEqual(
    h.state().notifications.map((row) => row.memberId),
    [1],
  );
  h.state().moods.push({ memberId: 1, dateString: '2026-10-28' });
  await h.processor.deliver(1, reminderNow);
  assert.equal(h.sends.length, 0);
  assert.equal(h.state().notifications[0].pushStatus, 'skipped');
  assert.equal(
    await notificationSource(
      h.manager,
      h.state().events[0],
      new Date('2026-10-29T12:00:00Z'),
    ),
    null,
  );
  h.state().moods = [];
  h.state().members[0].notificationTimeZone = 'Asia/Jakarta';
  assert.equal(
    await notificationSource(h.manager, h.state().events[0], reminderNow),
    null,
  );
  h.state().members[0].notificationTimeZone = 'Asia/Makassar';
  await h.processor.enqueueMoodReminders(new Date('2026-10-29T12:00:00Z'));
  assert(
    h.state().events.some((row) => row.key === 'mood-reminder:1:2026-10-29'),
  );
  await h.processor.materialize(
    'mood-reminder:1:2026-10-29',
    new Date('2026-10-29T12:00:00Z'),
  );
  await h.processor.deliver(2, new Date('2026-10-29T12:00:00Z'));
  assert.equal(h.sends.length, 1);

  // Exercise real shared post/comment write paths through their source transaction.
  h = harness(metadata);
  const posts = Object.assign(Object.create(PostService.prototype), {
    moderation: { assertPublishable: async () => ({ action: 'publish' }) },
    postRepository: { manager: h.db },
    spaceRepository: { findOneBy: async () => h.state().posts[0].space },
    userMimateRepository: { findOneBy: async () => member(1) },
    updateTotalPost: async () => undefined,
    detailPost: async (id) => ({ id }),
  });
  const created = await posts.createPost(
    { title: 'New', content: 'Approved body', spaceId: 9 },
    1,
    1,
  );
  assert(h.state().events.some((row) => row.key === `forum:${created.id}`));
  h.failInsert(true);
  const before = h.state().posts.length;
  await assert.rejects(
    posts.createPost(
      { title: 'Failed', content: 'Approved', spaceId: 9 },
      1,
      1,
    ),
    /Synthetic insert failure/,
  );
  assert.equal(h.state().posts.length, before);
  h.failInsert(false);
  const comments = Object.assign(Object.create(CommentService.prototype), {
    moderation: { assertPublishable: async () => ({ action: 'publish' }) },
    postRepository: { findOne: async () => h.state().posts[0] },
    commentRepository: { manager: h.db },
    userMimateRepository: {
      findOne: async () => member(1),
      update: async () => undefined,
    },
    dateHelper: new DateHelper(),
    calculationTotalComment: async () => true,
  });
  const comment = await comments.createComment(
    { post_id: 100, content: 'Approved comment' },
    1,
  );
  assert(
    h.state().events.some((row) => row.key === `comment-reply:${comment.id}`),
  );
  const eventCount = h.state().events.length;
  await comments.createComment(
    { post_id: 100, content: 'Admin comment' },
    1,
    true,
  );
  assert.equal(h.state().events.length, eventCount);
  console.log(
    'PASS: generated recipient SQL (SQLite), source transactions, fanout pagination/retry/snapshot/deduplication, anonymity/visibility, reply owners, push claim-once/failure/read/clear handling and offline MySQL metadata. DB transactions/locks are doubles; no live Firebase or MySQL.',
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
