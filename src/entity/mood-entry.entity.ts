import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Member } from './user-mimate.entity';

@Entity('member_moods')
@Unique(['memberId', 'dateString'])
export class MoodEntryEntity {
  @PrimaryGeneratedColumn() id: number;
  @Column() memberId: number;
  @ManyToOne(() => Member, { nullable: false })
  @JoinColumn({ name: 'memberId' })
  member: Member;
  @Column({ type: 'date' }) dateString: string;
  @Column({ length: 100 }) timeZone: string;
  @Column({ type: 'tinyint', unsigned: true }) score: number;
  @Column({ type: 'text' }) note: string;
  @Column({ type: 'json' }) attachmentIds: string[];
  @Column({ type: 'datetime', precision: 3 }) createdAt: Date;
  @Column({ type: 'datetime', precision: 3 }) updatedAt: Date;
}
