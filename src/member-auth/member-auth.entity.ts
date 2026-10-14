import { Column, Entity, PrimaryGeneratedColumn, PrimaryColumn } from 'typeorm';

@Entity('members')
export class Member {
  @PrimaryGeneratedColumn() id: number;
  @Column({ length: 254, unique: true }) email: string;
  @Column({ length: 100 }) name: string;
  @Column({ length: 60, select: false }) passwordHash: string;
  @Column({ type: 'datetime', nullable: true }) verifiedAt: Date | null;
  @Column({ default: false }) suspended: boolean;
  @Column({ type: 'datetime', nullable: true }) deletedAt: Date | null;
  @Column({ type: 'datetime' }) termsAcceptedAt: Date;
  @Column({ type: 'datetime' }) createdAt: Date;
}

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

@Entity('member_sessions')
export class MemberSession {
  // Historical SQL column name: now stores the random JWT sid, not an access-token hash.
  @PrimaryColumn({ length: 64 }) tokenHash: string;
  @Column() memberId: number;
  @Column({ length: 64, nullable: true, unique: true }) refreshHash:
    | string
    | null;
  @Column({ type: 'datetime' }) expiresAt: Date;
}
