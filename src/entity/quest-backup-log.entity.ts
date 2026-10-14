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

export enum Action {
    BACKUP = 'backup',
    RESET = 'reset',
}

@Entity('quest_backup_log')
export class QuestBackupLog {
    @PrimaryGeneratedColumn()
    id?: number;

    @Index()
    @Column({ name: 'year', default: 0, nullable: true })
    year: number;

    @Index()
    @Column({ name: 'month', default: 0, nullable: true })
    month: number;

    @Column({ name: 'action', nullable: true })
    action: Action;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp', nullable: true })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: true })
    updatedAt: Date;



}
