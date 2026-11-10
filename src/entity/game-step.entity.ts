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
import { Game } from './game.entity';

export type GameStepLayout =
  | 'detail'
  | 'convident'
  | 'post'
  | 'post-with-video'
  | 'post-with-popup'
  | 'list-input';

@Entity('game_steps')
export class GameStep {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'game_id' })
  gameId: number;

  @ManyToOne(() => Game, (game) => game.steps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'game_id' })
  game: Game;

  @Column({ name: 'step_order', type: 'int', default: 1 })
  stepOrder: number;

  @Column({ length: 50 })
  layout: GameStepLayout;

  @Column({ length: 150 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'description_extra', type: 'text', nullable: true })
  descriptionExtra: string | null;

  @Column({ type: 'text', nullable: true })
  instruction: string | null;

  @Column({ name: 'video_url', type: 'varchar', length: 2048, nullable: true })
  videoUrl: string | null;

  @Column({ name: 'reflective_title', length: 150, nullable: true })
  reflectiveTitle: string | null;

  @Column({ name: 'reflective_question', type: 'text', nullable: true })
  reflectiveQuestion: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

