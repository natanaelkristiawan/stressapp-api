import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { Activity } from '../entity/activity.entity';
import { MemberNotification } from '../entity/member-notification.entity';
import { Member } from '../entity/user-mimate.entity';
import {
  ActivityLogQueryDto,
  LogQueryDto,
  NotificationLogQueryDto,
} from './cms-logs.dto';

/** Returns only the identity fields needed to trace a log, without profile or credential data. */
function identity(id: number | null | undefined, member?: Member) {
  if (!id) {
    return null;
  }
  return { id, name: member?.name ?? '', email: member?.email ?? '' };
}

/** Projects audit metadata only: legacy activity messages may contain submitted/private text. */
function activityView(row: Activity) {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    action: row.action,
    source: row.source ?? null,
    actor: identity(row.userId, row.user),
    targetMember: identity(row.targetUserId, row.targetUser),
    targetType: row.targetType ?? null,
    postId: row.postId ?? null,
    commentId: row.commentId ?? null,
    reactionId: row.reactionId ?? null,
  };
}

/** Preserves notification history and safe delivery diagnostics, never tokens or source chat text. */
function notificationView(row: MemberNotification) {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    recipient: identity(row.memberId, row.member),
    type: row.type,
    title: row.title,
    body: row.body,
    readAt: row.readAt?.toISOString() ?? null,
    deletedAt: row.deletedAt?.toISOString() ?? null,
    pushStatus: row.pushStatus,
    pushAttemptedAt: row.pushAttemptedAt?.toISOString() ?? null,
    pushAccepted: row.pushAccepted,
    pushFailed: row.pushFailed,
    pushFailureCode: row.pushFailureCode,
    templateRevision: row.templateRevision,
  };
}

@Injectable()
export class CmsLogsService {
  constructor(@InjectDataSource('mimate') private readonly db: DataSource) {}

  /** Applies UTC creation-date boundaries and stable server pagination to either log. */
  private scope<T extends ObjectLiteral>(
    builder: SelectQueryBuilder<T>,
    alias: string,
    query: LogQueryDto,
  ) {
    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException('From date must not be after to date.');
    }
    if (query.from) {
      builder.andWhere(`${alias}.createdAt >= :from`, {
        from: new Date(`${query.from}T00:00:00Z`),
      });
    }
    if (query.to) {
      const end = new Date(`${query.to}T00:00:00Z`);
      end.setUTCDate(end.getUTCDate() + 1);
      if (end.getUTCFullYear() > 9999) {
        throw new BadRequestException('To date is out of range.');
      }
      builder.andWhere(`${alias}.createdAt < :to`, { to: end });
    }
    return builder
      .orderBy(`${alias}.createdAt`, 'DESC')
      .addOrderBy(`${alias}.id`, 'DESC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize);
  }

  /** Selects metadata and optional current identities while leaving activity messages unread. */
  private activities() {
    return this.db
      .getRepository(Activity)
      .createQueryBuilder('activity')
      .select([
        'activity.id',
        'activity.createdAt',
        'activity.action',
        'activity.source',
        'activity.userId',
        'activity.targetUserId',
        'activity.targetType',
        'activity.postId',
        'activity.commentId',
        'activity.reactionId',
      ])
      .leftJoin('activity.user', 'actor')
      .addSelect(['actor.id', 'actor.name', 'actor.email'])
      .leftJoin('activity.targetUser', 'target')
      .addSelect(['target.id', 'target.name', 'target.email']);
  }

  /** Lists persisted activity records; member matches either actor or recipient. */
  async activity(query: ActivityLogQueryDto) {
    const builder = this.activities();
    if (query.memberId) {
      builder.andWhere(
        '(activity.userId = :memberId OR activity.targetUserId = :memberId)',
        { memberId: query.memberId },
      );
    }
    if (query.search) {
      builder.andWhere(
        "(LOCATE(:search, LOWER(COALESCE(actor.name, ''))) > 0 OR LOCATE(:search, LOWER(COALESCE(actor.email, ''))) > 0 OR LOCATE(:search, LOWER(COALESCE(target.name, ''))) > 0 OR LOCATE(:search, LOWER(COALESCE(target.email, ''))) > 0)",
        { search: query.search.toLowerCase() },
      );
    }
    if (query.action) {
      builder.andWhere('activity.action = :action', { action: query.action });
    }
    const [rows, total] = await this.scope(
      builder,
      'activity',
      query,
    ).getManyAndCount();
    return {
      items: rows.map(activityView),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /** Loads one safe activity record for a direct read-only detail route. */
  async activityDetail(id: number) {
    const row = await this.activities()
      .where('activity.id = :id', { id })
      .getOne();
    if (!row) {
      throw new NotFoundException('Activity log not found.');
    }
    return activityView(row);
  }

  /** Selects only notification text and safe status metadata, including soft-cleared rows. */
  private notifications() {
    return this.db
      .getRepository(MemberNotification)
      .createQueryBuilder('notification')
      .select([
        'notification.id',
        'notification.memberId',
        'notification.createdAt',
        'notification.type',
        'notification.title',
        'notification.body',
        'notification.readAt',
        'notification.deletedAt',
        'notification.pushStatus',
        'notification.pushAttemptedAt',
        'notification.pushAccepted',
        'notification.pushFailed',
        'notification.pushFailureCode',
        'notification.templateRevision',
      ])
      .leftJoin('notification.member', 'recipient')
      .addSelect(['recipient.id', 'recipient.name', 'recipient.email']);
  }

  /** Lists recipient history with independent read/clear and delivery filters. */
  async notification(query: NotificationLogQueryDto) {
    const builder = this.notifications();
    if (query.memberId) {
      builder.andWhere('notification.memberId = :memberId', {
        memberId: query.memberId,
      });
    }
    if (query.search) {
      builder.andWhere(
        "(LOCATE(:search, LOWER(COALESCE(recipient.name, ''))) > 0 OR LOCATE(:search, LOWER(COALESCE(recipient.email, ''))) > 0)",
        { search: query.search.toLowerCase() },
      );
    }
    if (query.type) {
      builder.andWhere('notification.type = :type', { type: query.type });
    }
    if (query.state === 'cleared') {
      builder.andWhere('notification.deletedAt IS NOT NULL');
    } else if (query.state === 'read') {
      builder.andWhere(
        'notification.deletedAt IS NULL AND notification.readAt IS NOT NULL',
      );
    } else if (query.state === 'unread') {
      builder.andWhere(
        'notification.deletedAt IS NULL AND notification.readAt IS NULL',
      );
    }
    if (query.pushStatus !== 'all') {
      builder.andWhere('notification.pushStatus = :pushStatus', {
        pushStatus: query.pushStatus,
      });
    }
    const [rows, total] = await this.scope(
      builder,
      'notification',
      query,
    ).getManyAndCount();
    return {
      items: rows.map(notificationView),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /** Returns one historical notification without granting access to its underlying private resource. */
  async notificationDetail(id: number) {
    const row = await this.notifications()
      .where('notification.id = :id', { id })
      .getOne();
    if (!row) {
      throw new NotFoundException('Notification log not found.');
    }
    return notificationView(row);
  }
}
