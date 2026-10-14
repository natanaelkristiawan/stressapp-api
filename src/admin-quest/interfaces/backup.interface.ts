import { Action } from 'src/entity/quest-backup-log.entity';

export type BackupMode = 'backup' | 'reset';

export interface BackupResultInterface {
    year: number;
    month: number;
    mode: BackupMode;
    totalProcessed: number;
    totalCreated: number;
    totalUpdated: number;
}

export interface QuestBackupLogInterface {
    id?: number;
    year: number;
    month: number;
    action: Action;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface CheckPeriodResetInterface {
    year: number;
    month: number;
    isReset: boolean;
}
