import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CampaignWinner } from 'src/entity/campaign-winner.entity';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { QuestPoint } from 'src/entity/quest-point.entity';
import { SaveManualWinnerDto } from './dtos/save-manual-winner.dto';
import { GetWinnerDto } from 'src/winner/dtos/get-winner.dto';
import { WinnerListItemInterface } from 'src/winner/interfaces/winner.interface';

export const CAMPAIGN_WINNER_CATEGORIES = [
    'paling-eksis',
    'pendatang-terbaik',
    'tampil-kembali',
    'cerita-terbaik',
] as const;

export type CampaignWinnerCategory = (typeof CAMPAIGN_WINNER_CATEGORIES)[number];

@Injectable()
export class CampaignWinnerService {
    private readonly logger = new Logger(CampaignWinnerService.name);

    constructor(
        @InjectRepository(CampaignWinner, 'mimate')
        private readonly campaignWinnerRepo: Repository<CampaignWinner>,

        @InjectRepository(UserMimateEntity, 'mimate')
        private readonly userMimateRepo: Repository<UserMimateEntity>,

        @InjectRepository(QuestPoint, 'mimate')
        private readonly questPointRepo: Repository<QuestPoint>,
    ) { }

    /**
     * Simpan pemenang campaign secara manual ke tabel campaign_winner.
     * Kategori yang didukung:
     * - paling-eksis
     * - pendatang-terbaik
     * - tampil-kembali
     * - cerita-terbaik
     */
    async saveManual(
        paramsOrPeriod: string | SaveManualWinnerDto | { month?: number; year?: number },
        userIdParam?: number,
        winnerTypeParam?: string,
        rankParam?: number,
    ): Promise<boolean> {
        try {
            let period: string | undefined;
            let month: number | undefined;
            let year: number | undefined;
            let userId: number | undefined;
            let winner_type: string | undefined;
            let rank: number | undefined;

            if (typeof paramsOrPeriod === 'object' && paramsOrPeriod !== null && !('getMonth' in paramsOrPeriod)) {
                const dto = paramsOrPeriod as SaveManualWinnerDto;
                period = dto.period;
                month = dto.month;
                year = dto.year;
                userId = dto.userId ?? dto.memberId;
                winner_type = dto.winner_type ?? dto.category;
                rank = dto.rank;
            } else {
                period = typeof paramsOrPeriod === 'string' ? paramsOrPeriod : undefined;
                userId = userIdParam;
                winner_type = winnerTypeParam;
                rank = rankParam;
            }

            if (!userId && userIdParam) userId = userIdParam;
            if (!winner_type && winnerTypeParam) winner_type = winnerTypeParam;
            if (!rank && rankParam) rank = rankParam;

            if (!userId) {
                this.logger.warn('saveManual: user id is required');
                return false;
            }

            if (!winner_type) {
                this.logger.warn('saveManual: winner_type is required');
                return false;
            }

            // Parse period string if provided
            if (period && typeof period === 'string') {
                const trimmed = period.trim();
                if (/^\d{4}[-/]\d{1,2}$/.test(trimmed)) {
                    const [y, m] = trimmed.split(/[-/]/).map(Number);
                    year = y;
                    month = m;
                } else if (/^\d{1,2}[-/]\d{4}$/.test(trimmed)) {
                    const [m, y] = trimmed.split(/[-/]/).map(Number);
                    year = y;
                    month = m;
                } else if (!isNaN(Date.parse(trimmed))) {
                    const d = new Date(trimmed);
                    year = d.getFullYear();
                    month = d.getMonth() + 1;
                }
            }

            const now = new Date();
            year = year && year > 0 ? Number(year) : now.getFullYear();
            month = month && month >= 1 && month <= 12 ? Number(month) : now.getMonth() + 1;

            // 1. Cek apakah user exist di UserMimateEntity
            const user = await this.userMimateRepo.findOne({
                where: [{ id: Number(userId) }, { userId: Number(userId) }],
            });

            if (!user || !user.id) {
                this.logger.warn(`saveManual: user with id/userId ${userId} does not exist`);
                return false;
            }

            // 2. Ambil point user dari tabel quest_points
            const questPoint = await this.questPointRepo.findOne({
                where: { memberId: user.id },
            });

            const totalPoints = questPoint ? Number(questPoint.totalPoints || 0) : 0;

            // Normalize category name to standard campaign category slugs
            const normalized = (winner_type || '').trim().toLowerCase().replace(/\s+/g, '-');
            let category = normalized;
            if (normalized === 'paling-eksis') {
                category = 'paling-eksis';
            } else if (normalized === 'pendatang-terbaik') {
                category = 'pendatang-terbaik';
            } else if (normalized === 'tampil-kembali') {
                category = 'tampil-kembali';
            } else if (normalized === 'cerita-terbaik') {
                category = 'cerita-terbaik';
            }

            if (!CAMPAIGN_WINNER_CATEGORIES.includes(category as CampaignWinnerCategory)) {
                this.logger.warn(
                    `saveManual: invalid category '${winner_type}'. Valid categories are: ${CAMPAIGN_WINNER_CATEGORIES.join(', ')}`,
                );
                return false;
            }

            // 3. Tentukan rank / position jika tidak disediakan
            if (!rank || rank <= 0) {
                const currentCount = await this.campaignWinnerRepo.count({
                    where: { category, year, month },
                });
                rank = currentCount + 1;
            }

            // 4. Simpan ke campaign_winner (update jika member sudah ada di periode ini, atau insert baru)
            let winnerRecord = await this.campaignWinnerRepo.findOne({
                where: { member_id: user.id, category, year, month },
            });

            if (winnerRecord) {
                winnerRecord.total_points = totalPoints;
                if (rankParam || (typeof paramsOrPeriod === 'object' && (paramsOrPeriod as any).rank)) {
                    winnerRecord.rank = rank;
                }
                await this.campaignWinnerRepo.save(winnerRecord);
            } else {
                winnerRecord = this.campaignWinnerRepo.create({
                    member_id: user.id,
                    category,
                    month,
                    year,
                    total_points: totalPoints,
                    rank,
                });
                await this.campaignWinnerRepo.save(winnerRecord);
            }

            this.logger.log(
                `saveManual: successfully saved member ${user.id} to campaign_winner (category: '${category}', period: ${year}-${month}, points: ${totalPoints}, rank: ${rank})`,
            );
            return true;
        } catch (error) {
            this.logger.error(`saveManual failed:`, error?.stack || error);
            return false;
        }
    }

