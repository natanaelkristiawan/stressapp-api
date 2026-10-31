// Requires the disposable MySQL container described in docs/MEMBER_NOTIFICATIONS.md.
// Never reads .env or connects to a deployed database. Firebase is always a double.
require('ts-node/register');
require('tsconfig-paths/register');
const assert = require('node:assert/strict');
const { readdirSync } = require('node:fs');
const { resolve } = require('node:path');
const mysql = require('mysql2/promise');
const { DataSource } = require('typeorm');
const { Member } = require('../src/entity/user-mimate.entity');
const {
  MemberNotification,
  NotificationType,
} = require('../src/entity/member-notification.entity');
const {
  NotificationEvent,
} = require('../src/entity/notification-event.entity');
const {
  NotificationTemplate,
} = require('../src/entity/notification-template.entity');
const { MemberSpaceEntity } = require('../src/entity/member-spaces.entity');
const { UserFollowEntity } = require('../src/entity/user-follow.entity');
const { SpaceEntity } = require('../src/entity/space.entity');
const { PostEntity } = require('../src/entity/post.entity');
const { CommentEntity } = require('../src/entity/comment.entity');
const { Conversation } = require('../src/entity/convertation.entity');
const { Message } = require('../src/entity/message.entity');
const { MoodEntryEntity } = require('../src/entity/mood-entry.entity');
const { Activity } = require('../src/entity/activity.entity');
const {
  NotificationTemplatesService,
} = require('../src/notification-templates/notification-templates.service');
const {
  NotificationEventsProcessor,
} = require('../src/notification-events/notification-events.processor');
const {
  MemberNotificationsService,
} = require('../src/member-notifications/member-notifications.service');
const {
  recordNotificationEvent,
} = require('../src/notification-events/record-notification-event');
const { PostService } = require('../src/post/post.service');
const { CommentService } = require('../src/comment/comment.service');
const { DateHelper } = require('../src/common/helpers/date.helper');

