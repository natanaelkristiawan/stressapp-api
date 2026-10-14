import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
  } from 'typeorm';
  import { CommentEntity } from './comment.entity';
  import { UserMimateEntity } from './user-mimate.entity';
  
  @Entity({ engine: 'InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin', name: 'backup_comment_reactions' })
  export class CommentReactionEntity {
    @PrimaryGeneratedColumn()
    id?: number;
  
    @Column({ nullable: true })
    reaction: string;
  
    @Column({ nullable: true })
    name: string;
  
    @ManyToOne(() => CommentEntity, (comment) => comment.id)
    @JoinColumn({ name: 'backup_comment_id' })
    comment?: CommentEntity;
  
    @ManyToOne(() => UserMimateEntity, (member) => member.id)
    @JoinColumn({ name: 'backup_member_id' })
    member?: UserMimateEntity;
  
    @CreateDateColumn()
    created_at: Date;
  
    @UpdateDateColumn()
    updated_at: Date;
  
    @DeleteDateColumn()
    deleted_at?: Date;
  }
  