    /**
     * Update position / rank of a winner record in campaign_winner by id
     */
    async updateWinnerPosition(id: number, position: number): Promise<boolean> {
        try {
            if (!id) {
                this.logger.warn('updateWinnerPosition: id is required');
                return false;
            }

            const record = await this.campaignWinnerRepo.findOne({
                where: { id: Number(id) },
            });

            if (!record) {
                this.logger.warn(`updateWinnerPosition: record with id ${id} not found`);
                return false;
            }

            record.rank = Number(position);
            await this.campaignWinnerRepo.save(record);
            this.logger.log(`updateWinnerPosition: record ${id} rank updated to ${position}`);
            return true;
        } catch (error) {
            this.logger.error(`updateWinnerPosition failed for id ${id}:`, error?.stack || error);
            return false;
        }
    }

    /**
     * Delete a winner record from campaign_winner by id
     */
    async deleteWinner(id: number): Promise<boolean> {
        try {
            if (!id) {
                this.logger.warn('deleteWinner: id is required');
                return false;
            }

            const record = await this.campaignWinnerRepo.findOne({
                where: { id: Number(id) },
            });

            if (!record) {
                this.logger.warn(`deleteWinner: record with id ${id} not found`);
                return false;
            }

            await this.campaignWinnerRepo.delete(Number(id));
            this.logger.log(`deleteWinner: successfully deleted record with id ${id}`);
            return true;
        } catch (error) {
            this.logger.error(`deleteWinner failed for id ${id}:`, error?.stack || error);
            return false;
        }
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
     * Mengambil daftar pemenang Campaign dari tabel campaign_winner.
     */
    async getWinnerList(dto: GetWinnerDto): Promise<WinnerListItemInterface[]> {
        try {
            const now = new Date();
            const year = dto.year && Number(dto.year) > 0 ? Number(dto.year) : now.getFullYear();
            const month = dto.month && Number(dto.month) >= 1 && Number(dto.month) <= 12 ? Number(dto.month) : now.getMonth() + 1;

            const qb = this.campaignWinnerRepo
                .createQueryBuilder('winner')
                .leftJoinAndSelect('winner.member', 'member')
                .where('winner.year = :year', { year })
                .andWhere('winner.month = :month', { month });

            if (dto.category && dto.category.trim() !== '' && dto.category.trim().toLowerCase() !== 'all') {
                const normalized = dto.category.trim().toLowerCase().replace(/\s+/g, '-');
                qb.andWhere('(LOWER(winner.category) = :cat OR LOWER(REPLACE(winner.category, " ", "-")) = :cat)', { cat: normalized });
            }

            qb.orderBy('winner.rank', 'ASC').addOrderBy('winner.total_points', 'DESC');

            const limit = dto.limit && dto.limit > 0 ? Number(dto.limit) : 50;
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
            this.logger.error('Failed to get campaign winner list:', error?.stack || error);
            return [];
        }
    }
}
