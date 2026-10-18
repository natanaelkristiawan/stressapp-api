import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { AssessmentDefinitionDto } from '../assessment/assessment.dto';

@Entity('assessment_versions')
export class AssessmentVersion {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'json' }) definition: AssessmentDefinitionDto;
  @Column({ default: 1 }) revision: number;
  @Column() createdBy: number;
  @Column({ type: 'int', nullable: true }) publishedBy: number | null;
  @Column({ type: 'datetime', precision: 3 }) createdAt: Date;
  @Column({ type: 'datetime', precision: 3 }) updatedAt: Date;
  @Column({ type: 'datetime', precision: 3, nullable: true })
  publishedAt: Date | null;
}
