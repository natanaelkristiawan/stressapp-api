import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    JoinColumn,
  } from 'typeorm';
  import { Quest } from './quest.entity';
  
  @Entity('quest_detail')
  export class QuestDetail {
    @PrimaryGeneratedColumn()
    id?: number;
  
    @Column({ type: 'varchar', length: 191 })
    parameter: string;
  
    @Column({ type: 'varchar', length: 50, nullable:true })
    aggregate: string; // consider renaming to 'aggregate' for clarity
  
    @Column({ type: 'int' })
    value: number;
  
    @Column({ type: 'varchar' })
    target: string;
  
    @ManyToOne(() => Quest, quest => quest.details,  { onDelete: 'CASCADE' })
    @JoinColumn({name:'questId'})
    quest: Quest;
  
    @CreateDateColumn({ type: 'timestamp', nullable: true })
    createdAt: Date;
  
    @UpdateDateColumn({ type: 'timestamp', nullable: true })
    updatedAt: Date;
  
    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt: Date;
  }
  