import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { MemberSession } from './member-session.entity';

@Entity('member_push_devices')
@Unique(['sessionId', 'platform'])
export class MemberPushDevice {
  @PrimaryGeneratedColumn() id: number;
  @Column({ length: 64 }) sessionId: string;
  @ManyToOne(() => MemberSession, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId', referencedColumnName: 'tokenHash' })
  session: MemberSession;
  @Column({ length: 10 }) platform: 'android' | 'ios' | 'web';
  @Column({ length: 5 }) provider: 'fcm' | 'apns';
  @Index({ unique: true })
  @Column({ length: 64, select: false })
  tokenHash: string;
  @Column({ type: 'text', select: false }) token: string;
  @Column({ type: 'datetime', precision: 3 }) createdAt: Date;
  @Column({ type: 'datetime', precision: 3 }) updatedAt: Date;
}
