import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CampaignWinner } from 'src/entity/campaign-winner.entity';
import { GetWinnerDto } from './dtos/get-winner.dto';
import {
  WinnerListItemInterface,
  WinnerCategoryCheckInterface,
} from './interfaces/winner.interface';

@Injectable()
export class WinnerService {
  private readonly logger = new Logger(WinnerService.name);

  constructor(
    @InjectRepository(CampaignWinner, 'mimate')
    private readonly campaignWinnerRepo: Repository<CampaignWinner>,
  ) {}

  private normalizeCategorySlug(category?: string): string {
    if (!category) return '';
    const normalized = category.trim().toLowerCase().replace(/\s+/g, '-');
    if (normalized === 'most-exist' || normalized === 'paling-eksis') return 'paling-eksis';
    if (normalized === 'best-newcomer' || normalized === 'pendatang-terbaik') return 'pendatang-terbaik';
    if (normalized === 'tampil-kembali') return 'tampil-kembali';
    if (normalized === 'komen-terbaik' || normalized === 'komentar-terbaik') return 'komen-terbaik';
    if (normalized === 'cerita-terbaik') return 'cerita-terbaik';
    return normalized;
  }

  private getMemberName(name?: string, mmid_fullname?: string, id?: number): string {
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
   * Mengambil daftar pemenang campaign publik dari campaign_winner.
   * Format keluaran berupa array objek: { id, fullname, photo, point, position }.
   */
  async getWinnerList(dto: GetWinnerDto): Promise<WinnerListItemInterface[]> {
    try {
      let year = dto.year ? Number(dto.year) : undefined;
      let month = dto.month ? Number(dto.month) : undefined;

      // Jika periode tidak ditentukan, gunakan bulan & tahun saat ini atau fallback ke periode terakhir yang tersedia
      if (!year && !month) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        const countCurrent = await this.campaignWinnerRepo.count({
          where: { year: currentYear, month: currentMonth },
        });

        if (countCurrent > 0) {
          year = currentYear;
          month = currentMonth;
        } else {
          const latest = await this.campaignWinnerRepo
            .createQueryBuilder('winner')
            .orderBy('winner.year', 'DESC')
            .addOrderBy('winner.month', 'DESC')
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

      const qb = this.campaignWinnerRepo
        .createQueryBuilder('winner')
        .leftJoinAndSelect('winner.member', 'member')
        .where('winner.year = :year', { year })
        .andWhere('winner.month = :month', { month });

      if (dto.category && dto.category.trim() !== '' && dto.category.trim().toLowerCase() !== 'all') {
        const normalized = dto.category.trim().toLowerCase().replace(/\s+/g, '-');
        if (normalized === 'paling-eksis' || normalized === 'most-exist') {
          qb.andWhere(
            '(LOWER(winner.category) = :slug OR LOWER(winner.category) = :title)',
            { slug: 'paling-eksis', title: 'paling eksis' },
          );
        } else if (normalized === 'pendatang-terbaik' || normalized === 'best-newcomer') {
          qb.andWhere(
            '(LOWER(winner.category) = :slug OR LOWER(winner.category) = :title)',
            { slug: 'pendatang-terbaik', title: 'pendatang terbaik' },
          );
        } else if (normalized === 'tampil-kembali') {
          qb.andWhere(
            '(LOWER(winner.category) = :slug OR LOWER(winner.category) = :title)',
            { slug: 'tampil-kembali', title: 'tampil kembali' },
          );
        } else if (normalized === 'cerita-terbaik') {
          qb.andWhere(
            '(LOWER(winner.category) = :slug OR LOWER(winner.category) = :title)',
            { slug: 'cerita-terbaik', title: 'cerita terbaik' },
          );
        } else {
          qb.andWhere(
            '(LOWER(winner.category) = :cat OR LOWER(REPLACE(winner.category, " ", "-")) = :cat)',
            { cat: normalized },
          );
        }
      } else if (!dto.category) {
        // Default kategori ke 'paling-eksis' jika tidak dispesifikasi
        qb.andWhere(
          '(LOWER(winner.category) = :slug OR LOWER(winner.category) = :title)',
          { slug: 'paling-eksis', title: 'paling eksis' },
        );
      }

      qb.orderBy('winner.rank', 'ASC').addOrderBy('winner.total_points', 'DESC');

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
      this.logger.error('Failed to get winner list:', error?.stack || error);
      return [];
    }
  }

  /**
   * Mengecek apakah user ID sudah pernah menjadi pemenang sepanjang waktu (whole time / all-time)
   * pada 5 kategori lomba Olimpiade:
   * - paling-exist / paling-eksis : 1 atau 0
   * - pendatang-terbaik : 1 atau 0
   * - tampil-kembali : 1 atau 0
   * - komen-terbaik : 1 atau 0
   * - cerita-terbaik : 1 atau 0
   *
   * @param userId ID member / user
   * @returns Objek status (1 jika sudah pernah menang, 0 jika belum)
   */
  async checkWinnerCategoriesByUserId(
    userId: number,
  ): Promise<WinnerCategoryCheckInterface> {
    const result: WinnerCategoryCheckInterface = {
      'paling-eksis': 0,
      'paling-exist': 0,
      'pendatang-terbaik': 0,
      'tampil-kembali': 0,
      'komen-terbaik': 0,
      'cerita-terbaik': 0,
    };

    if (!userId) {
      return result;
    }

    try {
      // Cek dari tabel campaign_winner untuk seluruh waktu (all-time)
      const campaignRows = await this.campaignWinnerRepo
        .createQueryBuilder('winner')
        .where('winner.member_id = :userId', { userId })
        .andWhere('winner.rank > 0')
        .getMany();

      for (const row of campaignRows) {
        const slug = this.normalizeCategorySlug(row.category);
        if (slug) {
          if (slug === 'paling-eksis' || slug === 'paling-exist') {
            result['paling-eksis'] = 1;
            result['paling-exist'] = 1;
          } else if (slug in result) {
            result[slug] = 1;
          }
        }
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to check winner categories for user id ${userId}:`,
        error?.stack || error,
      );
      return result;
    }
  }
}


