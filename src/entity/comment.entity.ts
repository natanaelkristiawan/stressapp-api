import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
  } from 'typeorm';
  import { PostEntity } from './post.entity';
  import { UserMimateEntity } from './user-mimate.entity';
  import { CommentReactionEntity } from './comment-reaction.entity';
  import { QuestPointDetail } from './quest-point-detail.entity';
  
  @Entity({
    engine: 'InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin',
    name: 'backup_comments',
  })
  export class CommentEntity {
    @PrimaryGeneratedColumn()
    id?: number;

    @Column({ nullable: true })
    commentId?: string;
  
    @Column({ nullable: true, type: 'longtext' })
    title: string;
  
    @Column({ nullable: true, type: 'longtext' })
    description: string;
  
    @Column({ nullable: true })
    externalId: string;
  
    @Column({ nullable: true })
    repliesCount: number;
  
    @CreateDateColumn()
    created_at: Date;
  
    @UpdateDateColumn()
    updated_at: Date;
  
    @DeleteDateColumn()
    deleted_at?: Date;


    @Column({ nullable: true })
    backup_comment_id?: number;
  
    // ✅ Fixed self-referencing parent-child relationship
    @ManyToOne(() => CommentEntity, (comment) => comment.comments, { nullable: true })
    @JoinColumn({ name: 'backup_comment_id' })
    parent?: CommentEntity;
  
    @OneToMany(() => CommentEntity, (comment) => comment.parent)
    comments?: CommentEntity[];
  
    @ManyToOne(() => PostEntity, (post) => post.id)
    @JoinColumn({ name: 'backup_post_with_attribute_id' })
    post: PostEntity;
  
    @ManyToOne(() => UserMimateEntity, (member) => member.id)
    @JoinColumn({ name: 'backup_member_id' })
    member?: UserMimateEntity;
  
    @OneToMany(() => CommentReactionEntity, (reaction) => reaction.comment)
    reactions?: CommentReactionEntity[];
  
    @OneToMany(() => QuestPointDetail, (questPointDetail) => questPointDetail.comment)
    questPointDetails?: QuestPointDetail[];
  }
  