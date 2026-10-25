import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MoodEntryEntity } from '../entity/mood-entry.entity';
import { AssetsEntity } from '../entity/asset.entity';
import { objectUrl, storageConfig } from '../upload/storage-config';
import { Member } from '../entity/user-mimate.entity';
import {
  ParticipationListDto,
  ParticipationRangeDto,
} from './cms-mood-participation.dto';

@Injectable()
export class CmsMoodParticipationService {
  /** Injects the existing datasource. Returns read-only participation reporting. */
  constructor(@InjectDataSource('mimate') private readonly db: DataSource) {}

  /** Applies one eligibility/date scope to cards and history. Returns a query without loading mood content. */
  private scope(range?: ParticipationRangeDto) {
    if (range) {
      const days =
        (Date.parse(range.to) - Date.parse(range.from)) / 86400000 + 1;
      if (!Number.isInteger(days) || days < 1 || days > 366)
        throw new BadRequestException('Date range must be 1–366 days.');
    }
    const builder = this.db
      .getRepository(MoodEntryEntity)
      .createQueryBuilder('mood')
      .innerJoin(Member, 'member', 'member.id = mood.memberId')
      .where('member.memberAuthEnabled = :enabled', { enabled: true })
      .andWhere('member.deleted_at IS NULL')
      .andWhere(
        'NOT EXISTS (SELECT 1 FROM users staff WHERE staff.backup_member_id = member.id)',
      );
    if (range)
      builder.andWhere('mood.dateString BETWEEN :from AND :to', {
        from: range.from,
        to: range.to,
      });
    return builder;
  }

  /** Counts daily records and distinct participants over the entire range. Returns safe aggregate cards. */
  async summary(range: ParticipationRangeDto) {
    const counts = await this.scope(range)
      .select('COUNT(mood.id)', 'totalEntries')
      .addSelect('COUNT(DISTINCT mood.memberId)', 'uniqueParticipants')
      .getRawOne<{ totalEntries: string; uniqueParticipants: string }>();
    return {
      from: range.from,
      to: range.to,
      dateBasis: 'member-local' as const,
      totalEntries: Number(counts.totalEntries),
      uniqueParticipants: Number(counts.uniqueParticipants),
      generatedAt: new Date().toISOString(),
    };
  }

  /** Groups member-local record days and returns the latest four safe rows. */
  async dashboard(range: ParticipationRangeDto) {
    // Validate before starting any parallel reads.
    this.scope(range);
    const [summary, daily, recent] = await Promise.all([
      this.summary(range),
      this.scope(range)
        .select("DATE_FORMAT(mood.dateString, '%Y-%m-%d')", 'date')
        .addSelect('COUNT(*)', 'count')
        .groupBy('mood.dateString')
        .orderBy('mood.dateString', 'ASC')
        .getRawMany<{ date: string; count: string }>(),
      this.list(
        Object.assign(new ParticipationListDto(), range, { pageSize: 4 }),
      ),
    ]);
    return {
      ...summary,
      daily: daily.map((row) => ({ date: row.date, count: Number(row.count) })),
      recent: recent.items,
    };
  }

  /** Loads current submission content, scoping media to the same member. Returns no edit history or storage credentials. */
  async detail(id: number) {
    const result = await this.scope()
      .andWhere('mood.id = :id', { id })
      .select('mood')
      .addSelect('member.name', 'memberName')
      .getRawAndEntities<{ memberName: string | null }>();
    const entry = result.entities[0];
    if (!entry) throw new NotFoundException('Mood submission not found.');
    const assets = entry.attachmentIds.length
      ? await this.db
          .getRepository(AssetsEntity)
          .createQueryBuilder('asset')
          .where('asset.memberId = :memberId', { memberId: entry.memberId })
          .andWhere('asset.mediaId IN (:...ids)', { ids: entry.attachmentIds })
          .andWhere('asset.type IN (:...types)', { types: ['Image', 'Audio'] })
          .getMany()
      : [];
    const attachments = entry.attachmentIds.flatMap((attachmentId) => {
      const asset = assets.find((row) => row.mediaId === attachmentId);
      if (!asset?.path || !asset.contentType || !asset.size) return [];
      const settings = storageConfig(process.env);
      return [
        {
          id: asset.mediaId,
          type: asset.type === 'Image' ? 'photo' : 'audio',
          contentType: asset.contentType,
          size: asset.size,
          url: objectUrl(
            settings.endpointUrl,
            asset.bucket || settings.bucket,
            asset.path,
          ),
        },
      ];
    });
    return {
      id: String(entry.id),
      memberName: result.raw[0].memberName || 'Unnamed member',
      dateString: entry.dateString,
      timeZone: entry.timeZone,
      score: entry.score,
      note: entry.note,
      attachments,
      unavailableAttachmentCount:
        entry.attachmentIds.length - attachments.length,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    };
  }

  /** Loads one sorted page using only row ID, member name and local record date. Returns accurate server totals. */
  async list(query: ParticipationListDto) {
    const builder = this.scope(query);
    if (query.name)
      builder.andWhere('LOCATE(:name, LOWER(member.name)) > 0', {
        name: query.name.toLowerCase(),
      });
    const total = await builder.getCount();
    const columns = {
      memberName: 'member.name',
      dateString: 'mood.dateString',
    };
    const rows = await builder
      .select('mood.id', 'id')
      .addSelect('member.name', 'memberName')
      .addSelect("DATE_FORMAT(mood.dateString, '%Y-%m-%d')", 'dateString')
      .orderBy(
        columns[query.sortBy],
        query.sortOrder === 'asc' ? 'ASC' : 'DESC',
      )
      .addOrderBy('mood.id', 'DESC')
      .offset((query.page - 1) * query.pageSize)
      .limit(query.pageSize)
      .getRawMany<{
        id: number;
        memberName: string | null;
        dateString: string;
      }>();
    return {
      items: rows.map((row) => ({
        id: String(row.id),
        memberName: row.memberName || 'Unnamed member',
        dateString: row.dateString,
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
}
