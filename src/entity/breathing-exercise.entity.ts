import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('breathing_exercises')
export class BreathingExercise {
  @PrimaryGeneratedColumn() id: number;
  @Column({ length: 120 }) title: string;
  @Column({ length: 50 }) tag: string;
  @Column({ length: 500 }) description: string;
  @Column({ type: 'json' }) steps: string[];
  @Column({ type: 'tinyint', unsigned: true }) inhaleSeconds: number;
  @Column({ type: 'tinyint', unsigned: true }) hold1Seconds: number;
  @Column({ type: 'tinyint', unsigned: true }) exhaleSeconds: number;
  @Column({ type: 'tinyint', unsigned: true }) hold2Seconds: number;
  @Column({ length: 7 }) themeColor: string;
  @Column({ length: 20 }) artwork: 'relaxation' | 'sleep' | 'balance';
  @Column({ type: 'varchar', length: 2048, nullable: true }) imageUrl:
    | string
    | null;
  @Column({ type: 'varchar', length: 2048, nullable: true }) guideImageUrl:
    | string
    | null;
  @Column({ default: 0 }) sortOrder: number;
  @Column({ length: 10, default: 'draft' }) status: 'draft' | 'published';
  @Column({ default: 1 }) revision: number;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
