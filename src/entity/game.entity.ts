import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GameLevel } from './game-level.entity';
import { GameStep } from './game-step.entity';

@Entity('games')
export class Game {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'level_id' })
  levelId: number;

  @ManyToOne(() => GameLevel, (lvl) => lvl.games, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'level_id' })
  level: GameLevel;

  @Index({ unique: true })
  @Column({ length: 100 })
  key: string;

  @Column({ length: 150 })
  name: string;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex: number;

  @Column({ name: 'success_message', type: 'text', nullable: true })
  successMessage: string | null;

  @Column({ name: 'have_next_level', default: true })
  haveNextLevel: boolean;

  @Column({ name: 'points_reward', type: 'int', default: 50 })
  pointsReward: number;

  @Column({ name: 'is_published', default: true })
  isPublished: boolean;

  @OneToMany(() => GameStep, (step) => step.game, { cascade: true })
  steps: GameStep[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}

