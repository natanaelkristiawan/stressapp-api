import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { NotificationType } from './member-notification.entity';

@Entity('notification_templates')
export class NotificationTemplate {
  @PrimaryColumn({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ length: 160 })
  title: string;

  @Column({ length: 1000 })
  body: string;

  @Column({ type: 'int', unsigned: true })
  revision: number;

  @CreateDateColumn({
    type: 'datetime',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'datetime',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
    onUpdate: 'CURRENT_TIMESTAMP(3)',
  })
  updatedAt: Date;
}
