import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { AssessmentVersion } from '../entity/assessment-version.entity';
import { AssessmentSettings } from '../entity/assessment-settings.entity';
import { MemberAssessment } from '../entity/member-assessment.entity';
import { Member } from '../entity/user-mimate.entity';
import {
  AssessmentDefinitionDto,
  AssessmentListDto,
  EditAssessmentDto,
  InitialMoodDto,
  PublishAssessmentDto,
  SubmitAssessmentDto,
} from './assessment.dto';
import {
  sameAnswers,
  scoreAssessment,
  validateDefinition,
} from './assessment.rules';

@Injectable()
export class AssessmentService {
  /** Injects the existing datasource. Returns questionnaire and baseline assessment operations. */
  constructor(@InjectDataSource('mimate') private readonly db: DataSource) {}

  /** Copies only approved configuration fields. Returns a definition without request metadata. */
  private definition(input: AssessmentDefinitionDto): AssessmentDefinitionDto {
    return {
      title: input.title,
      disclaimer: input.disclaimer,
      sourceReference: input.sourceReference,
      scoringNotes: input.scoringNotes,
      questions: input.questions,
      categories: input.categories,
    };
  }

  /** Maps safe CMS configuration fields. Returns version metadata without member responses. */
  private versionView(version: AssessmentVersion) {
    return {
      id: version.id,
      revision: version.revision,
      definition: version.definition,
      status: version.publishedAt ? 'published' : 'draft',
      createdAt: version.createdAt.toISOString(),
      updatedAt: version.updatedAt.toISOString(),
      publishedAt: version.publishedAt?.toISOString() ?? null,
    };
  }

