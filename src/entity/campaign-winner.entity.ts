import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserMimateEntity } from './user-mimate.entity';

@Entity('campaign_winner')
@Index('IDX_campaign_winner_period_category', ['year', 'month', 'category'])
export class CampaignWinner {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ name: 'member_id', nullable: true })
  @Index('IDX_campaign_winner_member_id')
  member_id?: number;

  @ManyToOne(() => UserMimateEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'member_id' })
  member?: UserMimateEntity;

  @Column({ name: 'category', type: 'varchar', length: 100 })
  category: string;

  @Column({ name: 'month', type: 'int', default: 0 })
  month: number;

  @Column({ name: 'year', type: 'int', default: 0 })
  year: number;

  @Column({ name: 'total_points', type: 'int', default: 0 })
  total_points: number;

  @Column({ name: 'rank', type: 'int', default: 0 })
  rank: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', nullable: true })
  created_at?: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: true })
  updated_at?: Date;
}

export { CampaignWinner as CampaignWinnerEntity };
