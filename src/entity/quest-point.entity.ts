import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    UpdateDateColumn,
    OneToOne,
    JoinColumn,
  } from 'typeorm';
  import { UserMimateEntity } from './user-mimate.entity'; 
  
  @Entity('quest_points')
  export class QuestPoint {
    @PrimaryGeneratedColumn()
    id?: number;
  
    @Column({ name: 'member_id' })
    memberId?: number|null;
  
    @OneToOne(() => UserMimateEntity, (user) => user.questPoint)
    @JoinColumn({ name: 'member_id' })
    member?: UserMimateEntity;
  
    @Column({ name: 'total_points', default: 0 })
    totalPoints: number;
  
    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: true })
    updatedAt: Date;
    
    
    
  }
    