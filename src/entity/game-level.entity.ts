import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Game } from './game.entity';

@Entity('game_levels')
export class GameLevel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'level_number', type: 'int', unique: true })
  levelNumber: number;

  @Column({ length: 120 })
  title: string;

  @Column({ name: 'target_description', type: 'text', nullable: true })
  targetDescription: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => Game, (game) => game.level)
  games: Game[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

