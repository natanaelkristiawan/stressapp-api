import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Member } from './user-mimate.entity';

export enum NotificationType {
  Message = 'message',
  Forum = 'forum',
  MoodReminder = 'mood-reminder',
  CommentReply = 'comment-reply',
}

@Entity('member_notifications')
@Index('IDX_member_notifications_inbox', [
  'memberId',
  'type',
  'deletedAt',
  'id',
])
@Index('UQ_member_notifications_event', ['eventKey', 'memberId'], {
  unique: true,
})
@Index('IDX_member_notifications_push', ['pushStatus', 'id'])
@Index('IDX_member_notifications_unread', ['memberId', 'deletedAt', 'readAt'])
export class MemberNotification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 64, nullable: true })
  eventKey: string | null;

  @Column({ type: 'int', nullable: true })
  templateRevision: number | null;

  // Existing records have no pending push; only newly generated notifications are scheduled.
  @Column({ length: 10, default: 'skipped' })
  pushStatus: 'pending' | 'sending' | 'accepted' | 'failed' | 'skipped';

  @Column({ default: 0 })
  pushAccepted: number;

  @Column({ default: 0 })
  pushFailed: number;

  @Column({ length: 64, nullable: true })
  pushFailureCode: string | null;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  pushAttemptedAt: Date | null;

  @Column()
  memberId: number;

  @ManyToOne(() => Member, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'memberId' })
  member: Member;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ length: 160 })
  title: string;

  @Column({ length: 1000 })
  body: string;

  // Typed destinations avoid storing arbitrary external links in notifications.
  @Column({ type: 'json', nullable: true })
  destination: {
    kind: 'chat' | 'post' | 'comment' | 'mood-tracker';
    id?: string;
    postId?: string;
  } | null;

  @CreateDateColumn({
    type: 'datetime',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  createdAt: Date;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  readAt: Date | null;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  deletedAt: Date | null;
}
