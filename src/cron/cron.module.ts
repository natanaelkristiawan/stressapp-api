import { LeaderboardModule } from 'src/leaderboard/leaderboard.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminQuestModule } from 'src/admin-quest/admin-quest.module';
import { AdminSettingModule } from 'src/admin-setting/admin-setting.module';
import { CronController } from './cron.controller';
import { CronService } from './cron.service';
import { BasicAuthGuard } from './guards/basic-auth.guard';

@Module({
  imports: [
    LeaderboardModule,
    ScheduleModule.forRoot(),
    ConfigModule,
    AdminQuestModule,
    AdminSettingModule,
  ],
  controllers: [CronController],
  providers: [CronService, BasicAuthGuard],
  exports: [CronService],
})
export class CronModule {}