  /** Loads a bounded version list. Returns metadata and the currently selected published version ID. */
  async list(query: AssessmentListDto) {
    const [versions, total] = await this.db
      .getRepository(AssessmentVersion)
      .findAndCount({
        order: { id: 'DESC' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: ['id', 'revision', 'publishedAt', 'createdAt', 'updatedAt'],
      });
    const settings = await this.db
      .getRepository(AssessmentSettings)
      .findOneBy({ id: 1 });
    return {
      items: versions.map((v) => ({
        id: v.id,
        revision: v.revision,
        status: v.publishedAt ? 'published' : 'draft',
        createdAt: v.createdAt.toISOString(),
        updatedAt: v.updatedAt.toISOString(),
        publishedAt: v.publishedAt?.toISOString() ?? null,
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
      activeVersionId: settings?.activeVersionId ?? null,
    };
  }

  /** Loads one questionnaire configuration. Returns 404 for an unknown version. */
  async detail(id: number) {
    return this.versionView(await this.findVersion(this.db.manager, id));
  }

  /** Creates a validated unpublished version. Returns its editable configuration. */
  async create(input: AssessmentDefinitionDto, adminId: number) {
    validateDefinition(input);
    const repository = this.db.getRepository(AssessmentVersion);
    const now = new Date();
    return this.versionView(
      await repository.save(
        repository.create({
          definition: this.definition(input),
          revision: 1,
          createdBy: adminId,
          createdAt: now,
          updatedAt: now,
          publishedAt: null,
          publishedBy: null,
        }),
      ),
    );
  }

  /** Replaces a draft under a row lock and revision check. Returns the new revision. */
  async edit(id: number, input: EditAssessmentDto) {
    validateDefinition(input);
    return this.db.transaction(async (manager) => {
      const version = await this.findVersion(manager, id, true);
      this.requireDraft(version, input.revision);
      version.definition = this.definition(input);
      version.revision++;
      version.updatedAt = new Date();
      return this.versionView(await manager.save(version));
    });
  }

  /** Publishes an explicitly approved draft atomically. Returns an immutable active version. */
  async publish(id: number, input: PublishAssessmentDto, adminId: number) {
    if (input.scoringApproved !== true)
      throw new BadRequestException('Scoring approval is required.');
    return this.db.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .insert()
        .into(AssessmentSettings)
        .values({ id: 1, activeVersionId: null })
        .orIgnore()
        .execute();
      const settings = await manager.findOne(AssessmentSettings, {
        where: { id: 1 },
        lock: { mode: 'pessimistic_write' },
      });
      const version = await this.findVersion(manager, id, true);
      // A transport retry must not reactivate an older instrument.
      if (
        version.publishedAt &&
        settings.activeVersionId === id &&
        version.revision === input.revision + 1
      )
        return this.versionView(version);
      this.requireDraft(version, input.revision);
      validateDefinition(version.definition);
      version.publishedAt = new Date();
      version.updatedAt = version.publishedAt;
      version.publishedBy = adminId;
      version.revision++;
      await manager.save(version);
      settings.activeVersionId = id;
      await manager.save(settings);
      return this.versionView(version);
    });
  }

  /** Loads a version, optionally locking edits. Returns its entity or a safe 404. */
  private async findVersion(manager: EntityManager, id: number, lock = false) {
    const version = await manager.findOne(AssessmentVersion, {
      where: { id },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (!version)
      throw new NotFoundException('Questionnaire version not found.');
    return version;
  }

  /** Enforces immutable publications and optimistic edits. Returns nothing or a conflict. */
  private requireDraft(version: AssessmentVersion, revision: number): void {
    if (version.publishedAt || version.revision !== revision)
      throw new ConflictException(
        'Version is published or has changed. Reload and create a new draft if needed.',
      );
  }

  /** Locks a member against concurrent baseline writes/account suspension. Returns nothing or unauthorized. */
  private async lockMember(
    manager: EntityManager,
    memberId: number,
  ): Promise<void> {
    const member = await manager.findOne(Member, {
      where: { id: memberId },
      lock: { mode: 'pessimistic_write' },
    });
    if (
      !member ||
      !member.memberAuthEnabled ||
      !member.verifiedAt ||
      member.is_suspended
    )
      throw new UnauthorizedException('Sesi tidak valid.');
  }

  /** Maps the immutable instrument for mobile display. Returns no CMS-only notes or scoring controls. */
  private questionnaire(version: AssessmentVersion) {
    return {
      versionId: version.id,
      title: version.definition.title,
      disclaimer: version.definition.disclaimer,
      questions: version.definition.questions.map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options,
      })),
    };
  }

  /** Restores server-owned progress and historical results. Returns the next required step, including unavailable state. */
  async status(memberId: number) {
    const entry = await this.db
      .getRepository(MemberAssessment)
      .findOneBy({ memberId });
    const settings = await this.db
      .getRepository(AssessmentSettings)
      .findOneBy({ id: 1 });
    const versionId = entry?.versionId ?? settings?.activeVersionId;
    const version = versionId
      ? await this.findVersion(this.db.manager, versionId)
      : null;
    return {
      completed: Boolean(entry?.completedAt),
      nextStep: entry?.completedAt
        ? 'home'
        : !entry
        ? 'mood'
        : !version
        ? 'unavailable'
        : 'assessment',
      initialMood: entry
        ? {
            score: entry.initialMoodScore,
            submittedAt: entry.moodSubmittedAt.toISOString(),
            feedbackType:
              entry.initialMoodScore >= 3 ? 'positive' : 'empathetic',
          }
        : null,
      questionnaire: version ? this.questionnaire(version) : null,
      result: entry?.result ?? null,
      completedAt: entry?.completedAt?.toISOString() ?? null,
    };
  }

  /** Saves only the onboarding mood, separate from daily records. Returns its server timestamp and feedback type. */
  async saveMood(memberId: number, input: InitialMoodDto) {
    return this.db.transaction(async (manager) => {
      await this.lockMember(manager, memberId);
      let entry = await manager.findOneBy(MemberAssessment, { memberId });
      if (entry?.completedAt)
        throw new ConflictException('Initial assessment is already complete.');
      if (!entry)
        entry = manager.create(MemberAssessment, {
          memberId,
          versionId: null,
          answers: null,
          result: null,
          completedAt: null,
        });
      if (entry.initialMoodScore !== input.score) {
        entry.initialMoodScore = input.score;
        entry.moodSubmittedAt = new Date();
        await manager.save(entry);
      }
      return {
        score: entry.initialMoodScore,
        submittedAt: entry.moodSubmittedAt.toISOString(),
        feedbackType: entry.initialMoodScore >= 3 ? 'positive' : 'empathetic',
      };
    });
  }

  /** Saves one baseline under a member lock. Returns the same result for identical retries; rejects changed replays. */
  async submit(memberId: number, input: SubmitAssessmentDto) {
    return this.db.transaction(async (manager) => {
      await this.lockMember(manager, memberId);
      const entry = await manager.findOneBy(MemberAssessment, { memberId });
      if (!entry)
        throw new BadRequestException('Complete the initial mood step first.');
      if (entry.completedAt) {
        if (
          entry.versionId !== input.versionId ||
          !sameAnswers(entry.answers, input.answers)
        )
          throw new ConflictException(
            'Initial assessment is already complete.',
          );
        return {
          versionId: entry.versionId,
          result: entry.result,
          completedAt: entry.completedAt.toISOString(),
        };
      }
      // Shared lock permits concurrent members; publication waits until accepted submissions commit.
      const settings = await manager.findOne(AssessmentSettings, {
        where: { id: 1 },
        lock: { mode: 'pessimistic_read' },
      });
      if (!settings?.activeVersionId)
        throw new ServiceUnavailableException(
          'Assessment is not configured yet.',
        );
      if (settings.activeVersionId !== input.versionId)
        throw new ConflictException(
          'Questionnaire changed. Reload the current version before submitting.',
        );
      const version = await this.findVersion(manager, input.versionId);
      entry.result = scoreAssessment(version.definition, input.answers);
      entry.answers = version.definition.questions.map((q) =>
        input.answers.find((a) => a.questionId === q.id),
      );
      entry.versionId = version.id;
      entry.completedAt = new Date();
      await manager.save(entry);
      return {
        versionId: entry.versionId,
        result: entry.result,
        completedAt: entry.completedAt.toISOString(),
      };
    });
  }
}
