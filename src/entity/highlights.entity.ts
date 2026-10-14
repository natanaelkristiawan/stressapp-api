import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
  } from 'typeorm';
  
  @Entity('highlights')
  export class Highlight {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column({ type: 'varchar', length: 100, nullable: true })
    name: string | null;
  
    @Column({ type: 'varchar', length: 191, nullable: true })
    image: string | null;
  
    @Column({ type: 'int', default: 0 })
    order: number;
  
    @Column({ type: 'varchar', length: 100, nullable: true })
    link: string | null;
  
    @Column({ name: 'need_token', type: 'tinyint', default: 0 })
    need_token: number;
  
    @CreateDateColumn({ name: 'created_at', type: 'timestamp', nullable:true })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable:true })
    updatedAt: Date;
  
    @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
    deletedAt: Date | null;
  }
  