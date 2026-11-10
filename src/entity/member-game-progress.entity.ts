import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Member } from './user-mimate.entity';
import { Game } from './game.entity';

export type GameProgressStatus = 'locked' | 'available' | 'finish';

@Entity('member_game_progress')
@Index(['memberId', 'gameId'], { unique: true })
export class MemberGameProgress {
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

  @Column({ length: 20, default: 'available' })
  status: GameProgressStatus;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

