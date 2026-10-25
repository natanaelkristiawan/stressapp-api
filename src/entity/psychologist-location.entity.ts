import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('psychologist_locations')
export class PsychologistLocation {
  @PrimaryGeneratedColumn() id: number;
  @Column({ length: 180 }) name: string;
  @Column({ length: 120 }) branch: string;
  @Index() @Column({ length: 80 }) city: string;
  @Column({ length: 2000 }) address: string;
  @Column({ length: 20 }) phone: string;
  @Column({ length: 12 }) contactType: 'whatsapp' | 'telephone';
  @Column({ length: 300, default: '' }) contactNotes: string;
  @Column({ length: 2048, default: '' }) website: string;
  @Column({ length: 10 }) serviceMode: 'onsite' | 'online';
  @Column({ type: 'double', nullable: true }) latitude: number | null;
  @Column({ type: 'double', nullable: true }) longitude: number | null;
  @Column({ length: 10, default: 'draft' }) status: 'draft' | 'published';
  @Index({ unique: true }) @Column({ length: 64 }) identityKey: string;
  @Column({ default: 1 }) revision: number;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
