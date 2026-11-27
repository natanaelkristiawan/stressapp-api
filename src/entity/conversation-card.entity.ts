import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { InterestCategory } from './interest-category.entity';

export type ConversationCardVisual = 'kuliner' | 'hobi' | 'film' | 'keseharian';

@Entity({
  name: 'conversation_cards',
  engine: 'InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin',
})
export class ConversationCard {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  title: string;

  @Column({ length: 500 })
  prompt: string;

  @Column({ length: 500, nullable: true, default: null })
  subPrompt: string | null;

  @Column({ length: 20 })
  color: string;

  @Column({ length: 20 })
  textColor: string;

  // The `visual` drives the card illustration in the mobile picker and stays
  // stable even when admins reassign the card to a different category.
  @Column({ type: 'varchar', length: 20, default: 'keseharian' })
  visual: ConversationCardVisual;

  @Column({ type: 'int', nullable: true, default: null })
  categoryId: number | null;

  @ManyToOne(() => InterestCategory, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoryId' })
  category: InterestCategory | null;

  @Column({ type: 'int', unsigned: true, default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', unsigned: true, default: 1 })
  revision: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
