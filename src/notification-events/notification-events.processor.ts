import { moodReminderClock } from './mood-reminder-clock';
import { Member } from '../entity/user-mimate.entity';
import { MoodEntryEntity } from '../entity/mood-entry.entity';
import { NotificationType } from '../entity/member-notification.entity';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Interval } from '@nestjs/schedule';
import { DataSource, IsNull, LessThanOrEqual } from 'typeorm';
import { NotificationEvent } from '../entity/notification-event.entity';
import { MemberNotification } from '../entity/member-notification.entity';
import { NotificationTemplatesService } from '../notification-templates/notification-templates.service';
import {
  PushNotificationsService,
  pushFailureCode,
} from '../push-devices/push-notifications.service';
import {
  notificationRecipients,
  notificationSource,
} from './notification-source';

const FANOUT_PAGE_SIZE = 200;

@Injectable()
export class NotificationEventsProcessor {
  private running = false;
  private reminderMinute = -1;
  private readonly logger = new Logger(NotificationEventsProcessor.name);

  constructor(
    @InjectDataSource('mimate') private readonly db: DataSource,
    private readonly templates: NotificationTemplatesService,
    private readonly push: PushNotificationsService,
  ) {}

  /** Polls durable committed events and pending pushes; overlapping ticks never compete locally. */
  @Interval(5000)
  async tick(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    try {
      const minute = Math.floor(Date.now() / 60000);
      if (this.reminderMinute !== minute) {
        await this.enqueueMoodReminders();
        this.reminderMinute = minute;
      }
      const events = await this.db.getRepository(NotificationEvent).find({
        where: { completedAt: IsNull(), retryAt: LessThanOrEqual(new Date()) },
        order: { retryAt: 'ASC', key: 'ASC' },
        take: 10,
      });
      for (const event of events) {
        try {
          await this.materialize(event.key);
        } catch (error) {
          const failureCode =
            error instanceof ServiceUnavailableException
              ? 'template-unavailable'
              : 'processing-failed';
          await this.db.getRepository(NotificationEvent).update(
            { key: event.key, completedAt: IsNull() },
            {
              retryAt: new Date(
                Date.now() +
                  Math.min(300000, 5000 * 2 ** Math.min(event.attempts, 6)),
              ),
              attempts: () => 'attempts + 1',
              failureCode,
            },
          );
          this.logger.warn(`Notification event deferred: ${failureCode}`);
        }
      }
      if (this.push.status().configured) {
        const notifications = await this.db
          .getRepository(MemberNotification)
          .find({
            where: { pushStatus: 'pending' },
            order: { id: 'ASC' },
            take: 50,
          });
        for (const notification of notifications) {
          await this.deliver(notification.id);
        }
      }
    } catch {
      this.logger.error(
        'Notification processing unavailable. Pending work retained.',
      );
    } finally {
      this.running = false;
    }
  }

  /** Scans in bounded pages; deterministic daily keys make scheduler replicas and restarts safe. */
  async enqueueMoodReminders(now = new Date()): Promise<void> {
    let cursor = 0;
    while (true) {
      const members = await this.db
        .getRepository(Member)
        .createQueryBuilder('member')
        .select(['member.id', 'member.notificationTimeZone'])
        .where(
          'member.id > :cursor AND member.memberAuthEnabled = :enabled AND member.verifiedAt IS NOT NULL AND member.is_suspended = :suspended AND member.deleted_at IS NULL AND member.notificationTimeZone IS NOT NULL',
          { cursor, enabled: true, suspended: false },
        )
        .orderBy('member.id', 'ASC')
        .take(FANOUT_PAGE_SIZE)
        .getMany();
      for (const member of members) {
        const clock = moodReminderClock(now, member.notificationTimeZone);
        if (
          !clock.due ||
          (await this.db
            .getRepository(MoodEntryEntity)
            .count({ where: { memberId: member.id, dateString: clock.date } }))
        ) {
          continue;
        }
        // Daily source identity remains reserved even after the member clears the inbox item.
        const key = `mood-reminder:${member.id}:${clock.date}`;
        const events = this.db.getRepository(NotificationEvent);
        if (await events.existsBy({ key })) {
          continue;
        }
        try {
          await events.insert({
            key,
            type: NotificationType.MoodReminder,
            sourceId: member.id,
            localDate: clock.date,
            timeZone: member.notificationTimeZone,
            retryAt: now,
          });
        } catch (error) {
          if (
            typeof error !== 'object' ||
            error === null ||
            !('code' in error) ||
            error.code !== 'ER_DUP_ENTRY'
          ) {
            throw error;
          }
        }
      }
      if (members.length < FANOUT_PAGE_SIZE) {
        break;
      }
      cursor = members[members.length - 1].id;
    }
  }

