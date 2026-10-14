// post-report.entity.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    UpdateDateColumn,
    DeleteDateColumn,
  } from 'typeorm';
import { PostEntity } from './post.entity';
import { UserMimateEntity } from './user-mimate.entity';

  
  export enum ReportReason {
    MISLEADING = 'misleading',
    SCAM = 'scam',
    OFFENSIVE = 'offensive',
    SPAM = 'spam',
    VIOLENT = 'violent',
    ABUSED = 'abused',
    OTHER = 'other',
  }
  
  @Entity()
  export class PostReport {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column({ type: 'enum', enum: ReportReason })
    reason: ReportReason;
  
    @Column({ type: 'text', nullable: true })
    description?: string;
  
    @CreateDateColumn()
    created_at: Date;

    // updated_at
    @UpdateDateColumn()
    updated_at: Date;

    // deleted_at
    @DeleteDateColumn()
    deleted_at: Date;

    // is_resolved
    @Column({ type: 'boolean', default: 0, nullable:true })
    is_solved: boolean;

    // solved reason
    @Column({ type: 'text', nullable: true })
    solved_description: string;

    // status
    @Column({ default: false, type: 'boolean' })
    status: boolean;
  
    @ManyToOne(() => PostEntity, post => post.reports, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'post_id' })
    post: PostEntity;
  
    @ManyToOne(() => UserMimateEntity, member => member.reports, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'reported_by_member_id' })
    reportedBy: UserMimateEntity;
  }
  