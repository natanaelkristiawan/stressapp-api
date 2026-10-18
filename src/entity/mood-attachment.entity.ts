import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Member } from './user-mimate.entity';

@Entity('member_mood_attachments')
export class MoodAttachment {
  @PrimaryColumn({ length: 36 }) id: string;
  @Column() memberId: number;
  @ManyToOne(() => Member, { nullable: false })
  @JoinColumn({ name: 'memberId' })
  member: Member;
  @Column({ length: 5 }) type: 'photo' | 'audio';
  @Column({ length: 100 }) bucket: string;
  @Column({ length: 255 }) key: string;
  @Column({ length: 100 }) contentType: string;
  @Column({ type: 'int', unsigned: true }) size: number;
  @Column({ type: 'datetime', precision: 3 }) createdAt: Date;
}
