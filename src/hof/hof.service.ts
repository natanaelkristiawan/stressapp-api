import { LeaderboardService } from 'src/leaderboard/leaderboard.service';
import { CATEGORIES, periodOf } from 'src/leaderboard/leaderboard.rules';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { In } from 'typeorm';
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HofList } from 'src/entity/hof-list.entity';
import { GetHofDto } from './dtos/get-hof.dto';
import {
  HofListItemInterface,
  HofWinnerPositionsInterface,
} from './interfaces/hof.interface';

@Injectable()
export class HofService {
  private readonly logger = new Logger(HofService.name);

  constructor(
    @InjectRepository(HofList, 'mimate')
    private readonly hofListRepo: Repository<HofList>,
    private readonly leaderboard: LeaderboardService,
  ) {}

  async getRealtime(userId: number, slug = 'paling-eksis') {
    const period = periodOf();
    const category = CATEGORIES.find(
      (value) => this.normalizeCategorySlug(value) === slug,
    );
    if (!category)
      throw new BadRequestException('Unknown leaderboard category');
    let source = 'snapshot',
      stale = true;
    let ranking: {
      updatedAt?: string | null;
      top: Array<{ memberId: number; point: number; rank: number }>;
      me: { point: number; rank: number | null; ranked: boolean };
    };
    if (this.leaderboard.readsEnabled) {
      try {
        ranking = await this.leaderboard.read(period, category, userId);
        source = 'redis';
        stale = false;
      } catch (error) {
        this.logger.warn(`Redis leaderboard unavailable: ${error.message}`);
      }
    }
    if (!ranking) {
      const [year, month] = period.split('-').map(Number);
      // Never silently substitute a previous month's snapshot.
      const { top, me } = await this.hofListRepo.manager.transaction(
        'REPEATABLE READ',
        async (manager) => {
          const repo = manager.getRepository(HofList);
          const top = await repo.find({
            where: { year, month, category },
            order: { rank: 'ASC' },
            take: 5,
          });
          const me = await repo.findOne({
            where: { year, month, category, member_id: userId },
          });
          return { top, me };
        },
      );
      ranking = {
        updatedAt:
          top[0]?.updated_at?.toISOString() ||
          me?.updated_at?.toISOString() ||
          null,
        top: top.map((row) => ({
          memberId: row.member_id,
          point: Number(row.total_points),
          rank: row.rank,
        })),
        me: {
          point: Number(me?.total_points || 0),
          rank: me?.rank || null,
          ranked: Boolean(me?.rank),
        },
      };
      if (!top.length && !me) source = 'unavailable';
    }
    const ids = ranking.top.map((row) => row.memberId);
    const users = ids.length
      ? await this.hofListRepo.manager
          .getRepository(UserMimateEntity)
          .find({ where: { id: In(ids) } })
      : [];
    return {
      period,
      category: slug,
      source,
      stale,
      updatedAt: ranking.updatedAt || null,
      top: ranking.top.map((row) => {
        const user = users.find((member) => member.id === row.memberId);
        return {
          memberId: row.memberId,
          fullname: this.getMemberName(
            user?.name,
            user?.mmid_fullname,
            row.memberId,
          ),
          photo:
            user?.profilePictureUrl_new ||
            user?.profilePictureUrl ||
            user?.image_path ||
            '',
          point: row.point,
          position: row.rank,
        };
      }),
      // Missing rank does not prove ineligibility; zero-score UI remains a product decision.
      me: { ...ranking.me, eligible: ranking.me.ranked ? true : null },
    };
  }

  private normalizeCategorySlug(category?: string): string {
    if (!category) return '';
    const normalized = category.trim().toLowerCase().replace(/\s+/g, '-');
    if (normalized === 'most-exist') return 'paling-eksis';
    if (normalized === 'best-newcomer') return 'pendatang-terbaik';
    return normalized;
  }

  private getMemberName(
    name?: string,
    mmid_fullname?: string,
    id?: number,
  ): string {
    let tempName = (mmid_fullname || '').trim();
    if (!tempName) {
      tempName = (name || '').trim();
    }
    if (!tempName && id) {
      tempName = `user_${String(id).padStart(4, '0')}`;
    }
    return tempName || 'Anonymous';
  }

