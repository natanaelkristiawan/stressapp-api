import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({
  name: 'interests',
  engine: 'InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin',
})
export class Interest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 64, unique: true, select: false })
  nameKey: string;

  @Column({ length: 500, default: '' })
  description: string;

  @Column({ type: 'int', unsigned: true, default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', unsigned: true, default: 1 })
  revision: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
