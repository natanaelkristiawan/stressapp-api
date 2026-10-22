import { formatUtc as format } from '../common/helpers/date.helper';
import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QuestPoint } from "src/entity/quest-point.entity";
import { QuestBackup } from "src/entity/quest-backup.entity";
import { Action, QuestBackupLog } from "src/entity/quest-backup-log.entity";
import { Repository } from "typeorm";
import { BackupMode, BackupResultInterface } from "./interfaces/backup.interface";
import { LogResetDto } from "./dtos/log-reset.dto";
import { LogResetItemInterface, LogResetResponseInterface } from "./interfaces/log-reset.interface";



@Injectable()
export class BackupService {
    private readonly logger = new Logger(BackupService.name);

    constructor(
        @InjectRepository(QuestPoint, 'mimate')
        private questPointRepository: Repository<QuestPoint>,

        @InjectRepository(QuestBackup, 'mimate')
        private questBackupRepository: Repository<QuestBackup>,

        @InjectRepository(QuestBackupLog, 'mimate')
        private questBackupLogRepository: Repository<QuestBackupLog>,
    ) { }


    async backupDataAllMemberDetailed(year: number, month: number, mode?: BackupMode): Promise<BackupResultInterface> {
        const selectedMode: BackupMode = mode

        // Fetch all quest points
        const questPoints = await this.questPointRepository.find();

        // Fetch existing backups for the captured year and month
        const existingBackups = await this.questBackupRepository.find({
            where: {
                year,
                month,
            },
        });

        // Index existing backups by memberId
        const existingBackupMap = new Map<number, QuestBackup>();
        for (const backup of existingBackups) {
            if (backup.memberId) {
                existingBackupMap.set(backup.memberId, backup);
            }
        }

        const toSave: QuestBackup[] = [];
        let totalCreated = 0;
        let totalUpdated = 0;

        for (const qp of questPoints) {
            if (!qp.memberId) continue;

            const existing = existingBackupMap.get(qp.memberId);
            if (existing) {
                // Data user exists in this period
                if (selectedMode === 'reset') {
                    // Mode append: calculate total data (existing total + current points)
                    existing.totalPoints = (Number(existing.totalPoints) || 0) + (Number(qp.totalPoints) || 0);
                } else {
                    // Mode replace: overwrite existing points with current points
                    existing.totalPoints = Number(qp.totalPoints) || 0;
                }
                toSave.push(existing);
                totalUpdated++;
            } else {
                // Not backed up yet -> create new data
                const newBackup = this.questBackupRepository.create({
                    memberId: qp.memberId,
                    year,
                    month,
                    totalPoints: Number(qp.totalPoints) || 0,
                });
                toSave.push(newBackup);
                existingBackupMap.set(qp.memberId, newBackup);
                totalCreated++;
            }
        }

        if (toSave.length > 0) {
            await this.questBackupRepository.save(toSave, { chunk: 500 });
        }


        if (mode == 'backup') {
            // Record log for backup action
            await this.sendLog(Action.BACKUP, year, month);
        }


        this.logger.log(
            `Quest points backup completed for year ${year}, month ${month} [mode: ${selectedMode}]: ${toSave.length} records processed (${totalCreated} created, ${totalUpdated} updated).`
        );

        return {
            year,
            month,
            mode: selectedMode,
            totalProcessed: toSave.length,
            totalCreated,
            totalUpdated,
        };
    }

    async resetAllPoint(year: number, month: number): Promise<boolean> {
        try {

            // check if that period is already reset or not
            let isAlreadyReset = await this.isPeriodAlreadyReset(year, month)


            await this.backupDataAllMemberDetailed(year, month, isAlreadyReset ? 'reset' : 'backup')

            await this.questPointRepository
                .createQueryBuilder()
                .update(QuestPoint)
                .set({ totalPoints: 0 })
                .execute();

            // Record log for reset action
            await this.sendLog(Action.RESET, year, month);


            this.logger.log(`All quest points have been successfully reset to 0 for period ${year}-${month}.`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to reset quest points: ${error.message}`, error.stack);
            throw error;
        }
    }

    async isPeriodAlreadyReset(year: number, month: number): Promise<boolean> {
        const currentDate = new Date();


        const count = await this.questBackupLogRepository.count({
            where: {
                action: Action.RESET,
                year: year,
                month: month,
            },
        });

        return count > 0;
    }

    async sendLog(action: Action, year?: number, month?: number): Promise<QuestBackupLog> {
        try {

            const log = this.questBackupLogRepository.create({
                action,
                year: year,
                month: month,
            });

            const savedLog = await this.questBackupLogRepository.save(log);
            this.logger.log(`Quest backup log created: action=${action}, year=${year}, month=${month}, id=${savedLog.id}`);
            return savedLog;
        } catch (error) {
            this.logger.error(`Failed to create quest backup log: ${error.message}`, error.stack);
            throw error;
        }
    }

    async getLogResetHistory(memberId: number, dto?: LogResetDto): Promise<LogResetResponseInterface> {
        const page = dto?.page && dto.page > 0 ? Number(dto.page) : 1;
        const limit = dto?.limit && dto.limit > 0 ? Number(dto.limit) : 10;
        const skip = (page - 1) * limit;

        const qb = this.questBackupRepository
            .createQueryBuilder('qb')
            .where('qb.memberId = :memberId', { memberId });

        const sortField = dto?.sortField || 'created_at';
        const sortType = (dto?.sortType || 'desc').toUpperCase() as 'ASC' | 'DESC';

        if (sortField === 'year') {
            qb.orderBy('qb.year', sortType).addOrderBy('qb.month', sortType);
        } else if (sortField === 'month') {
            qb.orderBy('qb.month', sortType);
        } else if (sortField === 'pointReset' || sortField === 'totalPoints') {
            qb.orderBy('qb.totalPoints', sortType);
        } else {
            qb.orderBy('qb.createdAt', sortType);
        }

        qb.skip(skip).take(limit);

        const [items, total] = await qb.getManyAndCount();

        const formattedItems: LogResetItemInterface[] = items.map((item) => {
            const resetAt = item.createdAt
                ? format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm:ss')
                : '-';

            return {
                id: item.id,
                month: item.month,
                year: item.year,
                pointReset: Number(item.totalPoints) || 0,
                resetAt,
            };
        });

        return {
            items: formattedItems,
            recordsTotal: total,
            recordsFiltered: total,
        };
    }
}
