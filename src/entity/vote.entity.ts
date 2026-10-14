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
import { PostEntity } from './post.entity';

@Entity('votes')
export class VoteEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ name: 'post_id', nullable: true })
  postId?: number;

  @ManyToOne(() => PostEntity, (post) => post.votes, { nullable: true })
  @JoinColumn({ name: 'post_id' })
  post?: PostEntity;

  @Column({ type: 'text', nullable: true })
  vote?: string;

  @Column({ nullable: true })
  order?: number;

  @Column({ name: 'total_vote', nullable: true, default: 0 })
  total_vote?: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at?: Date;
}
