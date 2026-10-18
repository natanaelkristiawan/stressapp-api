import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { AssessmentVersion } from './assessment-version.entity';

@Entity('assessment_settings')
export class AssessmentSettings {
  @PrimaryColumn({ type: 'tinyint' }) id: number;
  @Column({ type: 'int', nullable: true }) activeVersionId: number | null;
  @ManyToOne(() => AssessmentVersion, { nullable: true })
  @JoinColumn({ name: 'activeVersionId' })
  activeVersion: AssessmentVersion;
}
