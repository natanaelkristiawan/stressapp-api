import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MoodEntryEntity } from '../entity/mood-entry.entity';
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
  private scope(range: ParticipationRangeDto) {
    const days = (Date.parse(range.to) - Date.parse(range.from)) / 86400000 + 1;
    if (!Number.isInteger(days) || days < 1 || days > 366)
      throw new BadRequestException('Date range must be 1–366 days.');
    return this.db
      .getRepository(MoodEntryEntity)
      .createQueryBuilder('mood')
      .innerJoin(Member, 'member', 'member.id = mood.memberId')
      .where('member.memberAuthEnabled = :enabled', { enabled: true })
      .andWhere('member.deleted_at IS NULL')
      .andWhere(
        'NOT EXISTS (SELECT 1 FROM users staff WHERE staff.backup_member_id = member.id)',
      )
      .andWhere('mood.dateString BETWEEN :from AND :to', {
        from: range.from,
        to: range.to,
      });
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
