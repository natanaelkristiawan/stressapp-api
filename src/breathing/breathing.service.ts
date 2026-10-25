import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { BreathingExercise } from '../entity/breathing-exercise.entity';
import { BreathingPage } from '../entity/breathing-page.entity';
import { BreathingSession } from '../entity/breathing-session.entity';
import { Activity } from '../entity/activity.entity';
import { Member } from '../entity/user-mimate.entity';
import { AssetsEntity } from '../entity/asset.entity';
import { UserAdmin } from '../entity/user-admin.entity';
import {
  BreathingListDto,
  BreathingPageDto,
  BreathingReportDto,
  EndBreathingDto,
  SaveExerciseDto,
  StartBreathingDto,
  UpdateExerciseDto,
} from './breathing.dto';

/** Rejects impossible calendar dates and bounds UTC-inclusive reporting to 366 days. */
export function breathingRange(from: string, to: string) {
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    start.toISOString().slice(0, 10) !== from ||
    end.toISOString().slice(0, 10) !== to ||
    end.getTime() < start.getTime() ||
    end.getTime() - start.getTime() > 365 * 86400000
  ) {
    throw new BadRequestException('Select a valid range of 1–366 UTC days.');
  }
  return { start, end: new Date(end.getTime() + 86400000) };
}

/** Validates a terminal report; completion is a timer report, not verified physical participation. */
export function validateBreathingEnd(
  session: BreathingSession,
  input: EndBreathingDto,
  now = new Date(),
) {
  if (
    input.elapsedSeconds > session.durationSeconds ||
    input.elapsedSeconds * 1000 >
      now.getTime() - session.startedAt.getTime() + 1000
  ) {
    throw new BadRequestException('Invalid exercise duration.');
  }
  if (
    input.status === 'completed' &&
    input.elapsedSeconds !== session.durationSeconds
  ) {
    throw new BadRequestException('The exercise timer has not finished.');
  }
}

@Injectable()
export class BreathingService implements OnModuleInit {
  constructor(@InjectDataSource('mimate') private readonly db: DataSource) {}

