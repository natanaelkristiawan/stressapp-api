import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    UpdateDateColumn,
    OneToOne,
    JoinColumn,
    CreateDateColumn,
    Index,
} from 'typeorm';
import { UserMimateEntity } from './user-mimate.entity';

@Entity('quest_backup')
export class QuestBackup {
    @PrimaryGeneratedColumn()
    id?: number;

    @Index()
    @Column({ name: 'member_id' })
    memberId?: number | null;

    @OneToOne(() => UserMimateEntity)
    @JoinColumn({ name: 'member_id' })
    member?: UserMimateEntity;

    @Column({ name: 'year', default: 0, nullable: true })
    year: number;

    @Column({ name: 'month', default: 0, nullable: true })
    month: number;

    @Column({ name: 'total_points', default: 0 })
    totalPoints: number;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp', nullable: true })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: true })
    updatedAt: Date;



}
