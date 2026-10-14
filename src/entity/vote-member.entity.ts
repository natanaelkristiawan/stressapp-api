import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserMimateEntity } from './user-mimate.entity';
import { VoteEntity } from './vote.entity';
import { PostEntity } from './post.entity';

@Entity('vote_members')
export class VoteMemberEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ name: 'member_id', nullable: true })
  memberId?: number;

  @ManyToOne(() => UserMimateEntity, { nullable: true })
  @JoinColumn({ name: 'member_id' })
  member?: UserMimateEntity;

  @Column({ name: 'vote_id', nullable: true })
  voteId?: number;

  @ManyToOne(() => VoteEntity, { nullable: true })
  @JoinColumn({ name: 'vote_id' })
  vote?: VoteEntity;

  @Column({ name: 'post_id', nullable: true })
  postId?: number;

  @ManyToOne(() => PostEntity, { nullable: true })
  @JoinColumn({ name: 'post_id' })
  post?: PostEntity;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at?: Date;
}