async function main() {
  const port = Number(process.env.NOTIFICATION_TEST_PORT);
  assert.equal(
    process.env.NOTIFICATION_TEST_DISPOSABLE,
    '1',
    'Disposable-only opt-in required',
  );
  assert(
    Number.isInteger(port) && port > 1024 && port <= 65535 && port !== 3306,
    'Use the ephemeral localhost container port',
  );
  const connectionOptions = {
    host: '127.0.0.1',
    port,
    user: 'root',
    password: 'synthetic-notification-root',
  };
  const connection = await mysql.createConnection(connectionOptions);
  const schema = `notification_test_${process.pid}_${Date.now()}`;
  const folder = resolve(__dirname, '../src/entity');
  let db;
  try {
    await connection.query(
      `CREATE DATABASE \`${schema}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`,
    );
    db = await new DataSource({
      type: 'mysql',
      host: '127.0.0.1',
      port,
      username: 'root',
      password: connectionOptions.password,
      database: schema,
      timezone: 'Z',
      synchronize: true,
      entities: readdirSync(folder)
        .filter(
          (file) =>
            /\.entity\.ts$/.test(file) &&
            !/^(user|car|vehicle)\.entity\./.test(file),
        )
        .map((file) => resolve(folder, file)),
    }).initialize();
    await db.synchronize();
    const members = [];
    for (const name of [
      'Actor',
      'Friend',
      'Reverse friend',
      'Community only',
      'Pending',
      'Suspended',
    ]) {
      members.push(
        await db.getRepository(Member).save({
          name,
          email: `${members.length}@notification.example.test`,
          memberAuthEnabled: true,
          verifiedAt: new Date(),
          is_suspended: name === 'Suspended',
        }),
      );
    }
    const [actor, friend, reverse, communityOnly, pending, suspended] = members;
    const templates = new NotificationTemplatesService(db);
    const sends = [];
    const push = {
      status: () => ({ configured: true }),
      sendNotification: async (...args) => {
        sends.push(args);
        return { attempted: 2, accepted: 2, failed: 0, failures: [] };
      },
    };
    const worker = new NotificationEventsProcessor(db, templates, push);
    const worker2 = new NotificationEventsProcessor(db, templates, push);
    const inbox = new MemberNotificationsService(db);
    const initial = {
      title: 'Aktivitas baru',
      body: '{{actorName}} memiliki aktivitas baru.',
      revision: 0,
    };
    const firstSaves = await Promise.allSettled([
      templates.save(NotificationType.Message, initial, actor.id),
      templates.save(NotificationType.Message, initial, actor.id),
    ]);
    assert.equal(
      firstSaves.filter((row) => row.status === 'fulfilled').length,
      1,
    );
    assert.equal(
      firstSaves.find((row) => row.status === 'rejected').reason.getStatus(),
      409,
    );
    for (const type of [NotificationType.Forum, NotificationType.CommentReply])
      await templates.save(type, initial, actor.id);
    await templates.save(
      NotificationType.MoodReminder,
      { title: 'Mood Tracker', body: 'Yuk, catat mood hari ini.', revision: 0 },
      actor.id,
    );
    assert.equal(await db.getRepository(NotificationTemplate).count(), 4);
    assert.equal(await db.getRepository(Activity).count(), 4);
    await db.getRepository(UserFollowEntity).save([
      { followerId: actor.id, followingId: friend.id, status: 'accepted' },
      { followerId: reverse.id, followingId: actor.id, status: 'accepted' },
      { followerId: actor.id, followingId: pending.id, status: 'pending' },
    ]);
    const space = await db.getRepository(SpaceEntity).save({
      name: 'Synthetic community',
      backup_space_id: 1,
      hidden: 0,
      inviteOnly: 0,
    });
    await db.getRepository(MemberSpaceEntity).save(
      [friend, communityOnly, suspended].map((member) => ({
        backup_member_id: member.id,
        backup_space_id: space.id,
        follow: true,
      })),
    );
    const post = await db.getRepository(PostEntity).save({
      member: actor,
      space,
      status: 'PUBLISHED',
      isHidden: false,
      moderation: { action: 'publish' },
      title: 'Synthetic',
      description: 'Synthetic',
      textContent: 'Not included in notification payloads',
    });
    await db.transaction((manager) =>
      recordNotificationEvent(manager, NotificationType.Forum, post.id),
    );
    const postKey = `forum:${post.id}`;
    await Promise.all([
      worker.materialize(postKey),
      worker2.materialize(postKey),
      worker.materialize(postKey),
    ]);
    const postNotifications = await db
      .getRepository(MemberNotification)
      .findBy({ eventKey: postKey });
    assert.deepEqual(
      postNotifications.map((row) => row.memberId).sort((a, b) => a - b),
      [friend.id, reverse.id, communityOnly.id].sort((a, b) => a - b),
    );
    assert.equal(await inbox.unreadCount(friend.id), 1);
    await Promise.all([
      worker.deliver(postNotifications[0].id),
      worker2.deliver(postNotifications[0].id),
    ]);
    assert.equal(sends.length, 1);
    assert.equal(
      (
        await db
          .getRepository(MemberNotification)
          .findOneByOrFail({ id: postNotifications[0].id })
      ).pushStatus,
      'accepted',
    );
    await inbox.clear(
      friend.id,
      postNotifications.find((row) => row.memberId === friend.id).id,
    );
    assert.equal(await inbox.unreadCount(friend.id), 0);
    await worker.materialize(postKey);
    assert.equal(
      await db.getRepository(MemberNotification).countBy({ eventKey: postKey }),
      3,
    );
    const oldBody = postNotifications[0].body;
    await templates.save(
      NotificationType.Forum,
      { ...initial, body: 'Teks baru.', revision: 1 },
      actor.id,
    );
    assert.equal(
      (
        await db
          .getRepository(MemberNotification)
          .findOneByOrFail({ id: postNotifications[0].id })
      ).body,
      oldBody,
    );
    const beforeRevision = (await templates.detail(NotificationType.Forum))
      .revision;
    const failingTemplates = new NotificationTemplatesService({
      transaction: (callback) =>
        db.transaction(async (manager) => {
          const save = manager.save.bind(manager);
          manager.save = async (entity, ...args) => {
            if (entity === Activity) throw new Error('Synthetic audit failure');
            return save(entity, ...args);
          };
          return callback(manager);
        }),
    });
    await assert.rejects(
      failingTemplates.save(
        NotificationType.Forum,
        { ...initial, revision: beforeRevision },
        actor.id,
      ),
      /Synthetic audit failure/,
    );
    assert.equal(
      (await templates.detail(NotificationType.Forum)).revision,
      beforeRevision,
    );

    const conversation = await db
      .getRepository(Conversation)
      .save({ participants: [actor, friend] });
    let message;
    await db.transaction(async (manager) => {
      message = await manager.save(Message, {
        sender: actor,
        conversation,
        content: 'PRIVATE synthetic text',
        requestKey: null,
      });
      await recordNotificationEvent(
        manager,
        NotificationType.Message,
        message.id,
      );
    });
    await worker.materialize(`message:${message.id}`);
    const messageNotification = await db
      .getRepository(MemberNotification)
      .findOneByOrFail({ eventKey: `message:${message.id}` });
    assert.equal(messageNotification.memberId, friend.id);
    assert(!JSON.stringify(messageNotification).includes('PRIVATE'));
    await db
      .getRepository(UserFollowEntity)
      .update(
        { followerId: actor.id, followingId: friend.id },
        { status: 'pending' },
      );
    await worker.deliver(messageNotification.id);
    assert.equal(
      (
        await db
          .getRepository(MemberNotification)
          .findOneByOrFail({ id: messageNotification.id })
      ).pushStatus,
      'skipped',
    );

    const parent = await db.getRepository(CommentEntity).save({
      member: reverse,
      post,
      title: 'Parent',
      description: 'Parent',
      moderation: { action: 'publish' },
    });
    const reply = await db.getRepository(CommentEntity).save({
      member: communityOnly,
      post,
      parent,
      title: 'Reply',
      description: 'Reply',
      moderation: { action: 'publish' },
    });
    await db.transaction((manager) =>
      recordNotificationEvent(manager, NotificationType.CommentReply, reply.id),
    );
    await worker.materialize(`comment-reply:${reply.id}`);
    const replyNotifications = await db
      .getRepository(MemberNotification)
      .findBy({ eventKey: `comment-reply:${reply.id}` });
    assert.deepEqual(
      replyNotifications.map((row) => row.memberId).sort((a, b) => a - b),
      [actor.id, reverse.id].sort((a, b) => a - b),
    );
    assert.equal(replyNotifications[0].destination.postId, String(post.id));
    await db
      .getRepository(PostEntity)
      .update({ id: post.id }, { isHidden: true });
    const beforeSends = sends.length;
    await worker.deliver(replyNotifications[0].id);
    assert.equal(sends.length, beforeSends);

    await inbox.saveSettings(actor.id, 'Asia/Makassar');
    await inbox.saveSettings(friend.id, 'Asia/Makassar');
    const now = new Date('2026-10-28T12:00:00Z');
    await db.getRepository(MoodEntryEntity).save({
      memberId: friend.id,
      dateString: '2026-10-28',
      timeZone: 'Asia/Makassar',
      score: 3,
      note: 'PRIVATE mood',
      attachmentIds: [],
      createdAt: now,
      updatedAt: now,
    });
    await Promise.all([
      worker.enqueueMoodReminders(now),
      worker2.enqueueMoodReminders(now),
    ]);
    assert.equal(
      await db
        .getRepository(NotificationEvent)
        .countBy({ type: NotificationType.MoodReminder }),
      1,
    );
    const moodKey = `mood-reminder:${actor.id}:2026-10-28`;
    await worker.materialize(moodKey, now);
    const moodNotification = await db
      .getRepository(MemberNotification)
      .findOneByOrFail({ eventKey: moodKey });
    assert.equal(moodNotification.memberId, actor.id);
    await db.getRepository(MoodEntryEntity).save({
      memberId: actor.id,
      dateString: '2026-10-28',
      timeZone: 'Asia/Makassar',
      score: 3,
      note: 'PRIVATE mood',
      attachmentIds: [],
      createdAt: now,
      updatedAt: now,
    });
    await worker.deliver(moodNotification.id, now);
    assert.equal(
      (
        await db
          .getRepository(MemberNotification)
          .findOneByOrFail({ id: moodNotification.id })
      ).pushStatus,
      'skipped',
    );
    await inbox.clear(actor.id, moodNotification.id);
    await worker.enqueueMoodReminders(now);
    assert.equal(
      await db
        .getRepository(NotificationEvent)
        .countBy({ type: NotificationType.MoodReminder }),
      1,
    );

    const posts = Object.assign(Object.create(PostService.prototype), {
      moderation: { assertPublishable: async () => ({ action: 'publish' }) },
      postRepository: db.getRepository(PostEntity),
      spaceRepository: db.getRepository(SpaceEntity),
      userMimateRepository: db.getRepository(Member),
      updateTotalPost: async () => undefined,
      detailPost: async (id) => ({ id }),
    });
    const written = await posts.createPost(
      { title: 'Hook', content: 'Approved', spaceId: space.id },
      actor.id,
      actor.id,
    );
    assert(
      await db
        .getRepository(NotificationEvent)
        .existsBy({ key: `forum:${written.id}` }),
    );
    await db
      .getRepository(PostEntity)
      .update({ id: post.id }, { isHidden: false });
    const comments = Object.assign(Object.create(CommentService.prototype), {
      moderation: { assertPublishable: async () => ({ action: 'publish' }) },
      postRepository: db.getRepository(PostEntity),
      commentRepository: db.getRepository(CommentEntity),
      userMimateRepository: db.getRepository(Member),
      dateHelper: new DateHelper(),
      calculationTotalComment: async () => true,
    });
    const writtenComment = await comments.createComment(
      {
        post_id: post.id,
        comment_id: parent.id,
        content: 'Approved comment hook',
      },
      communityOnly.id,
    );
    assert(
      await db
        .getRepository(NotificationEvent)
        .existsBy({ key: `comment-reply:${writtenComment.id}` }),
    );
    const countBeforeConcurrentReplies = (
      await db.getRepository(CommentEntity).findOneByOrFail({ id: parent.id })
    ).repliesCount;
    await Promise.all([
      comments.createComment(
        {
          post_id: post.id,
          comment_id: parent.id,
          content: 'Concurrent reply A',
        },
        communityOnly.id,
      ),
      comments.createComment(
        {
          post_id: post.id,
          comment_id: parent.id,
          content: 'Concurrent reply B',
        },
        friend.id,
      ),
    ]);
    assert.equal(
      (await db.getRepository(CommentEntity).findOneByOrFail({ id: parent.id }))
        .repliesCount,
      countBeforeConcurrentReplies + 2,
    );
    const beforeComments = await db.getRepository(CommentEntity).count();
    const beforeParent = (
      await db.getRepository(CommentEntity).findOneByOrFail({ id: parent.id })
    ).repliesCount;
    const beforePosts = await db.getRepository(PostEntity).count();
    const originalTransaction = db.manager.transaction.bind(db.manager);
    db.manager.transaction = (callback) =>
      originalTransaction(async (manager) => {
        const insert = manager.insert.bind(manager);
        manager.insert = async (entity, ...args) => {
          if (entity === NotificationEvent)
            throw new Error('Synthetic event recording failure');
          return insert(entity, ...args);
        };
        return callback(manager);
      });
    try {
      await assert.rejects(
        posts.createPost(
          { title: 'Rollback', content: 'Approved', spaceId: space.id },
          actor.id,
          actor.id,
        ),
        /Synthetic event recording failure/,
      );
      await assert.rejects(
        comments.createComment(
          {
            post_id: post.id,
            comment_id: parent.id,
            content: 'Rollback reply',
          },
          communityOnly.id,
        ),
        /Synthetic event recording failure/,
      );
    } finally {
      db.manager.transaction = originalTransaction;
    }
    assert.equal(await db.getRepository(PostEntity).count(), beforePosts);
    assert.equal(await db.getRepository(CommentEntity).count(), beforeComments);
    assert.equal(
      (await db.getRepository(CommentEntity).findOneByOrFail({ id: parent.id }))
        .repliesCount,
      beforeParent,
    );
    await db.synchronize();
    assert.equal(await db.getRepository(NotificationTemplate).count(), 4);
    console.log(
      'PASS: real disposable MySQL schema/repeat sync, first-template edit race, atomic audit rollback, source/outbox rollback, concurrent fanout/push claims, actual friend/community/reply queries, privacy suppression, history snapshots/soft clear and daily timezone/mood idempotency. Firebase mocked.',
    );
  } finally {
    if (db?.isInitialized) await db.destroy();
    await connection.query(`DROP DATABASE IF EXISTS \`${schema}\``);
    await connection.end();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
