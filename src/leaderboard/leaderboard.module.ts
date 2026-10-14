import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardProcessor } from './leaderboard.processor';
@Module({
  imports: [BullModule.registerQueue({ name: 'leaderboard-update-queue' })],
  providers: [LeaderboardService, LeaderboardProcessor],
  exports: [LeaderboardService],
})
export class LeaderboardModule {}
