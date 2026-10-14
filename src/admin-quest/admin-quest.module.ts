import { Module } from '@nestjs/common';
import { AdminQuestService } from './admin-quest.service';
import { HistoryService } from './history.service';
import { MemberPointService } from './member-point.service';
import { BackupService } from './backup.service';
import { AdminQuestController } from './admin-quest.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quest } from 'src/entity/quest.entity';
import { QuestDetail } from 'src/entity/quest-detail.entity';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { QuestPointDetail } from 'src/entity/quest-point-detail.entity';
import { QuestPoint } from 'src/entity/quest-point.entity';
import { QuestBackup } from 'src/entity/quest-backup.entity';
import { QuestBackupLog } from 'src/entity/quest-backup-log.entity';
import { PostEntity } from 'src/entity/post.entity';
import { LogLastActiveManual } from 'src/entity/log-last-active-manual.entity';
import { HofList } from 'src/entity/hof-list.entity';
import { CampaignWinner } from 'src/entity/campaign-winner.entity';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { QuestConfigService } from './quest-config.service';
import { WinnerSetService } from './winner-set.service';
import { CampaignWinnerService } from './campaign-winner.service';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [Quest, QuestDetail, UserMimateEntity, QuestPointDetail, QuestPoint, QuestBackup, QuestBackupLog, PostEntity, LogLastActiveManual, HofList, CampaignWinner],
      'mimate',
    ),
  ],
  providers: [AdminQuestService, HistoryService, MemberPointService, BackupService, ReportService, QuestConfigService, WinnerSetService, CampaignWinnerService],
  controllers: [AdminQuestController, ReportController],
  exports: [AdminQuestService, HistoryService, MemberPointService, BackupService, ReportService, QuestConfigService, WinnerSetService, CampaignWinnerService],
})
export class AdminQuestModule { }
