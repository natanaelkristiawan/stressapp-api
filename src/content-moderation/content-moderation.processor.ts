import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  ContentModerationService,
  MODERATION_QUEUE,
  ModerationJob,
} from './content-moderation.service';

@Processor(MODERATION_QUEUE, { concurrency: 2 })
export class ContentModerationProcessor extends WorkerHost {
  constructor(private readonly moderation: ContentModerationService) {
    super();
  }

  /** Bounded retries reuse the classification; no publication, notifications or points occur here. */
  async process(job: Job<ModerationJob>): Promise<void> {
    await this.moderation.retry(job.data);
  }
}