  /** Seeds the existing mobile defaults once; insert-ignore never replaces CMS edits. */
  async onModuleInit() {
    const page = {
      title: 'Latihan Pernapasan',
      subtitle: 'Pilih latihan pernapasan yang cocok untuk Anda',
      educationTitle: 'Mengapa Pengaturan Napas Sangat Penting?',
      educationBody:
        'Saat merasa cemas atau kewalahan, luangkan waktu untuk memperhatikan napas Anda. Ikuti irama latihan dengan perlahan dan pilih pola yang terasa nyaman.\n\nMemusatkan Kembali Pikiran (Grounding & Focus): Arahkan perhatian pada irama napas dan momen saat ini.\n\nBerlatih dengan Nyaman: Ambil posisi yang nyaman dan bernapas tanpa memaksakan diri. Anda dapat menjeda latihan kapan saja.',
      preparationTitle: 'Sebelum Anda Memulai Latihan Pernapasan',
      preparationBody:
        'Mari pusatkan perhatian dan kembalikan ketenanganmu bersama TemuSOBAT. Pelajari cara kerja setiap latihan pernapasan dan dapatkan kiat yang membantu Anda berlatih. Pilihlah metode latihan pernapasan yang membuat Anda nyaman.',
      durationOptions: [1, 3, 5, 10],
      defaultDuration: 3,
    };
    await this.db.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .insert()
        .into(BreathingPage)
        .values({ id: 1, revision: 1, content: page })
        .orIgnore()
        .execute();
      const patterns = [
        {
          id: 1,
          title: 'Teknik Pernapasan 4-4-4-4',
          tag: 'Relaksasi',
          description:
            'Hirup 4 detik • Tahan 4 detik • Hembuskan 4 detik • Tahan 4 detik',
          inhaleSeconds: 4,
          hold1Seconds: 4,
          exhaleSeconds: 4,
          hold2Seconds: 4,
          artwork: 'relaxation' as const,
          themeColor: '#F2703D',
          steps: [
            'Tarik napas melalui hidung hingga hitungan ke empat',
            'Kemudian tahan napas hingga hitungan ke empat',
            'Keluarkan napas melalui mulut hingga hitungan ke empat',
            'Kemudian tahan napas kembali hingga hitungan ke empat',
          ],
        },
        {
          id: 2,
          title: 'Teknik Pernapasan 4-7-8',
          tag: 'Tidur',
          description: 'Hirup 4 detik • Tahan 7 detik • Hembuskan 8 detik',
          inhaleSeconds: 4,
          hold1Seconds: 7,
          exhaleSeconds: 8,
          hold2Seconds: 0,
          artwork: 'sleep' as const,
          themeColor: '#2B5797',
          steps: [
            'Tarik napas lembut melalui hidung selama 4 detik',
            'Tahan napas Anda selama 7 detik',
            'Hembuskan napas perlahan melalui mulut selama 8 detik',
            'Ulangi siklus ini hingga tubuh merasa rileks dan mengantuk',
          ],
        },
        {
          id: 3,
          title: 'Resonant Breathing 5-5',
          tag: 'Keseimbangan',
          description: 'Hirup 5 detik • Hembuskan 5 detik',
          inhaleSeconds: 5,
          hold1Seconds: 0,
          exhaleSeconds: 5,
          hold2Seconds: 0,
          artwork: 'balance' as const,
          themeColor: '#B45309',
          steps: [
            'Tarik napas perlahan melalui hidung selama 5 detik',
            'Hembuskan napas lembut melalui hidung atau mulut selama 5 detik',
            'Jaga irama napas yang terasa nyaman',
          ],
        },
      ];
      await manager
        .createQueryBuilder()
        .insert()
        .into(BreathingExercise)
        .values(
          patterns.map((exercise) => ({
            ...exercise,
            imageUrl: null,
            guideImageUrl: null,
            sortOrder: exercise.id,
            revision: 1,
            status: 'published',
          })),
        )
        .orIgnore()
        .execute();
    });
  }

  /** Maps safe exercise fields; pattern labels always follow the numeric phases. */
  private exerciseView(exercise: BreathingExercise) {
    const {
      id,
      title,
      tag,
      description,
      steps,
      inhaleSeconds,
      hold1Seconds,
      exhaleSeconds,
      hold2Seconds,
      themeColor,
      artwork,
      imageUrl,
      guideImageUrl,
      sortOrder,
      status,
      revision,
      createdAt,
      updatedAt,
    } = exercise;
    return {
      id,
      title,
      tag,
      description,
      steps,
      inhaleSeconds,
      hold1Seconds,
      exhaleSeconds,
      hold2Seconds,
      themeColor,
      artwork,
      imageUrl,
      guideImageUrl,
      sortOrder,
      status,
      revision,
      createdAt,
      updatedAt,
      slug: [inhaleSeconds, hold1Seconds, exhaleSeconds, hold2Seconds]
        .filter((value) => value > 0)
        .join('-'),
    };
  }

  /** Returns an owned session snapshot without exposing internal retry keys or joined entities. */
  private sessionView(session: BreathingSession) {
    const {
      id,
      exerciseId,
      snapshot,
      durationSeconds,
      elapsedSeconds,
      status,
      startedAt,
      endedAt,
    } = session;
    return {
      id,
      exerciseId,
      snapshot,
      durationSeconds,
      elapsedSeconds,
      status,
      startedAt,
      endedAt,
    };
  }

  /** Returns the shared landing text and allowed session durations. */
  async page() {
    const page = await this.db
      .getRepository(BreathingPage)
      .findOneByOrFail({ id: 1 });
    return { ...page.content, revision: page.revision };
  }

  /** Saves page settings under a revision lock and audits the actor without copying content. */
  async savePage(input: BreathingPageDto, actorId: number) {
    if (!input.durationOptions.includes(input.defaultDuration)) {
      throw new BadRequestException(
        'Default duration must be an available option.',
      );
    }
    return this.db.transaction(async (manager) => {
      const page = await manager
        .getRepository(BreathingPage)
        .findOne({ where: { id: 1 }, lock: { mode: 'pessimistic_write' } });
      if (page.revision !== input.revision) {
        throw new ConflictException(
          'Page settings changed. Reload before saving.',
        );
      }
      const { revision, ...content } = input;
      page.content = content;
      page.revision = revision + 1;
      await manager.save(page);
      await this.audit(manager, actorId, 'breathing-page-edit');
      return { ...content, revision: page.revision };
    });
  }

  /** Lists all published exercises for members in deterministic CMS order. */
  async catalog() {
    const exercises = await this.db.getRepository(BreathingExercise).find({
      where: { status: 'published' },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    return {
      page: await this.page(),
      exercises: exercises.map((exercise) => this.exerciseView(exercise)),
    };
  }

  /** Provides a bounded server-paginated CMS list with literal search. */
  async list(query: BreathingListDto) {
    const builder = this.db
      .getRepository(BreathingExercise)
      .createQueryBuilder('exercise');
    if (query.search) {
      builder.andWhere('LOCATE(:search, exercise.title) > 0', {
        search: query.search,
      });
    }
    const sort = {
      title: 'exercise.title',
      sortOrder: 'exercise.sortOrder',
      updatedAt: 'exercise.updatedAt',
    }[query.sort];
    const [items, total] = await builder
      .orderBy(sort, query.order === 'asc' ? 'ASC' : 'DESC')
      .addOrderBy('exercise.id', 'ASC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();
    return {
      items: items.map((exercise) => this.exerciseView(exercise)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /** Returns a current CMS exercise or a deliberate 404. */
  async detail(id: number) {
    const exercise = await this.db
      .getRepository(BreathingExercise)
      .findOneBy({ id });
    if (!exercise) {
      throw new NotFoundException('Exercise not found.');
    }
    return this.exerciseView(exercise);
  }

  /** Soft deletes under a revision lock; related rows and history remain stored. */
  async remove(id: number, revision: number, actorId: number) {
    return this.db.transaction(async (manager) => {
      const repository = manager.getRepository(BreathingExercise);
      const record = await repository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!record) {
        throw new NotFoundException('Exercise not found.');
      }
      if (record.revision !== revision) {
        throw new ConflictException(
          'This record changed. Reload before deleting.',
        );
      }
      record.revision += 1;
      record.status = 'draft';
      await repository.save(record);
      await repository.softDelete(id);
      await manager.getRepository(Activity).save({
        action: 'breathing-exercise-delete',
        source: 'cms-breathing',
        userId: actorId,
        message: JSON.stringify({ recordId: id, revision: record.revision }),
      });
      return { id };
    });
  }
  /** Requires CMS-uploaded images, using the same asset eligibility as article uploads. */
  private async validateImages(manager: EntityManager, input: SaveExerciseDto) {
    for (const url of [input.imageUrl, input.guideImageUrl]) {
      if (!url) {
        continue;
      }
      const asset = await manager
        .getRepository(AssetsEntity)
        .createQueryBuilder('asset')
        .innerJoin(
          UserAdmin,
          'admin',
          'admin.backup_member_id = asset.memberId',
        )
        .where('asset.url_open = :url AND asset.type = :type', {
          url,
          type: 'Image',
        })
        .getOne();
      if (!asset?.path || !asset.contentType) {
        throw new BadRequestException(
          'Select an image uploaded through the CMS.',
        );
      }
    }
  }

  /** Creates/replaces an exercise transactionally; unpublishing retains session history. */
  async save(
    input: SaveExerciseDto | UpdateExerciseDto,
    actorId: number,
    id?: number,
  ) {
    return this.db.transaction(async (manager) => {
      const repository = manager.getRepository(BreathingExercise);
      let exercise = repository.create();
      if (id !== undefined) {
        exercise = await repository.findOne({
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!exercise) {
          throw new NotFoundException('Exercise not found.');
        }
        if (!('revision' in input) || input.revision !== exercise.revision) {
          throw new ConflictException(
            'Exercise changed. Reload before saving.',
          );
        }
      }
      await this.validateImages(manager, input);
      const revision = id ? exercise.revision + 1 : 1;
      const {
        title,
        tag,
        description,
        steps,
        inhaleSeconds,
        hold1Seconds,
        exhaleSeconds,
        hold2Seconds,
        artwork,
        themeColor,
        imageUrl,
        guideImageUrl,
        sortOrder,
        status,
      } = input;
      Object.assign(exercise, {
        title,
        tag,
        description,
        steps,
        inhaleSeconds,
        hold1Seconds,
        exhaleSeconds,
        hold2Seconds,
        artwork,
        themeColor,
        imageUrl,
        guideImageUrl,
        sortOrder,
        status,
        revision,
      });
      await repository.save(exercise);
      await this.audit(
        manager,
        actorId,
        id ? 'breathing-exercise-edit' : 'breathing-exercise-create',
      );
      return this.exerciseView(exercise);
    });
  }

  /** Reuses activity_logs with a session FK; avoids legacy notification/reward side effects. */
  private async audit(
    manager: EntityManager,
    userId: number,
    action: string,
    sessionId?: string,
  ) {
    await manager.getRepository(Activity).save({
      userId,
      action,
      targetType: 'breathing',
      source: 'breathing',
      breathingSessionId: sessionId ?? null,
    });
  }

  /** Starts exactly one session per member/request UUID; locks the member to serialize retries. */
  async start(memberId: number, input: StartBreathingDto) {
    return this.db.transaction(async (manager) => {
      await manager.getRepository(Member).findOneOrFail({
        where: { id: memberId },
        lock: { mode: 'pessimistic_write' },
      });
      const repository = manager.getRepository(BreathingSession);
      const replay = await repository.findOneBy({
        memberId,
        requestId: input.requestId,
      });
      if (replay) {
        if (
          replay.memberId !== memberId ||
          replay.exerciseId !== input.exerciseId ||
          replay.durationSeconds !== input.durationMinutes * 60
        ) {
          throw new ConflictException('Session request already used.');
        }
        return this.sessionView(replay);
      }
      const exercise = await manager.getRepository(BreathingExercise).findOne({
        where: { id: input.exerciseId, status: 'published' },
        lock: { mode: 'pessimistic_read' },
      });
      if (!exercise) {
        throw new NotFoundException('Exercise unavailable.');
      }
      const page = await manager
        .getRepository(BreathingPage)
        .findOneByOrFail({ id: 1 });
      if (!page.content.durationOptions.includes(input.durationMinutes)) {
        throw new BadRequestException(
          'Duration unavailable. Reload exercises.',
        );
      }
      const {
        title,
        inhaleSeconds,
        hold1Seconds,
        exhaleSeconds,
        hold2Seconds,
      } = exercise;
      const session = repository.create({
        id: randomUUID(),
        requestId: input.requestId,
        memberId,
        exerciseId: exercise.id,
        durationSeconds: input.durationMinutes * 60,
        snapshot: {
          title,
          inhaleSeconds,
          hold1Seconds,
          exhaleSeconds,
          hold2Seconds,
        },
        elapsedSeconds: 0,
        status: 'in_progress',
        startedAt: new Date(),
        endedAt: null,
      });
      await repository.save(session);
      await this.audit(manager, memberId, 'breathing-started', session.id);
      return this.sessionView(session);
    });
  }

  /** Applies one owned terminal report atomically and rejects conflicting/early replays. */
  async end(memberId: number, id: string, input: EndBreathingDto) {
    return this.db.transaction(async (manager) => {
      const repository = manager.getRepository(BreathingSession);
      const session = await repository.findOne({
        where: { id, memberId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!session) {
        throw new NotFoundException('Session not found.');
      }
      if (session.status !== 'in_progress') {
        if (
          session.status !== input.status ||
          session.elapsedSeconds !== input.elapsedSeconds
        ) {
          throw new ConflictException('Session already ended.');
        }
        return this.sessionView(session);
      }
      validateBreathingEnd(session, input);
      session.status = input.status;
      session.elapsedSeconds = input.elapsedSeconds;
      session.endedAt = new Date();
      await repository.save(session);
      await this.audit(
        manager,
        memberId,
        `breathing-${input.status}`,
        session.id,
      );
      return this.sessionView(session);
    });
  }

  /** Builds the shared report cohort by UTC start date; never counts activity event rows. */
  private reportQuery(query: BreathingReportDto) {
    const { start, end } = breathingRange(query.from, query.to);
    const cutoff = new Date(Date.now() - 86400000);
    const status =
      "CASE WHEN session.status = 'in_progress' AND session.startedAt < :cutoff THEN 'unconfirmed' ELSE session.status END";
    const builder = this.db
      .getRepository(BreathingSession)
      .createQueryBuilder('session')
      .innerJoin('session.member', 'member')
      .where('session.startedAt >= :start AND session.startedAt < :end', {
        start,
        end,
      })
      .setParameter('cutoff', cutoff);
    if (query.search) {
      builder.andWhere(
        '(LOCATE(:search, member.name) > 0 OR LOCATE(:search, member.username) > 0)',
        { search: query.search },
      );
    }
    if (query.exerciseId) {
      builder.andWhere('session.exerciseId = :exerciseId', {
        exerciseId: query.exerciseId,
      });
    }
    if (query.status) {
      builder.andWhere(`${status} = :status`, { status: query.status });
    }
    return { builder, status };
  }

  /** Returns one CMS row per session and safe member labels, with bounded remote sorting. */
  async history(query: BreathingReportDto) {
    const { builder, status } = this.reportQuery(query);
    const total = await builder.getCount();
    const sort = {
      startedAt: 'session.startedAt',
      title: "JSON_UNQUOTE(JSON_EXTRACT(session.snapshot, '$.title'))",
      memberName: 'member.name',
      durationSeconds: 'session.durationSeconds',
    }[query.sort];
    const rows = await builder
      .select([
        'session.id AS id',
        'session.memberId AS memberId',
        'member.name AS memberName',
        'member.username AS username',
        'session.exerciseId AS exerciseId',
        'session.snapshot AS snapshot',
        'session.durationSeconds AS durationSeconds',
        'session.elapsedSeconds AS elapsedSeconds',
        'session.startedAt AS startedAt',
        'session.endedAt AS endedAt',
      ])
      .addSelect(status, 'status')
      .orderBy(sort, query.order === 'asc' ? 'ASC' : 'DESC')
      .addOrderBy('session.id', 'ASC')
      .offset((query.page - 1) * query.pageSize)
      .limit(query.pageSize)
      .getRawMany<{
        id: string;
        memberId: number;
        memberName: string | null;
        username: string | null;
        exerciseId: number;
        snapshot: BreathingSession['snapshot'] | string;
        durationSeconds: number;
        elapsedSeconds: number;
        startedAt: Date;
        endedAt: Date | null;
        status: string;
      }>();
    return {
      items: rows.map((row) => ({
        ...row,
        snapshot:
          typeof row.snapshot === 'string'
            ? (JSON.parse(row.snapshot) as BreathingSession['snapshot'])
            : row.snapshot,
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /** Groups completions by UTC start day and historical exercise title, preserving report scope. */
  async dashboard(query: BreathingReportDto) {
    // Validate before starting parallel reads so a bad range cannot leave rejected work unhandled.
    breathingRange(query.from, query.to);
    const title = "JSON_UNQUOTE(JSON_EXTRACT(session.snapshot, '$.title'))";
    const [summary, daily, patterns, recent] = await Promise.all([
      this.summary(query),
      this.reportQuery(query)
        .builder.select("DATE_FORMAT(session.startedAt, '%Y-%m-%d')", 'date')
        .addSelect("COALESCE(SUM(session.status = 'completed'), 0)", 'count')
        .groupBy("DATE_FORMAT(session.startedAt, '%Y-%m-%d')")
        .orderBy('date', 'ASC')
        .getRawMany<{ date: string; count: string }>(),
      this.reportQuery(query)
        .builder.select('session.exerciseId', 'id')
        .addSelect(title, 'title')
        .addSelect('COUNT(*)', 'started')
        .addSelect(
          "COALESCE(SUM(session.status = 'completed'), 0)",
          'completed',
        )
        .groupBy('session.exerciseId')
        .addGroupBy(title)
        .orderBy('started', 'DESC')
        .addOrderBy('session.exerciseId', 'ASC')
        .addOrderBy(title, 'ASC')
        .limit(20)
        .getRawMany<{
          id: number;
          title: string;
          started: string;
          completed: string;
        }>(),
      this.history(
        Object.assign(new BreathingReportDto(), query, {
          page: 1,
          pageSize: 4,
          sort: 'startedAt',
          order: 'desc',
        }),
      ),
    ]);
    return {
      ...summary,
      daily: daily.map((row) => ({ date: row.date, count: Number(row.count) })),
      patterns: patterns.map((row) => ({
        id: Number(row.id),
        title: row.title,
        started: Number(row.started),
        completed: Number(row.completed),
      })),
      recent: recent.items,
    };
  }

  /** Aggregates the same start-date cohort; null completion rate means no sessions. */
  async summary(query: BreathingReportDto) {
    const { builder } = this.reportQuery(query);
    const result = await builder
      .select('COUNT(*)', 'started')
      .addSelect('COUNT(DISTINCT session.memberId)', 'participants')
      .addSelect("COALESCE(SUM(session.status = 'completed'), 0)", 'completed')
      .getRawOne<{
        started: string;
        participants: string;
        completed: string;
      }>();
    const started = Number(result.started);
    const completed = Number(result.completed);
    return {
      started,
      completed,
      participants: Number(result.participants),
      completionRate: started ? completed / started : null,
      from: query.from,
      to: query.to,
      generatedAt: new Date().toISOString(),
    };
  }
}
