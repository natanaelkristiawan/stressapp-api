import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { Member } from '../entity/user-mimate.entity';
import { MoodEntryEntity } from '../entity/mood-entry.entity';
import { AssetsEntity } from '../entity/asset.entity';
import { objectUrl, storageConfig } from '../upload/storage-config';
import { MoodListDto, MoodRangeDto, SaveMoodDto } from './mood-tracker.dto';

const MOODS = [
  'sangat_buruk',
  'buruk',
  'biasa_saja',
  'baik',
  'sangat_baik',
] as const;

/** Computes the member's calendar date without a UTC date shift. Returns YYYY-MM-DD. */
export function localMoodDate(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) =>
    parts.find((value) => value.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** Validates a bounded inclusive history range. Returns its length in calendar days. */
export function moodRange(query: MoodRangeDto): number {
  const days = (Date.parse(query.to) - Date.parse(query.from)) / 86400000 + 1;
  if (!Number.isInteger(days) || days < 1 || days > 366)
    throw new BadRequestException('Rentang tanggal harus 1–366 hari.');
  return days;
}

@Injectable()
export class MoodTrackerService {
  /** Injects the shared database. Returns member-owned mood operations. */
  constructor(@InjectDataSource('mimate') private readonly db: DataSource) {}

  /** Maps one stored entry to the mobile shape. Returns safe fields and public attachment URLs. */
  private async view(entry: MoodEntryEntity) {
    const attachments = await this.ownedAttachments(
      entry.memberId,
      entry.attachmentIds,
    );
    return {
      id: String(entry.id),
      dateString: entry.dateString,
      timeZone: entry.timeZone,
      mood: MOODS[entry.score - 1],
      score: entry.score,
      note: entry.note,
      attachments: attachments.map((asset) => ({
        id: asset.mediaId,
        type: asset.type === 'Image' ? 'photo' : 'audio',
        contentType: asset.contentType,
        size: asset.size,
        url: objectUrl(
          storageConfig(process.env).endpointUrl,
          asset.bucket || process.env.S3_BUCKET,
          asset.path,
        ),
        expiresAt: null,
      })),
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    };
  }

  /** Validates attachment assignment against the shared asset owner. Returns rows in requested order. */
  private async ownedAttachments(
    memberId: number,
    ids: string[],
    manager: EntityManager = this.db.manager,
  ) {
    if (!ids.length) return [];
    const rows = await manager
      .getRepository(AssetsEntity)
      .createQueryBuilder('asset')
      .where('asset.memberId = :memberId', { memberId })
      .andWhere('asset.mediaId IN (:...ids)', { ids })
      .andWhere('asset.type IN (:...types)', { types: ['Image', 'Audio'] })
      .getMany();
    if (rows.length !== ids.length)
      throw new NotFoundException('Lampiran tidak ditemukan.');
    return ids.map((id) => rows.find((row) => row.mediaId === id));
  }

  /** Scopes all queries to the authenticated member. Returns a reusable bounded query. */
  private query(memberId: number, manager: EntityManager = this.db.manager) {
    return manager
      .getRepository(MoodEntryEntity)
      .createQueryBuilder('mood')
      .where('mood.memberId = :memberId', { memberId });
  }

  /** Loads a bounded calendar/history page. Returns newest dates first and server pagination metadata. */
  async list(memberId: number, query: MoodListDto) {
    moodRange(query);
    const [entries, total] = await this.query(memberId)
      .andWhere('mood.dateString BETWEEN :from AND :to', query)
      .orderBy('mood.dateString', 'DESC')
      .addOrderBy('mood.id', 'DESC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();
    return {
      items: await Promise.all(entries.map((entry) => this.view(entry))),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /** Loads one local day's entry. Returns 404 when this member has no entry. */
  async detail(memberId: number, date: string) {
    const entry = await this.query(memberId)
      .andWhere('mood.dateString = :date', { date })
      .getOne();
    if (!entry) throw new NotFoundException('Catatan mood tidak ditemukan.');
    return this.view(entry);
  }

  /** Serializes per-member daily upserts. Returns one current-day entry; retries cannot create duplicates. */
  async save(memberId: number, date: string, input: SaveMoodDto) {
    const entry = await this.db.transaction(async (manager) => {
      // Lock the member even before the first mood row exists, matching suspension/auth lock ordering.
      const member = await manager
        .getRepository(Member)
        .createQueryBuilder('member')
        .where('member.id = :memberId', { memberId })
        .setLock('pessimistic_write')
        .getOne();
      if (
        !member ||
        !member.memberAuthEnabled ||
        member.is_suspended ||
        !member.verifiedAt
      )
        throw new NotFoundException('Anggota tidak ditemukan.');
      if (date !== localMoodDate(new Date(), input.timeZone))
        throw new BadRequestException(
          'Hanya mood hari ini yang dapat disimpan.',
        );
      await this.ownedAttachments(memberId, input.attachmentIds, manager);
      const previous = await this.query(memberId, manager)
        .andWhere('mood.dateString = :date', { date })
        .getOne();
      const now = new Date();
      return manager.getRepository(MoodEntryEntity).save({
        ...(previous || {}),
        memberId,
        dateString: date,
        timeZone: input.timeZone,
        score: input.score,
        note: input.note,
        attachmentIds: input.attachmentIds,
        createdAt: previous?.createdAt || now,
        updatedAt: now,
      });
    });
    return this.view(entry);
  }

  /** Computes actual chart counts and missing-day gaps. Returns daily values and distribution without demo data. */
  async summary(memberId: number, query: MoodRangeDto) {
    const count = moodRange(query);
    const entries = await this.query(memberId)
      .andWhere('mood.dateString BETWEEN :from AND :to', query)
      .getMany();
    const scores = new Map(
      entries.map((entry) => [entry.dateString, entry.score]),
    );
    const days = Array.from({ length: count }, (_, index) => {
      const dateString = new Date(Date.parse(query.from) + index * 86400000)
        .toISOString()
        .slice(0, 10);
      return { dateString, score: scores.get(dateString) ?? null };
    });
    const counts = [1, 2, 3, 4, 5].map(
      (score) => entries.filter((entry) => entry.score === score).length,
    );
    return {
      from: query.from,
      to: query.to,
      timeZone: query.timeZone,
      weekStartsOn: 'monday',
      days,
      stats: {
        sangatBuruk: counts[0],
        buruk: counts[1],
        biasa: counts[2],
        baik: counts[3],
        sangatBaik: counts[4],
        total: entries.length,
      },
    };
  }
}
