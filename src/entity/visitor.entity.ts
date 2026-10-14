import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('visitors')
@Index(['date']) // Add index on date column for better performance
export class Visitor {
  @ApiProperty({ description: 'Unique identifier for the visitor' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Date of the visit', example: '2025-01-15' })
  @Column({ type: 'date' })
  date: Date;

  @ApiProperty({ description: 'Number of visitors for this date', example: 468 })
  @Column({ type: 'int', default: 0 })
  visitor: number;

  @ApiProperty({ description: 'Visitor synchronization status', example: true })
  @Column({ name: 'visitor_sync', type: 'boolean', default: true })
  visitorSync: boolean;

  @ApiProperty({ description: 'Timestamp when the record was created' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Timestamp when the record was last updated' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 