import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { format } from 'date-fns';
import { QuestPointDetail } from 'src/entity/quest-point-detail.entity';
import { QuestPoint } from 'src/entity/quest-point.entity';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { LogLastActiveManual } from 'src/entity/log-last-active-manual.entity';
import { HofList } from 'src/entity/hof-list.entity';
import { GetMostExistUserDto } from './dtos/most-exist.dto';
import { GetBestNewcomerDto } from './dtos/best-newcomer.dto';
import { GetTampilKembaliDto } from './dtos/tampil-kembali.dto';
import { SaveManualWinnerDto } from './dtos/save-manual-winner.dto';

@Injectable()
export class WinnerSetService {
    private readonly logger = new Logger(WinnerSetService.name);

    constructor(
        @InjectRepository(QuestPointDetail, 'mimate')
        private readonly questPointDetailRepo: Repository<QuestPointDetail>,

        @InjectRepository(QuestPoint, 'mimate')
        private readonly questPointRepo: Repository<QuestPoint>,

        @InjectRepository(UserMimateEntity, 'mimate')
        private readonly userMimateRepo: Repository<UserMimateEntity>,

        @InjectRepository(LogLastActiveManual, 'mimate')
        private readonly logLastActiveManualRepo: Repository<LogLastActiveManual>,

        @InjectRepository(HofList, 'mimate')
        private readonly hofListRepo: Repository<HofList>,
    ) { }

    /**
     * Mendapatkan user yang 'Paling Eksis' di range bulan yang ditentukan (atau bulan saat ini),
     * lalu me-reset dan menyimpan data pemenang ke tabel hof_list.
     * Mengembalikan boolean (true jika berhasil, false jika gagal).
     *
     * Rules:
     * - Monthly reward for Warga who actively interact and show up the most on MiMate
     * - Points are counted based on MiMate Quest Points (accumulated from Post, Comment, Likes/Reactions, & Share activity)
     * - Total 5 winners
     */
    async getMostExistUsers(
        dto: GetMostExistUserDto,
    ): Promise<boolean> {
        try {
            const now = new Date(new Date().getTime() + 8 * 60 * 60 * 1000);
            const targetYear =
                dto.year && dto.year > 0 ? Number(dto.year) : now.getUTCFullYear();
            const targetMonth =
                dto.month && dto.month >= 1 && dto.month <= 12
                    ? Number(dto.month)
                    : now.getUTCMonth() + 1;

            const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;

            // Awal tanggal bulan (GMT+8) -> convert to UTC
            const startOfMonthLocal = new Date(Date.UTC(targetYear, targetMonth - 1, 1, 0, 0, 0, 0));
            // Akhir tanggal bulan (GMT+8) -> convert to UTC
            const endOfMonthLocal = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999));

            const startUtc = new Date(startOfMonthLocal.getTime() - TZ_OFFSET_MS);
            const endUtc = new Date(endOfMonthLocal.getTime() - TZ_OFFSET_MS);

            const startDateStr = format(startOfMonthLocal, 'yyyy-MM-dd 00:00:00');
            const endDateStr = format(endOfMonthLocal, 'yyyy-MM-dd 23:59:59');

            this.logger.log(
                `Generating & saving 'Paling Eksis' winners for period GMT+8: ${startDateStr} to ${endDateStr}`,
            );

            // Query akumulasi point dari quest_point_detail dengan filter Post, Comment, Like/Reaction, & Share
            const qb = this.questPointDetailRepo
                .createQueryBuilder('qpd')
                .innerJoin(UserMimateEntity, 'member', 'member.id = qpd.member_id')
                .select('qpd.member_id', 'memberId')
                .addSelect('COALESCE(SUM(qpd.points), 0)', 'monthlyPoints')
                .where('qpd.created_at >= :startDate', { startDate: startUtc })
                .andWhere('qpd.created_at <= :endDate', { endDate: endUtc })
                .andWhere('qpd.points > 0')
                .andWhere('qpd.note != :activated', {
                    activated: 'Get point for activated account',
                })
                .andWhere(
                    '(qpd.post_id IS NOT NULL OR qpd.comment_id IS NOT NULL OR qpd.reaction_id IS NOT NULL OR qpd.note LIKE :share OR qpd.note LIKE :post OR qpd.note LIKE :comment OR qpd.note LIKE :like)',
                    {
                        share: '%share%',
                        post: '%post%',
                        comment: '%comment%',
                        like: '%like%',
                    },
                )
                .groupBy('qpd.member_id')
                .orderBy('monthlyPoints', 'DESC').addOrderBy('qpd.member_id', 'ASC');

