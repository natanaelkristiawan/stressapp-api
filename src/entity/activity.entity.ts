// activity-log.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PostEntity } from './post.entity';
import { CommentEntity } from './comment.entity';
import { ReactionEntity } from './reaction.entity';
import { UserMimateEntity } from './user-mimate.entity';
@Entity('activity_logs')
export class Activity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ nullable: true })
  @Index()
  userId?: number;

  @ManyToOne(() => UserMimateEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user?: UserMimateEntity;

  @Column({ length: 50 })
  @Index()
  action: string;

  @ManyToOne(() => PostEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'postId' })
  post?: PostEntity;

  @Column({ nullable: true })
  postId?: number;

  @ManyToOne(() => CommentEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'commentId' })
  comment?: CommentEntity;

  @Column({ nullable: true })
  commentId?: number;

  @ManyToOne(() => ReactionEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reactionId' })
  reaction?: ReactionEntity;

  @Column({ nullable: true })
  reactionId?: number;

  @Column({ nullable: true, length: 20 })
  targetType?: 'post' | 'comment' | 'reaction' | 'login' | 'member';

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  targetUserId?: number;

  @ManyToOne(() => UserMimateEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'targetUserId' })
  targetUser?: UserMimateEntity;

  @Column({ nullable: true })
  message?: string;

  @Column({ nullable: true })
  readAt?: Date;

  @Column({ nullable: true })
  source?: string;

  @Column({ nullable: true })
  hit_from?: string;
}
