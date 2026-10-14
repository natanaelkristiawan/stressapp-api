import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('log_last_active_manual')
export class LogLastActiveManual {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ name: 'member_id' })
  @Index('IDX_log_last_active_manual_member_id')
  member_id: number;

  @Column({ name: 'last_active', type: 'datetime', nullable: true })
  @Index('IDX_log_last_active_manual_last_active')
  last_active?: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at?: Date;
}
