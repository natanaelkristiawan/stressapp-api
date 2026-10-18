import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import type { AssessmentAnswerDto } from '../assessment/assessment.dto';
import { AssessmentVersion } from './assessment-version.entity';
import { Member } from './user-mimate.entity';

export interface AssessmentResult {
  score: number;
  maxScore: number;
  categoryId: string;
  category: string;
  interpretation: string;
}

@Entity('member_assessments')
export class MemberAssessment {
  @PrimaryColumn() memberId: number;
  @ManyToOne(() => Member, { nullable: false })
  @JoinColumn({ name: 'memberId' })
  member: Member;
  @Column({ type: 'tinyint', unsigned: true }) initialMoodScore: number;
  @Column({ type: 'datetime', precision: 3 }) moodSubmittedAt: Date;
  @Column({ type: 'int', nullable: true }) versionId: number | null;
  @ManyToOne(() => AssessmentVersion, { nullable: true })
  @JoinColumn({ name: 'versionId' })
  version: AssessmentVersion;
  @Column({ type: 'json', nullable: true }) answers:
    | AssessmentAnswerDto[]
    | null;
  @Column({ type: 'json', nullable: true }) result: AssessmentResult | null;
  @Column({ type: 'datetime', precision: 3, nullable: true })
  completedAt: Date | null;
}
