import { Member } from '../entity/user-mimate.entity';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, IsNull } from 'typeorm';
import { MemberNotification } from '../entity/member-notification.entity';
import { NotificationListDto } from './member-notifications.dto';

@Injectable()
export class MemberNotificationsService {
  constructor(@InjectDataSource('mimate') private readonly db: DataSource) {}

  /** Returns only notification scheduling settings, never unrelated profile data. */
  async settings(memberId: number) {
    const member = await this.db.getRepository(Member).findOne({
      where: { id: memberId },
      select: { id: true, notificationTimeZone: true },
    });
    if (!member) {
      throw new NotFoundException('Anggota tidak ditemukan.');
    }
    return {
      timeZone: member.notificationTimeZone,
      moodReminderLocalTime: '20:00',
    };
  }

  /** Stores one account-owned timezone shared by its logged-in installations. */
  async saveSettings(memberId: number, timeZone: string) {
    const result = await this.db
      .getRepository(Member)
      .update({ id: memberId }, { notificationTimeZone: timeZone });
    if (!result.affected) {
      throw new NotFoundException('Anggota tidak ditemukan.');
    }
    return { timeZone, moodReminderLocalTime: '20:00' };
  }

  /** Lists one category of the member's retained notifications, newest first. */
  async list(memberId: number, input: NotificationListDto) {
    const [records, total] = await this.db
      .getRepository(MemberNotification)
      .findAndCount({
        where: { memberId, type: input.type, deletedAt: IsNull() },
        order: { id: 'DESC' },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      });
    return {
      items: records.map((record) => ({
        id: record.id,
        type: record.type,
        title: record.title,
        body: record.body,
        destination: record.destination,
        createdAt: record.createdAt,
        readAt: record.readAt,
      })),
      total,
      page: input.page,
      pageSize: input.pageSize,
    };
  }

  /** Atomically marks an owned visible record read, preserving its first read time. */
  async markRead(memberId: number, id: number) {
    const repository = this.db.getRepository(MemberNotification);
    await repository.update(
      { id, memberId, deletedAt: IsNull(), readAt: IsNull() },
      { readAt: new Date() },
    );
    const notification = await repository.findOneBy({
      id,
      memberId,
      deletedAt: IsNull(),
    });
    if (!notification) {
      throw new NotFoundException('Notifikasi tidak ditemukan.');
    }
    return {
      id,
      readAt: notification.readAt,
      unreadNotificationCount: await this.unreadCount(memberId),
    };
  }

  /** Clears only an owned record; repeated clears preserve the original deletion time. */
  async clear(memberId: number, id: number) {
    const repository = this.db.getRepository(MemberNotification);
    await repository.update(
      { id, memberId, deletedAt: IsNull() },
      { deletedAt: new Date() },
    );
    const notification = await repository.findOneBy({ id, memberId });
    if (!notification) {
      throw new NotFoundException('Notifikasi tidak ditemukan.');
    }
    return {
      id,
      deletedAt: notification.deletedAt,
      unreadNotificationCount: await this.unreadCount(memberId),
    };
  }

  /** Counts unread retained records across categories for the member's bell. */
  async unreadCount(memberId: number): Promise<number> {
    return this.db.getRepository(MemberNotification).count({
      where: { memberId, readAt: IsNull(), deletedAt: IsNull() },
    });
  }
}
