import { periodOf } from 'src/leaderboard/leaderboard.rules';
import { LeaderboardService } from 'src/leaderboard/leaderboard.service';
import { Injectable, Logger } from '@nestjs/common';
import { WinnerSetService } from 'src/admin-quest/winner-set.service';
import { BackupService } from 'src/admin-quest/backup.service';
import { AdminSettingService } from 'src/admin-setting/admin-setting.service';
import {
  HofGenerationResultInterface,
  MonthlyMaintenanceResultInterface,
} from './interfaces/cron.interface';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly leaderboard: LeaderboardService,
    private readonly winnerSetService: WinnerSetService,
    private readonly backupService: BackupService,
    private readonly adminSettingService: AdminSettingService,
  ) {}

  async validateLeaderboard() {
    return this.leaderboard.validate();
  }

  /**
   * Daily Hall of Fame (HOF) Generation
   * Note: Automatic cron schedule disabled. Trigger manually via GET /cron/daily-hof
   * Evaluates and populates top winners for:
   * - Paling Eksis
   * - Pendatang Terbaik
   * - Tampil Kembali
   */
  // @Cron('0 13 * * *', {
  //   name: 'daily-hof-generation',
  //   timeZone: 'Asia/Singapore',
  // })
  async handleDailyHofGeneration(): Promise<HofGenerationResultInterface> {
    return this.leaderboard.daily(() => this.generateDailyHof());
  }

  private async generateDailyHof(): Promise<HofGenerationResultInterface> {
    this.logger.log(
      'Starting daily Hall of Fame (HOF) generation for all categories...',
    );
    if (this.leaderboard.enabled) {
      await this.leaderboard.sync(periodOf(), true);
      return {
        mostExistSuccess: true,
        newcomerSuccess: true,
        tampilKembaliSuccess: true,
      };
    }

    let mostExistSuccess = false;
    let newcomerSuccess = false;
    let tampilKembaliSuccess = false;

    try {
      // 1. Paling Eksis
      mostExistSuccess = await this.winnerSetService.getMostExistUsers({});
      this.logger.log(
        `HOF 'Paling Eksis' generation completed: ${
          mostExistSuccess ? 'SUCCESS' : 'FAILED'
        }`,
      );
    } catch (error) {
      this.logger.error(
        `HOF 'Paling Eksis' generation error: ${error?.message || error}`,
        error?.stack,
      );
    }

    try {
      // 2. Pendatang Terbaik
      newcomerSuccess = await this.winnerSetService.getBestNewcomerUsers({});
      this.logger.log(
        `HOF 'Pendatang Terbaik' generation completed: ${
          newcomerSuccess ? 'SUCCESS' : 'FAILED'
        }`,
      );
    } catch (error) {
      this.logger.error(
        `HOF 'Pendatang Terbaik' generation error: ${error?.message || error}`,
        error?.stack,
      );
    }

    try {
      // 3. Tampil Kembali
      tampilKembaliSuccess = await this.winnerSetService.getTampilKembaliUsers(
        {},
      );
      this.logger.log(
        `HOF 'Tampil Kembali' generation completed: ${
          tampilKembaliSuccess ? 'SUCCESS' : 'FAILED'
        }`,
      );
    } catch (error) {
      this.logger.error(
        `HOF 'Tampil Kembali' generation error: ${error?.message || error}`,
        error?.stack,
      );
    }

    this.logger.log('Daily Hall of Fame (HOF) generation routine finished.');
    return {
      mostExistSuccess,
      newcomerSuccess,
      tampilKembaliSuccess,
    };
  }

  /**
   * Monthly Maintenance Routine
   * Note: Automatic cron schedule disabled. Trigger manually via GET /cron/monthly-maintenance
   * 1. Backs up latest user activity into log_last_active_manual
   * 2. Archives and resets member quest points targeting the concluded previous month
   */
  // @Cron('0 0 1 * *', {
  //   name: 'monthly-maintenance',
  //   timeZone: 'Asia/Singapore',
  // })
  async handleMonthlyMaintenance(): Promise<MonthlyMaintenanceResultInterface> {
    this.logger.log('Starting monthly 1st-of-month maintenance routine...');

    let syncResult: any = null;
    let resetSuccess = false;
    let targetPeriod = '';

    // Step 1: Backup Latest Activity User
    try {
      this.logger.log(
        'Step 1: Running Backup Latest Activity User (syncLatestUserDataAccess)...',
      );
      syncResult = await this.adminSettingService.syncLatestUserDataAccess({
        truncate: true,
      });
      this.logger.log(
        `Step 1 completed in ${syncResult?.executionTimeMs || 0}ms (Total: ${
          syncResult?.totalProcessed || 0
        }, With Activity: ${syncResult?.totalWithActivity || 0})`,
      );
    } catch (error) {
      this.logger.error(
        `Step 1 (Backup Latest Activity) failed: ${error?.message || error}`,
        error?.stack,
      );
    }

    // Step 2: Backup and Reset Member Points for the concluded previous month
    try {
      // Calculate concluded month and year in Asia/Singapore (GMT+8) timezone
      const gmt8DateStr = new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Singapore',
      });
      const gmt8Now = new Date(gmt8DateStr);
      let targetYear = gmt8Now.getFullYear();
      let targetMonth = gmt8Now.getMonth(); // 0 for Jan, 9 for Oct (represents previous month since today is 1st)

      if (targetMonth === 0) {
        targetMonth = 12; // December of previous year
        targetYear -= 1;
      }

      targetPeriod = `${targetYear}-${targetMonth}`;
      this.logger.log(
        `Step 2: Archiving & resetting member points for concluded period: ${targetPeriod}...`,
      );
      resetSuccess = await this.backupService.resetAllPoint(
        targetYear,
        targetMonth,
      );
      this.logger.log(
        `Step 2 (Member Points Reset) completed: ${
          resetSuccess ? 'SUCCESS' : 'FAILED'
        }`,
      );
    } catch (error) {
      this.logger.error(
        `Step 2 (Member Points Reset) failed: ${error?.message || error}`,
        error?.stack,
      );
    }

    this.logger.log('Monthly 1st-of-month maintenance routine finished.');
    return {
      syncResult,
      resetSuccess,
      targetPeriod,
    };
  }
}
