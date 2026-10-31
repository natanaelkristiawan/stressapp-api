import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';
import { NotificationType } from './member-notification.entity';

export type ActivityNotificationType =
  | NotificationType.Message
  | NotificationType.Forum
  | NotificationType.CommentReply;

@Entity('notification_events')
@Index('IDX_notification_events_pending', ['completedAt', 'retryAt'])
export class NotificationEvent {
  @PrimaryColumn({ length: 64 })
  key: string;

  @Column({ length: 20 })
  type: NotificationType;

  @Column()
  sourceId: number;

  @Column({ type: 'date', nullable: true })
  localDate: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  timeZone: string | null;

  @Column({ default: 0 })
  lastMemberId: number;

  @Column({ default: 0 })
  attempts: number;

  @Column({ type: 'datetime', precision: 3 })
  retryAt: Date;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  completedAt: Date | null;

  @Column({ length: 32, nullable: true })
  failureCode: string | null;

  @Column({ type: 'json', nullable: true })
  snapshot: {
    title: string;
    body: string;
    templateRevision: number;
    anonymous?: boolean;
  } | null;

  @CreateDateColumn({
    type: 'datetime',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  createdAt: Date;
}
