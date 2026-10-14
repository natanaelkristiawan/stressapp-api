import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { OnApplicationBootstrap } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
@Processor('leaderboard-update-queue', { concurrency: 1 })
export class LeaderboardProcessor
  extends WorkerHost
  implements OnApplicationBootstrap
{
  constructor(private readonly leaderboard: LeaderboardService) {
    super();
  }
  async onApplicationBootstrap() {
    if (!this.leaderboard.enabled) await this.worker.pause(true);
  }
  async process(job: Job<{ period: string; memberId: number }>) {
    if (!this.leaderboard.enabled)
      throw new Error('Leaderboard worker is disabled');
    await this.leaderboard.project(job.data.period, job.data.memberId);
  }
}
