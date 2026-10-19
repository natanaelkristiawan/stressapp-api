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
  AssessmentHistoryDto,
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

  /** Scopes read-only history to completed current mobile accounts, including suspended members. Returns the common SQL builder. */
  private historyScope() {
    return this.db
      .getRepository(MemberAssessment)
      .createQueryBuilder('entry')
      .innerJoin(Member, 'member', 'member.id = entry.memberId')
      .where('entry.completedAt IS NOT NULL')
      .andWhere('member.memberAuthEnabled = :enabled', { enabled: true })
      .andWhere('member.deleted_at IS NULL')
      .andWhere(
        'NOT EXISTS (SELECT 1 FROM users staff WHERE staff.backup_member_id = member.id)',
      );
  }

  /** Lists completed assessments using UTC completion dates and bounded server sorting/filtering. Returns no answer text in list rows. */
  async history(query: AssessmentHistoryDto) {
    const days = (Date.parse(query.to) - Date.parse(query.from)) / 86400000 + 1;
    if (!Number.isInteger(days) || days < 1 || days > 366) {
      throw new BadRequestException(
        'Choose an ordered range of at most 366 days.',
      );
    }
    const until = new Date(Date.parse(query.to) + 86400000);
    const builder = this.historyScope().andWhere(
      'entry.completedAt >= :from AND entry.completedAt < :until',
      {
        from: new Date(query.from),
        until,
      },
    );
    if (query.name) {
      builder.andWhere('LOCATE(:name, LOWER(member.name)) > 0', {
        name: query.name.toLowerCase(),
      });
    }
    const total = await builder.getCount();
    const sort = {
      memberName: 'member.name',
      completedAt: 'entry.completedAt',
      score:
        "CAST(JSON_UNQUOTE(JSON_EXTRACT(entry.result, '$.score')) AS UNSIGNED)",
    };
    const records = await builder
      .select('entry')
      .addSelect('member.name', 'memberName')
      .orderBy(sort[query.sortBy], query.sortOrder === 'asc' ? 'ASC' : 'DESC')
      .addOrderBy('entry.memberId', 'DESC')
      .offset((query.page - 1) * query.pageSize)
      .limit(query.pageSize)
      .getRawAndEntities<{ memberName: string | null }>();
    return {
      items: records.entities.map((entry, index) => ({
        id: String(entry.memberId),
        memberName: records.raw[index].memberName || 'Unnamed member',
        versionId: entry.versionId,
        completedAt: entry.completedAt.toISOString(),
        score: entry.result.score,
        maxScore: entry.result.maxScore,
        category: entry.result.category,
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /** Loads immutable submitted answers and their original scoring direction. Returns read-only member detail or 404. */
  async historyDetail(memberId: number) {
    const record = await this.historyScope()
      .andWhere('entry.memberId = :memberId', { memberId })
      .select('entry')
      .addSelect('member.name', 'memberName')
      .getRawAndEntities<{ memberName: string | null }>();
    const entry = record.entities[0];
    if (!entry) {
      throw new NotFoundException('Assessment submission not found.');
    }
    const version = await this.findVersion(this.db.manager, entry.versionId);
    return {
      id: String(entry.memberId),
      memberName: record.raw[0].memberName || 'Unnamed member',
      versionId: entry.versionId,
      title: version.definition.title,
      completedAt: entry.completedAt.toISOString(),
      result: entry.result,
      answers: version.definition.questions.map((question) => {
        const answer = entry.answers.find(
          (item) => item.questionId === question.id,
        );
        const option = question.options.find(
          (item) => item.value === answer.value,
        );
        return {
          questionId: question.id,
          question: question.text,
          answer: option.label,
          value: answer.value,
          points: question.reverseScored ? 5 - answer.value : answer.value,
          reverseScored: question.reverseScored,
        };
      }),
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
    if (input.scoringApproved !== true) {
      throw new BadRequestException('Scoring approval is required.');
    }
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
      ) {
        return this.versionView(version);
      }
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
    if (!version) {
      throw new NotFoundException('Questionnaire version not found.');
    }
    return version;
  }

  /** Enforces immutable publications and optimistic edits. Returns nothing or a conflict. */
  private requireDraft(version: AssessmentVersion, revision: number): void {
    if (version.publishedAt || version.revision !== revision) {
      throw new ConflictException(
        'Version is published or has changed. Reload and create a new draft if needed.',
      );
    }
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
    ) {
      throw new UnauthorizedException('Sesi tidak valid.');
    }
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
      if (entry?.completedAt) {
        throw new ConflictException('Initial assessment is already complete.');
      }
      if (!entry) {
        entry = manager.create(MemberAssessment, {
          memberId,
          versionId: null,
          answers: null,
          result: null,
          completedAt: null,
        });
      }
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
      if (!entry) {
        throw new BadRequestException('Complete the initial mood step first.');
      }
      if (entry.completedAt) {
        if (
          entry.versionId !== input.versionId ||
          !sameAnswers(entry.answers, input.answers)
        ) {
          throw new ConflictException(
            'Initial assessment is already complete.',
          );
        }
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
      if (!settings?.activeVersionId) {
        throw new ServiceUnavailableException(
          'Assessment is not configured yet.',
        );
      }
      if (settings.activeVersionId !== input.versionId) {
        throw new ConflictException(
          'Questionnaire changed. Reload the current version before submitting.',
        );
      }
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
