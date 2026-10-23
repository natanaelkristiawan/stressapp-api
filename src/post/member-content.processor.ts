import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  COMMENT_QUEUE,
  CommentJob,
  MemberContentService,
} from './member-content.service';

@Processor(COMMENT_QUEUE, { concurrency: 2 })
export class MemberContentProcessor extends WorkerHost {
  constructor(private readonly content: MemberContentService) {
    super();
  }
  /** Retries transient failures; payload contains no member text or credentials. */
  async process(job: Job<CommentJob>) {
    await this.content.moderateComment(job.data);
  }
}
