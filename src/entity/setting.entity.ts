import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('setting_config')
export class SettingEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'key', type: 'varchar', length: 191, unique: true })
  key: string;

  @Column({ name: 'value', type: 'longtext', nullable: true })
  value: string;

  @Column({ name: 'description', type: 'varchar', length: 255, nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', nullable: true })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: true })
  updatedAt: Date;
}

export { SettingEntity as Setting };
