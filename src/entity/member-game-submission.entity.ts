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
import { Game } from './game.entity';

export interface GameSubmissionAttachment {
  type: 'image' | 'audio';
  url: string;
  duration?: number;
}

@Entity('member_game_submissions')
export class MemberGameSubmission {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'member_id' })
  memberId: number;

  @ManyToOne(() => Member, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @Index()
  @Column({ name: 'game_id' })
  gameId: number;

  @ManyToOne(() => Game, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'game_id' })
  game: Game;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'json', nullable: true })
  attachments: GameSubmissionAttachment[] | null;

  @Column({ name: 'confidence_score', type: 'int', nullable: true })
  confidenceScore: number | null;

  @Column({ name: 'list_answers', type: 'json', nullable: true })
  listAnswers: string[] | null;

  @Column({ name: 'reflective_answer', type: 'text', nullable: true })
  reflectiveAnswer: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