  /**
   * Mengambil daftar pemenang Hall of Fame publik dari hof_list.
   * Format keluaran berupa array objek: { id, fullname, photo, point, position }.
   */
  async getHofList(dto: GetHofDto): Promise<HofListItemInterface[]> {
    try {
      let year = dto.year ? Number(dto.year) : undefined;
      let month = dto.month ? Number(dto.month) : undefined;

      // Jika periode tidak ditentukan, gunakan bulan & tahun saat ini atau fallback ke periode terakhir yang tersedia
      if (!year && !month) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        const countCurrent = await this.hofListRepo.count({
          where: { year: currentYear, month: currentMonth },
        });

        if (countCurrent > 0) {
          year = currentYear;
          month = currentMonth;
        } else {
          const latest = await this.hofListRepo
            .createQueryBuilder('hof')
            .orderBy('hof.year', 'DESC')
            .addOrderBy('hof.month', 'DESC')
            .getOne();

          if (latest) {
            year = latest.year;
            month = latest.month;
          } else {
            year = currentYear;
            month = currentMonth;
          }
        }
      } else {
        const now = new Date();
        year = year || now.getFullYear();
        month = month || now.getMonth() + 1;
      }

      const qb = this.hofListRepo
        .createQueryBuilder('hof')
        .leftJoinAndSelect('hof.member', 'member')
        .where('hof.year = :year', { year })
        .andWhere('hof.month = :month', { month });

      if (
        dto.category &&
        dto.category.trim() !== '' &&
        dto.category.trim().toLowerCase() !== 'all'
      ) {
        const cat = dto.category.trim().toLowerCase();
        if (
          cat === 'paling eksis' ||
          cat === 'paling-eksis' ||
          cat === 'most-exist'
        ) {
          qb.andWhere('LOWER(hof.category) = :cat', { cat: 'paling eksis' });
        } else if (
          cat === 'pendatang terbaik' ||
          cat === 'pendatang-terbaik' ||
          cat === 'best-newcomer'
        ) {
          qb.andWhere('LOWER(hof.category) = :cat', {
            cat: 'pendatang terbaik',
          });
        } else if (cat === 'tampil kembali' || cat === 'tampil-kembali') {
          qb.andWhere('LOWER(hof.category) = :cat', { cat: 'tampil kembali' });
        } else {
          qb.andWhere('LOWER(hof.category) = :cat', { cat });
        }
      } else if (!dto.category) {
        // Default kategori ke 'Paling Eksis' jika tidak dispesifikasi
        qb.andWhere('LOWER(hof.category) = :cat', { cat: 'paling eksis' });
      }

      qb.orderBy('hof.rank', 'ASC').addOrderBy('hof.total_points', 'DESC');

      const limit = dto.limit && dto.limit > 0 ? Number(dto.limit) : 5;
      qb.limit(limit);

      const rows = await qb.getMany();

      return rows.map((row) => {
        const fullname = this.getMemberName(
          row.member?.name,
          row.member?.mmid_fullname,
          row.member?.id || row.member_id,
        );
        const photo =
          row.member?.profilePictureUrl_new ||
          row.member?.profilePictureUrl ||
          row.member?.image_path ||
          '';
        const point = Number(row.total_points || 0);
        const position = Number(row.rank || 0);

        return {
          id: row.id,
          fullname,
          photo,
          point,
          position,
        };
      });
    } catch (error) {
      this.logger.error('Failed to get hof list:', error?.stack || error);
      return [];
    }
  }

  /**
   * Mengambil posisi pemenang (rank/position) untuk setiap kategori berdasarkan user ID.
   * Format keluaran berupa objek key-value: { [categorySlug]: position }.
   * Contoh: { 'pendatang-terbaik': 3, 'paling-eksis': 1 }
   *
   * @param userId ID member / user
   * @param yearOrDto Tahun (opsional) atau object DTO berisi { year, month }
   * @param monthParam Bulan (opsional, 1-12)
   */
  async getWinnerPositionByUserId(
    userId: number,
    yearOrDto?: number | { year?: number; month?: number },
    monthParam?: number,
  ): Promise<HofWinnerPositionsInterface> {
    try {
      let year: number | undefined;
      let month: number | undefined;

      if (typeof yearOrDto === 'object' && yearOrDto !== null) {
        year = yearOrDto.year ? Number(yearOrDto.year) : undefined;
        month = yearOrDto.month ? Number(yearOrDto.month) : undefined;
      } else {
        year = yearOrDto ? Number(yearOrDto) : undefined;
        month = monthParam ? Number(monthParam) : undefined;
      }

      const qb = this.hofListRepo
        .createQueryBuilder('hof')
        .where('hof.member_id = :userId', { userId });

      if (year) {
        qb.andWhere('hof.year = :year', { year });
      }
      if (month) {
        qb.andWhere('hof.month = :month', { month });
      }

      qb.orderBy('hof.year', 'DESC')
        .addOrderBy('hof.month', 'DESC')
        .addOrderBy('hof.rank', 'ASC');

      const rows = await qb.getMany();

      const positions: HofWinnerPositionsInterface = {};

      for (const row of rows) {
        const slug = this.normalizeCategorySlug(row.category);
        if (slug && positions[slug] === undefined && row.rank > 0) {
          positions[slug] = Number(row.rank);
        }
      }

      return positions;
    } catch (error) {
      this.logger.error(
        `Failed to get winner position for user id ${userId}:`,
        error?.stack || error,
      );
      return {};
    }
  }
}
