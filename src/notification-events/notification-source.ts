import { MoodEntryEntity } from '../entity/mood-entry.entity';
import { moodReminderClock } from './mood-reminder-clock';
import { EntityManager, SelectQueryBuilder } from 'typeorm';
import { CommentEntity } from '../entity/comment.entity';
import { Message } from '../entity/message.entity';
import { Conversation } from '../entity/convertation.entity';
import { PostEntity } from '../entity/post.entity';
import { Member } from '../entity/user-mimate.entity';
import {
  MemberNotification,
  NotificationType,
} from '../entity/member-notification.entity';
import { NotificationEvent } from '../entity/notification-event.entity';

export interface NotificationSource {
  actor: Member;
  destination: MemberNotification['destination'];
  actorName: string;
  post?: PostEntity;
  conversation?: Conversation;
  recipientIds?: number[];
  includeActor?: boolean;
}

/** Never generates activity notifications for deleted, suspended or unverified accounts. */
export function notificationMemberActive(member?: Member): boolean {
  return (
    !!member &&
    member.memberAuthEnabled &&
    !!member.verifiedAt &&
    !member.deleted_at &&
    !member.is_suspended
  );
}

/** Selects moderation explicitly because it is not part of ordinary post responses. */
async function visiblePost(
  manager: EntityManager,
  id: number,
): Promise<PostEntity | null> {
  const post = await manager
    .getRepository(PostEntity)
    .createQueryBuilder('post')
    .select([
      'post.id',
      'post.status',
      'post.isHidden',
      'post.isPsychoeducation',
      'post.createdBy',
      'post.deleted_at',
    ])
    .addSelect('post.moderation')
    .leftJoinAndSelect('post.member', 'author')
    .leftJoinAndSelect('post.space', 'space')
    .where('post.id = :id', { id })
    .getOne();
  if (
    !post ||
    post.deleted_at ||
    post.isPsychoeducation ||
    post.status !== 'PUBLISHED' ||
    post.isHidden ||
    post.moderation?.action !== 'publish'
  ) {
    return null;
  }
  if (
    post.space &&
    post.space.backup_space_id !== 0 &&
    (post.space.hidden !== 0 || post.space.inviteOnly !== 0)
  ) {
    return null;
  }
  return post;
}

