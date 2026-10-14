// queue.service.ts
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { JobDto } from './dtos/job.dto';

@Injectable()
export class QueueService {
  constructor(@InjectQueue('notification-queue') private notificationQueue: Queue) {}

  async addJob(jobName: string, data: JobDto) {
    await this.notificationQueue.add(jobName, data, {
      removeOnComplete: true,
      removeOnFail: true,
    });
  }
}