  /** Commits one bounded audience page with a durable cursor and per-recipient uniqueness. */
  async materialize(key: string, now = new Date()): Promise<void> {
    await this.db.transaction(async (manager) => {
      const event = await manager.findOne(NotificationEvent, {
        where: { key },
        lock: { mode: 'pessimistic_write' },
      });
      if (!event || event.completedAt || event.retryAt > now) {
        return;
      }
      const source = await notificationSource(manager, event, now);
      if (!source) {
        await manager.update(
          NotificationEvent,
          { key },
          { completedAt: new Date(), failureCode: 'source-unavailable' },
        );
        return;
      }
      const recipients = await notificationRecipients(manager, source)
        .andWhere('member.id > :cursor', { cursor: event.lastMemberId })
        .orderBy('member.id', 'ASC')
        .take(FANOUT_PAGE_SIZE)
        .getMany();
      if (recipients.length && !event.snapshot) {
        const { title, body, templateRevision } = await this.templates.render(
          event.type,
          event.type === NotificationType.MoodReminder
            ? {}
            : { actorName: source.actorName },
        );
        event.snapshot = {
          title,
          body,
          templateRevision,
          anonymous:
            event.type === NotificationType.Forum &&
            source.post?.createdBy === 'Anonim',
        };
      }
      for (const recipient of recipients) {
        await manager.insert(MemberNotification, {
          memberId: recipient.id,
          eventKey: key,
          type: event.type,
          title: event.snapshot.title,
          body: event.snapshot.body,
          templateRevision: event.snapshot.templateRevision,
          destination: source.destination,
          readAt: null,
          deletedAt: null,
          pushStatus: 'pending',
        });
      }
      await manager.update(
        NotificationEvent,
        { key },
        {
          snapshot: event.snapshot,
          lastMemberId:
            recipients[recipients.length - 1]?.id ?? event.lastMemberId,
          completedAt: recipients.length < FANOUT_PAGE_SIZE ? new Date() : null,
          failureCode: null,
        },
      );
    });
  }

  /** Claims each push once before external I/O; ambiguous delivery is deliberately never replayed. */
  async deliver(id: number, now = new Date()): Promise<void> {
    const claimed = await this.db.transaction(async (manager) => {
      const notification = await manager.findOne(MemberNotification, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!notification || notification.pushStatus !== 'pending') {
        return null;
      }
      const event = notification.eventKey
        ? await manager.findOneBy(NotificationEvent, {
            key: notification.eventKey,
          })
        : null;
      const source = event
        ? await notificationSource(manager, event, now)
        : null;
      const eligible = source
        ? await notificationRecipients(manager, source)
            .andWhere('member.id = :memberId', {
              memberId: notification.memberId,
            })
            .getOne()
        : null;
      if (!eligible || notification.readAt || notification.deletedAt) {
        await manager.update(
          MemberNotification,
          { id },
          { pushStatus: 'skipped' },
        );
        return null;
      }
      await manager.update(
        MemberNotification,
        { id },
        { pushStatus: 'sending', pushAttemptedAt: new Date() },
      );
      return notification;
    });
    if (!claimed) {
      return;
    }
    try {
      const result = await this.push.sendNotification(
        claimed.memberId,
        claimed.title,
        claimed.body,
        claimed.id,
        claimed.type,
      );
      let pushStatus: MemberNotification['pushStatus'] = 'failed';
      if (result.attempted === 0) {
        pushStatus = 'skipped';
      } else if (result.accepted > 0) {
        pushStatus = 'accepted';
      }
      await this.db.getRepository(MemberNotification).update(
        { id, pushStatus: 'sending' },
        {
          pushStatus,
          pushAccepted: result.accepted,
          pushFailed: result.failed,
          pushFailureCode: result.failures[0]?.code ?? null,
        },
      );
    } catch (error) {
      await this.db.getRepository(MemberNotification).update(
        { id, pushStatus: 'sending' },
        {
          pushStatus: 'failed',
          pushFailureCode: pushFailureCode(error, 'messaging/request-failed'),
        },
      );
    }
  }
}
