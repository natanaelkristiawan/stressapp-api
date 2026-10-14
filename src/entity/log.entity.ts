// src/request-log/request-log.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('endpoint_logs')
export class RequestLogEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({nullable:true})
  method: string;

  @Column('text')
  url: string;

  @Index()
  @Column()
  controller: string;

  @Index()
  @Column()
  handler: string;

  @Column('json', { nullable: true })
  params: any;

  @Column('json', { nullable: true })
  query: any;

  @Column('json', { nullable: true })
  body: any;

  @Index()
  @Column({ nullable: true })
  statusCode: number;

  @Column({nullable:true})
  duration: string;

  @Column({ nullable: true })
  backup_member_id: number;

  @Index()
  @CreateDateColumn()
  createdAt: Date;
}
