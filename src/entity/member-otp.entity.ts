import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('member_otps')
export class MemberOtp {
  @PrimaryGeneratedColumn() id: number;
  @Column() memberId: number;
  @Column({ length: 20 }) purpose: string;
  @Column({ length: 64 }) codeHash: string;
  @Column({ default: 0 }) attempts: number;
  @Column({ type: 'datetime' }) expiresAt: Date;
  @Column({ type: 'datetime' }) sentAt: Date;
  @Column({ type: 'datetime', nullable: true }) consumedAt: Date | null;
  @Column({ length: 64, nullable: true }) resetHash: string | null;
  @Column({ type: 'datetime', nullable: true }) resetExpiresAt: Date | null;
}

