import { Column, Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Member } from './user-mimate.entity';

@Entity('member_sessions')
export class MemberSession {
  // Historical SQL column name: now stores the random JWT sid, not an access-token hash.
  @PrimaryColumn({ length: 64 }) tokenHash: string;
  @Column() memberId: number;
  @ManyToOne(() => Member, { nullable: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'memberId' }) member: Member;
  @Column({ length: 64, nullable: true, unique: true }) refreshHash:
    | string
    | null;
  @Column({ type: 'datetime' }) expiresAt: Date;
}
