import { Column, Entity, PrimaryGeneratedColumn, Unique, ManyToOne, JoinColumn } from 'typeorm';
import { Member } from './user-mimate.entity';

@Entity('member_otps')
@Unique(['memberId', 'purpose'])
export class MemberOtp {
  @PrimaryGeneratedColumn() id: number;
  @Column() memberId: number;
  @ManyToOne(() => Member, { nullable: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'memberId' }) member: Member;
  @Column({ length: 20 }) purpose: string;
  @Column({ length: 64 }) codeHash: string;
  @Column({ default: 0 }) attempts: number;
  @Column({ type: 'datetime' }) expiresAt: Date;
  @Column({ type: 'datetime' }) sentAt: Date;
  @Column({ type: 'datetime', nullable: true }) consumedAt: Date | null;
  @Column({ length: 64, nullable: true, unique: true }) resetHash: string | null;
  @Column({ type: 'datetime', nullable: true }) resetExpiresAt: Date | null;
}

