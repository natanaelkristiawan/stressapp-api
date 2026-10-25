import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Member } from './user-mimate.entity';
import { BreathingExercise } from './breathing-exercise.entity';

export interface BreathingSnapshot {
  title: string;
  inhaleSeconds: number;
  hold1Seconds: number;
  exhaleSeconds: number;
  hold2Seconds: number;
}
@Entity('breathing_sessions')
@Index(['memberId', 'startedAt'])
@Index(['memberId', 'requestId'], { unique: true })
export class BreathingSession {
  @PrimaryColumn({ type: 'varchar', length: 36 }) id: string;
  @Column({ length: 80 }) requestId: string;
  @Column() memberId: number;
  @ManyToOne(() => Member, { nullable: false })
  @JoinColumn({ name: 'memberId' })
  member: Member;
  @Column() exerciseId: number;
  @ManyToOne(() => BreathingExercise, { nullable: false })
  @JoinColumn({ name: 'exerciseId' })
  exercise: BreathingExercise;
  @Column({ type: 'json' }) snapshot: BreathingSnapshot;
  @Column({ type: 'int', unsigned: true }) durationSeconds: number;
  @Column({ type: 'int', unsigned: true, default: 0 }) elapsedSeconds: number;
  @Column({ length: 12, default: 'in_progress' }) status:
    | 'in_progress'
    | 'completed'
    | 'stopped';
  @Index()
  @Column({ type: 'datetime', precision: 3 })
  startedAt: Date;
  @Column({ type: 'datetime', precision: 3, nullable: true })
  endedAt: Date | null;
}
