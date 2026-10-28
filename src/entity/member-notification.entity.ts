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
@Index('IDX_member_notifications_unread', ['memberId', 'deletedAt', 'readAt'])
export class MemberNotification {
  @PrimaryGeneratedColumn()
  id: number;

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
  } | null;

  @CreateDateColumn({ type: 'datetime', precision: 3 })
  createdAt: Date;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  readAt: Date | null;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  deletedAt: Date | null;
}