            const rawResults = await qb.getRawMany();

            const winners = rawResults.map((raw, index) => ({
                memberId: Number(raw.memberId),
                monthlyPoints: Number(raw.monthlyPoints || 0),
                rank: index + 1,
            }));

            // Reset data lama bulan ini dan replace dengan data baru di tabel hof_list
            return await this.syncToHofList('Paling Eksis', targetYear, targetMonth, winners);
        } catch (error) {
            this.logger.error(`Error generating most exist users:`, error?.stack || error);
            return false;
        }
    }

    /**
     * Mendapatkan user untuk kategori 'Pendatang Terbaik' (Best Newcomer),
     * lalu me-reset dan menyimpan data pemenang ke tabel hof_list.
     * Mengembalikan boolean (true jika berhasil, false jika gagal).
     *
     * Rules:
     * - Warga diklasifikasikan sebagai "Pendatang Terbaik" jika bergabung dalam 3 bulan terakhir,
     *   dihitung mundur dari bulan saat ini (target month).
     * - Points dihitung berdasarkan MiMate Quest Points (akumulasi aktivitas Post, Comment, Likes, & Share)
     * - Total 5 pemenang untuk kategori ini.
     * - Filter tanggal bergabung member (member.created_at) dan quest points menggunakan aturan GMT+8.
     */
    async getBestNewcomerUsers(
        dto: GetBestNewcomerDto,
    ): Promise<boolean> {
        try {
            const now = new Date(new Date().getTime() + 8 * 60 * 60 * 1000);
            const targetYear =
                dto.year && dto.year > 0 ? Number(dto.year) : now.getUTCFullYear();
            const targetMonth =
                dto.month && dto.month >= 1 && dto.month <= 12
                    ? Number(dto.month)
                    : now.getUTCMonth() + 1;

            const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;

            // Periode bulan untuk evaluasi poin (GMT+8) -> convert to UTC
            const startOfMonthLocal = new Date(Date.UTC(targetYear, targetMonth - 1, 1, 0, 0, 0, 0));
            const endOfMonthLocal = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999));

            const startUtc = new Date(startOfMonthLocal.getTime() - TZ_OFFSET_MS);
            const endUtc = new Date(endOfMonthLocal.getTime() - TZ_OFFSET_MS);

            // Window join 3 bulan terakhir dihitung mundur dari bulan target (GMT+8):
            // Contoh: Target bulan 9 (September) -> window join: 1 Juli s/d 30 September (Bulan 7, 8, 9)
            const joinStartLocal = new Date(Date.UTC(targetYear, targetMonth - 3, 1, 0, 0, 0, 0));
            const joinEndLocal = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999));

            const joinStartUtc = new Date(joinStartLocal.getTime() - TZ_OFFSET_MS);
            const joinEndUtc = new Date(joinEndLocal.getTime() - TZ_OFFSET_MS);

            const startDateStr = format(startOfMonthLocal, 'yyyy-MM-dd 00:00:00');
            const endDateStr = format(endOfMonthLocal, 'yyyy-MM-dd 23:59:59');
            const joinStartStr = format(joinStartLocal, 'yyyy-MM-dd 00:00:00');
            const joinEndStr = format(joinEndLocal, 'yyyy-MM-dd 23:59:59');

            this.logger.log(
                `Generating & saving 'Pendatang Terbaik' winners: Join window GMT+8: ${joinStartStr} to ${joinEndStr}, Point period GMT+8: ${startDateStr} to ${endDateStr}`,
            );

            // Query akumulasi point dari quest_point_detail dengan filter Post, Comment, Like/Reaction, & Share
            // serta filter member yang bergabung dalam 3 bulan terakhir (member.created_at)
            const qb = this.questPointDetailRepo
                .createQueryBuilder('qpd')
                .innerJoin(UserMimateEntity, 'member', 'member.id = qpd.member_id')
                .select('qpd.member_id', 'memberId')
                .addSelect('COALESCE(SUM(qpd.points), 0)', 'monthlyPoints')
                // Filter member join date dalam rentang 3 bulan terakhir (aturan GMT+8 di-convert ke UTC)
                .where('member.created_at >= :joinStartDate', { joinStartDate: joinStartUtc })
                .andWhere('member.created_at <= :joinEndDate', { joinEndDate: joinEndUtc })
                // Filter akumulasi poin pada periode bulan target
                .andWhere('qpd.created_at >= :startDate', { startDate: startUtc })
                .andWhere('qpd.created_at <= :endDate', { endDate: endUtc })
                .andWhere('qpd.points > 0')
                .andWhere('qpd.note != :activated', {
                    activated: 'Get point for activated account',
                })
                .andWhere(
                    '(qpd.post_id IS NOT NULL OR qpd.comment_id IS NOT NULL OR qpd.reaction_id IS NOT NULL OR qpd.note LIKE :share OR qpd.note LIKE :post OR qpd.note LIKE :comment OR qpd.note LIKE :like)',
                    {
                        share: '%share%',
                        post: '%post%',
                        comment: '%comment%',
                        like: '%like%',
                    },
                )
                .groupBy('qpd.member_id')
                .orderBy('monthlyPoints', 'DESC').addOrderBy('qpd.member_id', 'ASC');

            const rawResults = await qb.getRawMany();

            const winners = rawResults.map((raw, index) => ({
                memberId: Number(raw.memberId),
                monthlyPoints: Number(raw.monthlyPoints || 0),
                rank: index + 1,
            }));

            // Reset data lama bulan ini dan replace dengan data baru di tabel hof_list
            return await this.syncToHofList('Pendatang Terbaik', targetYear, targetMonth, winners);
        } catch (error) {
            this.logger.error(`Error generating best newcomer users:`, error?.stack || error);
            return false;
        }
    }

    /**
     * Mendapatkan user untuk kategori 'Tampil Kembali',
     * lalu me-reset dan menyimpan data pemenang ke tabel hof_list.
     * Mengembalikan boolean (true jika berhasil, false jika gagal).
     *
     * Rules:
     * - Warga diklasifikasikan sebagai "Tampil Kembali" jika mereka tidak aktif (inactive) dalam 3 bulan terakhir,
     *   dihitung mundur dari bulan saat ini (target month), dan menjadi aktif kembali di bulan saat ini.
     * - Points dihitung berdasarkan MiMate Quest Points (akumulasi aktivitas Post, Comment, Likes, & Share)
     * - Total 5 pemenang untuk kategori ini.
     * - Mengambil data log_last_active_manual difilter berdasarkan last_active dengan aturan GMT+8.
     */
    async getTampilKembaliUsers(
        dto: GetTampilKembaliDto,
    ): Promise<boolean> {
        try {
            const now = new Date(new Date().getTime() + 8 * 60 * 60 * 1000);
            const targetYear =
                dto.year && dto.year > 0 ? Number(dto.year) : now.getUTCFullYear();
            const targetMonth =
                dto.month && dto.month >= 1 && dto.month <= 12
                    ? Number(dto.month)
                    : now.getUTCMonth() + 1;

            const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;

            // Periode bulan untuk evaluasi poin (GMT+8) -> convert to UTC
            const startOfMonthLocal = new Date(Date.UTC(targetYear, targetMonth - 1, 1, 0, 0, 0, 0));
            const endOfMonthLocal = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999));

            const startUtc = new Date(startOfMonthLocal.getTime() - TZ_OFFSET_MS);
            const endUtc = new Date(endOfMonthLocal.getTime() - TZ_OFFSET_MS);

            // Batas tanggal 3 bulan tidak aktif dihitung mundur dari awal bulan target (GMT+8):
            // Contoh: Target bulan 9 (September 2026) -> 3 bulan sebelumnya adalah Juni, Juli, Agustus.
            // Cutoff tanggal awal 3 bulan tidak aktif = 1 Juni 2026 00:00:00 GMT+8.
            const inactiveCutoffLocal = new Date(Date.UTC(targetYear, targetMonth - 1 - 3, 1, 0, 0, 0, 0));
            const inactiveCutoffUtc = new Date(inactiveCutoffLocal.getTime() - TZ_OFFSET_MS);

            const startDateStr = format(startOfMonthLocal, 'yyyy-MM-dd 00:00:00');
            const endDateStr = format(endOfMonthLocal, 'yyyy-MM-dd 23:59:59');
            const inactiveCutoffStr = format(inactiveCutoffLocal, 'yyyy-MM-dd 00:00:00');

            this.logger.log(
                `Generating & saving 'Tampil Kembali' winners: Inactive cutoff GMT+8: < ${inactiveCutoffStr}, Point period GMT+8: ${startDateStr} to ${endDateStr}`,
            );

            // Query akumulasi point dari quest_point_detail dengan filter Post, Comment, Like/Reaction, & Share
            // serta filter user yang inactive selama 3 bulan terakhir dari log_last_active_manual (GMT+8)
            const qb = this.questPointDetailRepo
                .createQueryBuilder('qpd')
                .innerJoin(UserMimateEntity, 'member', 'member.id = qpd.member_id')
                .innerJoin(LogLastActiveManual, 'log', 'log.member_id = qpd.member_id')
                .select('qpd.member_id', 'memberId')
                .addSelect('COALESCE(SUM(qpd.points), 0)', 'monthlyPoints')
                // Filter inactive dalam 3 bulan terakhir dari log_last_active_manual (GMT+8 dievaluasi via UTC timestamp):
                // - Jika memiliki record last_active: last_active < batas 3 bulan yang lalu
                // - Jika belum pernah aktif (last_active IS NULL): tanggal bergabung member harus sebelum batas 3 bulan yang lalu
                .where(
                    '((log.last_active IS NOT NULL AND log.last_active < :inactiveCutoffUtc) OR (log.last_active IS NULL AND member.created_at < :inactiveCutoffUtc))',
                    { inactiveCutoffUtc },
                )
                // Filter akumulasi poin pada periode bulan target (aktif kembali di bulan ini)
                .andWhere('qpd.created_at >= :startDate', { startDate: startUtc })
                .andWhere('qpd.created_at <= :endDate', { endDate: endUtc })
                .andWhere('qpd.points > 0')
                .andWhere('qpd.note != :activated', {
                    activated: 'Get point for activated account',
                })
                .andWhere(
                    '(qpd.post_id IS NOT NULL OR qpd.comment_id IS NOT NULL OR qpd.reaction_id IS NOT NULL OR qpd.note LIKE :share OR qpd.note LIKE :post OR qpd.note LIKE :comment OR qpd.note LIKE :like)',
                    {
                        share: '%share%',
                        post: '%post%',
                        comment: '%comment%',
                        like: '%like%',
                    },
                )
                .groupBy('qpd.member_id')
                .orderBy('monthlyPoints', 'DESC').addOrderBy('qpd.member_id', 'ASC');

            const rawResults = await qb.getRawMany();

            const winners = rawResults.map((raw, index) => ({
                memberId: Number(raw.memberId),
                monthlyPoints: Number(raw.monthlyPoints || 0),
                rank: index + 1,
            }));

            // Reset data lama bulan ini dan replace dengan data baru di tabel hof_list
            return await this.syncToHofList('Tampil kembali', targetYear, targetMonth, winners);
        } catch (error) {
            this.logger.error(`Error generating tampil kembali users:`, error?.stack || error);
            return false;
        }
    }

    /**
     * Menyimpan / me-replace data pemenang ke tabel hof_list untuk kategori dan periode bulan tertentu.
     * Reset (hapus) terlebih dahulu seluruh data lama pada bulan, tahun, dan kategori tersebut,
     * lalu me-replace dengan baris data pemenang baru.
     */
    private async syncToHofList(
        category: string,
        year: number,
        month: number,
        winners: Array<{
            memberId: number;
            monthlyPoints: number;
            rank: number;
        }>,
    ): Promise<boolean> {
        try {
            await this.hofListRepo.manager.transaction(async manager => {
                const repo = manager.getRepository(HofList);
                await repo.delete({ category, year, month });
                if (winners.length) await repo.save(winners.map(winner => repo.create({
                    member_id: winner.memberId, category, month, year,
                    total_points: winner.monthlyPoints, rank: winner.rank,
                })));
            });

            this.logger.log(
                `Successfully replaced hof_list records (${winners.length} rows) for category: '${category}', period: ${year}-${month}`,
            );
            return true;
        } catch (error) {
            this.logger.error(
                `Failed to sync/replace hof_list for category: '${category}', period: ${year}-${month}`,
                error?.stack || error,
            );
            return false;
        }
    }

    /**
     * Menyimpan data pemenang secara manual ke hof_list.
     * Task:
     * 1. Cek apakah user id exist atau tidak
     * 2. Ambil point user dari tabel quest_points
     * 3. Simpan ke tabel hof_list
     * Mengembalikan boolean (true jika berhasil, false jika gagal).
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

            // Normalize category name to standard HOF category names
            const normalized = (winner_type || '').trim().toLowerCase();
            let category = winner_type;
            if (normalized === 'paling-eksis' || normalized === 'paling eksis') {
                category = 'Paling Eksis';
            } else if (normalized === 'pendatang-terbaik' || normalized === 'pendatang terbaik') {
                category = 'Pendatang Terbaik';
            } else if (normalized === 'tampil-kembali' || normalized === 'tampil kembali') {
                category = 'Tampil kembali';
            }

            // 3. Tentukan rank / position jika tidak disediakan
            if (!rank || rank <= 0) {
                const currentCount = await this.hofListRepo.count({
                    where: { category, year, month },
                });
                rank = currentCount + 1;
            }

            // 4. Simpan ke hof_list (update jika member sudah ada di periode ini, atau insert baru)
            let hofRecord = await this.hofListRepo.findOne({
                where: { member_id: user.id, category, year, month },
            });

            if (hofRecord) {
                hofRecord.total_points = totalPoints;
                if (rankParam || (typeof paramsOrPeriod === 'object' && (paramsOrPeriod as any).rank)) {
                    hofRecord.rank = rank;
                }
                await this.hofListRepo.save(hofRecord);
            } else {
                hofRecord = this.hofListRepo.create({
                    member_id: user.id,
                    category,
                    month,
                    year,
                    total_points: totalPoints,
                    rank,
                });
                await this.hofListRepo.save(hofRecord);
            }

            this.logger.log(
                `saveManual: successfully saved member ${user.id} to hof_list (category: '${category}', period: ${year}-${month}, points: ${totalPoints}, rank: ${rank})`,
            );
            return true;
        } catch (error) {
            this.logger.error(`saveManual failed:`, error?.stack || error);
            return false;
        }
    }

    /**
     * Update position / rank of a winner record in hof_list by id
     */
    async updateWinnerPosition(id: number, position: number): Promise<boolean> {
        try {
            if (!id) {
                this.logger.warn('updateWinnerPosition: id is required');
                return false;
            }

            const record = await this.hofListRepo.findOne({
                where: { id: Number(id) },
            });

            if (!record) {
                this.logger.warn(`updateWinnerPosition: record with id ${id} not found`);
                return false;
            }

            record.rank = Number(position);
            await this.hofListRepo.save(record);
            this.logger.log(`updateWinnerPosition: record ${id} rank updated to ${position}`);
            return true;
        } catch (error) {
            this.logger.error(`updateWinnerPosition failed for id ${id}:`, error?.stack || error);
            return false;
        }
    }

    /**
     * Delete a winner record from hof_list by id
     */
    async deleteWinner(id: number): Promise<boolean> {
        try {
            if (!id) {
                this.logger.warn('deleteWinner: id is required');
                return false;
            }

            const record = await this.hofListRepo.findOne({
                where: { id: Number(id) },
            });

            if (!record) {
                this.logger.warn(`deleteWinner: record with id ${id} not found`);
                return false;
            }

            await this.hofListRepo.delete(Number(id));
            this.logger.log(`deleteWinner: successfully deleted record with id ${id}`);
            return true;
        } catch (error) {
            this.logger.error(`deleteWinner failed for id ${id}:`, error?.stack || error);
            return false;
        }
    }
}

