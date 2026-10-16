import { Column, Entity, PrimaryColumn } from 'typeorm';

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