/** Revalidates the source before fanout and delivery; carries no private message or post text. */
export async function notificationSource(
  manager: EntityManager,
  event: NotificationEvent,
  now = new Date(),
): Promise<NotificationSource | null> {
  let source: NotificationSource;
  if (event.type === NotificationType.MoodReminder) {
    const member = await manager.findOneBy(Member, { id: event.sourceId });
    if (
      !notificationMemberActive(member) ||
      !member.notificationTimeZone ||
      member.notificationTimeZone !== event.timeZone
    ) {
      return null;
    }
    const clock = moodReminderClock(now, member.notificationTimeZone);
    if (
      !clock.due ||
      clock.date !== event.localDate ||
      (await manager.count(MoodEntryEntity, {
        where: { memberId: member.id, dateString: event.localDate },
      }))
    ) {
      return null;
    }
    return {
      actor: member,
      actorName: '',
      includeActor: true,
      recipientIds: [member.id],
      destination: { kind: 'mood-tracker' },
    };
  }
  if (event.type === NotificationType.Message) {
    const message = await manager.findOne(Message, {
      where: { id: event.sourceId },
      select: { id: true },
      relations: ['sender', 'conversation', 'conversation.participants'],
    });
    if (
      !message?.conversation ||
      message.conversation.deletedAt ||
      message.conversation.participants.length !== 2 ||
      !message.conversation.participants.some(
        (member) => member.id === message.sender?.id,
      )
    ) {
      return null;
    }
    source = {
      actor: message.sender,
      actorName: '',
      conversation: message.conversation,
      recipientIds: message.conversation.participants.map(
        (member) => member.id,
      ),
      destination: { kind: 'chat', id: String(message.conversation.id) },
    };
  } else if (event.type === NotificationType.Forum) {
    const post = await visiblePost(manager, event.sourceId);
    if (!post) {
      return null;
    }
    source = {
      actor: post.member,
      actorName: post.createdBy === 'Anonim' ? 'Anonim' : '',
      post,
      destination: { kind: 'post', id: String(post.id) },
    };
  } else if (event.type === NotificationType.CommentReply) {
    const comment = await manager
      .getRepository(CommentEntity)
      .createQueryBuilder('comment')
      .select(['comment.id', 'comment.deleted_at', 'comment.moderationStatus'])
      .addSelect('comment.moderation')
      .leftJoinAndSelect('comment.member', 'author')
      .leftJoin('comment.post', 'post')
      .addSelect('post.id')
      .leftJoin('comment.parent', 'parent')
      .addSelect(['parent.id', 'parent.deleted_at', 'parent.moderationStatus'])
      .leftJoinAndSelect('parent.member', 'parentAuthor')
      .where('comment.id = :id', { id: event.sourceId })
      .getOne();
    if (
      !comment ||
      comment.deleted_at ||
      comment.moderationStatus !== 'approved' ||
      comment.moderation?.action !== 'publish'
    ) {
      return null;
    }
    const post = await visiblePost(manager, comment.post?.id);
    if (!post) {
      return null;
    }
    const recipients = [post.member?.id];
    if (
      comment.parent &&
      !comment.parent.deleted_at &&
      comment.parent.moderationStatus === 'approved'
    ) {
      recipients.push(comment.parent.member?.id);
    }
    source = {
      actor: comment.member,
      actorName: '',
      recipientIds: recipients.filter(
        (id): id is number => Number.isSafeInteger(id) && id > 0,
      ),
      destination: {
        kind: 'comment',
        id: String(comment.id),
        postId: String(post.id),
      },
      post,
    };
  } else {
    return null;
  }
  if (!notificationMemberActive(source.actor)) {
    return null;
  }
  // Do not freshly disclose an old named snapshot after the author anonymizes the post.
  if (
    event.type === NotificationType.Forum &&
    event.snapshot &&
    source.post?.createdBy === 'Anonim' &&
    event.snapshot.anonymous !== true
  ) {
    return null;
  }
  // Template variable bounds cannot make a successfully saved source event undeliverable.
  source.actorName =
    source.actorName ||
    (source.actor.name || source.actor.username || 'Pengguna')
      .replace(/[\u0000-\u001f\u007f]/gu, ' ')
      .trim()
      .slice(0, 100)
      .replace(/[\uD800-\uDBFF]$/u, '') ||
    'Pengguna';
  return source;
}

/** One member query naturally deduplicates overlapping friendship/community and reply audiences. */
export function notificationRecipients(
  manager: EntityManager,
  source: NotificationSource,
): SelectQueryBuilder<Member> {
  const query = manager
    .getRepository(Member)
    .createQueryBuilder('member')
    .select('member.id')
    .where(
      'member.memberAuthEnabled = :enabled AND member.verifiedAt IS NOT NULL AND member.is_suspended = :suspended AND member.deleted_at IS NULL',
      { enabled: true, suspended: false },
    );
  query.setParameter('actorId', source.actor.id);
  if (!source.includeActor) {
    query.andWhere('member.id != :actorId', { actorId: source.actor.id });
  }
  const friends = `EXISTS (SELECT 1 FROM user_follows friend_link WHERE friend_link.status = 'accepted' AND ((friend_link.followerId = :actorId AND friend_link.followingId = member.id) OR (friend_link.followingId = :actorId AND friend_link.followerId = member.id)))`;
  if (source.recipientIds) {
    const recipientIds = [...new Set(source.recipientIds)];
    query.andWhere('member.id IN (:...recipientIds)', {
      recipientIds: recipientIds.length ? recipientIds : [0],
    });
    if (source.conversation) {
      query.andWhere(friends);
    }
  } else {
    query.andWhere(
      `(${friends} OR EXISTS (SELECT 1 FROM backup_member_space membership WHERE membership.backup_member_id = member.id AND membership.backup_space_id = :spaceId AND membership.follow = :following))`,
      {
        spaceId:
          source.post?.space?.backup_space_id !== 0
            ? source.post?.space?.id ?? 0
            : 0,
        following: true,
      },
    );
  }
  return query;
}
