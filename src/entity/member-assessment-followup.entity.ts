import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { AssessmentAnswerDto } from '../assessment/assessment.dto';
import { AssessmentVersion } from './assessment-version.entity';
import { Member } from './user-mimate.entity';
import type { AssessmentResult } from './member-assessment.entity';

/** A single completed follow-up assessment (the 2-week and 4-week reassessments). */
@Entity('member_assessment_followups')
@Index(
  'idx_member_assessment_followups_member',
  ['memberId', 'followUpIndex'],
  {
    unique: true,
  },
)
export class MemberAssessmentFollowUp {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  memberId: number;

  @ManyToOne(() => Member, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'memberId' })
  member: Member;

  // 1 = two-week follow-up, 2 = four-week follow-up.
  @Column({ type: 'tinyint', unsigned: true })
  followUpIndex: number;

  @Column()
  versionId: number;

  @ManyToOne(() => AssessmentVersion, { nullable: false })
  @JoinColumn({ name: 'versionId' })
  version: AssessmentVersion;

  @Column({ type: 'json' })
  answers: AssessmentAnswerDto[];

  @Column({ type: 'json' })
  result: AssessmentResult;

  @Column({ type: 'datetime', precision: 3 })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
