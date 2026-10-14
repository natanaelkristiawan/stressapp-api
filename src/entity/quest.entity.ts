import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { QuestDetail } from './quest-detail.entity';
import { UserMimateEntity } from './user-mimate.entity';
import { QuestPointDetail } from './quest-point-detail.entity';

@Entity('quest')
export class Quest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 191 })
  title: string;

  @Column({ type: 'varchar', length: 191 , nullable:true})
  image: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ['single', 'multiple'],
    default: 'single',
  })
  condition: 'single' | 'multiple';

  @Column({ type: 'varchar', length: 191, nullable: true })
  action: string;

  @Column({ type: 'int', nullable: true })
  point: number;

  @Column({
    type: 'enum',
    enum: ['daily', 'weekly', 'once'],
    default: 'daily',
  })
  interval: 'daily' | 'weekly' | 'once';

  @Column({ type: 'date', nullable: true })
  dateStart: Date;

  @Column({ type: 'date', nullable: true })
  dateEnd: Date;

  @Column({ type: 'tinyint', default: 0 })
  status: number;

  @CreateDateColumn({ type: 'timestamp', nullable: true })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date;

  @OneToMany(() => QuestDetail, detail => detail.quest)
  details: QuestDetail[];

  // createdBy Relation User
  @ManyToOne(() => UserMimateEntity, user => user.quests)
  @JoinColumn({ name: 'createdBy' })
  createdBy?: UserMimateEntity;

  @OneToMany(() => QuestPointDetail, (questPointDetail) => questPointDetail.quest)
  questPointDetails: QuestPointDetail[];

  @Column({ type: 'tinyint', default: 0 })
  isMain?: number;
}
