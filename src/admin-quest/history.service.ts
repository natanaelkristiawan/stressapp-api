import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { QuestPointDetail } from "src/entity/quest-point-detail.entity";
import { HistoryUserDto } from "./dtos/history-user.dto";
import { HistoryUserItemInterface, HistoryUserResponseInterface } from "./interfaces/history-user.interface";
import { format, addHours } from "date-fns";

@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(QuestPointDetail, 'mimate')
    private readonly questPointDetailRepository: Repository<QuestPointDetail>,
  ) {}

  async getHistoryUser(dto: HistoryUserDto): Promise<HistoryUserResponseInterface> {
    const page = dto.page && dto.page > 0 ? Number(dto.page) : 1;
    const limit = dto.limit && dto.limit > 0 ? Number(dto.limit) : 10;
    const skip = (page - 1) * limit;

    const qb = this.questPointDetailRepository
      .createQueryBuilder('qpd')
      .leftJoinAndSelect('qpd.member', 'member')
      .leftJoinAndSelect('qpd.quest', 'quest')
      .leftJoinAndSelect('qpd.post', 'post');

    // Filter by Email
    if (dto.email && dto.email.trim() !== '') {
      qb.andWhere('(member.email LIKE :email OR member.email_mmid LIKE :email)', {
        email: `%${dto.email.trim()}%`,
      });
    }

    // Filter by Campaign
    if (dto.campaign && dto.campaign.trim() !== '') {
      qb.andWhere(
        '(quest.title LIKE :campaign OR qpd.source LIKE :campaign OR qpd.note LIKE :campaign)',
        { campaign: `%${dto.campaign.trim()}%` },
      );
    }

    const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;

    // Date filter: interpret start/end as local UTC+8 days -> convert to UTC
    if (dto.startDate && dto.startDate.trim() !== '') {
      const startLocal = new Date(dto.startDate.trim());
      startLocal.setHours(0, 0, 0, 0);
      const startUtc = new Date(startLocal.getTime() - TZ_OFFSET_MS);
      qb.andWhere('qpd.created_at >= :startDate', {
        startDate: startUtc,
      });
    }

    if (dto.endDate && dto.endDate.trim() !== '') {
      const endLocal = new Date(dto.endDate.trim());
      endLocal.setHours(23, 59, 59, 999);
      const endUtc = new Date(endLocal.getTime() - TZ_OFFSET_MS);
      qb.andWhere('qpd.created_at <= :endDate', {
        endDate: endUtc,
      });
    }

    // Sorting
    const sortFieldMap: Record<string, string> = {
      email: 'member.email',
      campaign: 'quest.title',
      point: 'qpd.points',
      points: 'qpd.points',
      note: 'qpd.note',
      created_at: 'qpd.created_at',
    };

    const sortField = dto.sortField && sortFieldMap[dto.sortField]
      ? sortFieldMap[dto.sortField]
      : 'qpd.id';
    const sortType = (dto.sortType || 'desc').toUpperCase() as 'ASC' | 'DESC';

    qb.orderBy(sortField, sortType);
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    const formattedItems: HistoryUserItemInterface[] = items.map((item) => {
      const email = item.member?.email || item.member?.email_mmid || '-';
      const campaign = item.quest?.title || item.source || '-';
      const point = Number(item.points) || 0;
      const note = item.note || '-';
      const postId = item.post_id || item.post?.id || null;
      const postContent =
        item.post?.title?.trim() ||
        item.post?.shortContent?.trim() ||
        item.post?.textContent?.trim() ||
        item.post?.description?.trim() ||
        item.post?.postId ||
        (postId ? `#${postId}` : '-');
      const createdAtStr = item.created_at
        ? format(addHours(new Date(item.created_at), 8), 'yyyy-MM-dd HH:mm:ss')
        : '-';

      return {
        id: item.id,
        email,
        campaign,
        point,
        note,
        postId,
        post: postContent,
        created_at: createdAtStr,
      };
    });

    return {
      items: formattedItems,
      recordsTotal: total,
      recordsFiltered: total,
    };
  }
}