import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
  } from 'typeorm';

  import { Quest } from './quest.entity';
  import { UserMimateEntity } from './user-mimate.entity';
import { PostEntity } from './post.entity';
import { CommentEntity } from './comment.entity';
import { ReactionEntity } from './reaction.entity';
  
  export enum PointSource {
    QUEST = 'quest',
    REFERRAL = 'referral',
    LOGIN = 'login',
    OTHER = 'other',
  }
  
  @Entity('quest_point_detail')
  export class QuestPointDetail {
    @PrimaryGeneratedColumn()
    id?: number;
  
    @Column()
    member_id: number;

  
    @Column({ nullable: true })
    quest_id: number;

    @Column({ nullable: true })
    post_id?: number|null;
  
    @Column({ nullable: true })
    comment_id?: number | null;

    @Column({ nullable: true })
    reaction_id?: number | null;

    @Column({ type: 'enum', enum: PointSource })
    source: PointSource;
  
    @Column()
    points: number;
  
    @Column({ type: 'text', nullable: true })
    note: string;
  
    @CreateDateColumn({ type: 'timestamp', nullable: true })
    created_at: Date;

  
    @ManyToOne(() => UserMimateEntity, (member) => member.questPointDetails, { onDelete: 'NO ACTION' })
    @JoinColumn({ name: 'member_id' })
    member?: UserMimateEntity;
  
    @ManyToOne(() => Quest, (quest) => quest.questPointDetails, { nullable: true, onDelete: 'NO ACTION' })
    @JoinColumn({ name: 'quest_id' })
    quest?: Quest;

    // post
    @ManyToOne(() => PostEntity, (post) => post.questPointDetails, { nullable: true, onDelete: 'NO ACTION' })
    @JoinColumn({ name: 'post_id' })
    post?: PostEntity;

    // comment
    @ManyToOne(() => CommentEntity, (comment) => comment.questPointDetails, { nullable: true, onDelete: 'NO ACTION' })
    @JoinColumn({ name: 'comment_id' })
    comment?: CommentEntity;

    // reaction
    @ManyToOne(() => ReactionEntity, (reaction) => reaction.questPointDetails, { nullable: true, onDelete: 'NO ACTION' })
    @JoinColumn({ name: 'reaction_id' })
    reaction?: ReactionEntity;
  }
  