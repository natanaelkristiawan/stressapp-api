import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VoteMemberEntity } from 'src/entity/vote-member.entity';
import { VoteEntity } from 'src/entity/vote.entity';
import { PostEntity } from 'src/entity/post.entity';

export interface VoteTotalsJobPayload {
  post_id: number;
}

@Processor('vote-totals-queue')
@Injectable()
export class VoteTotalsProcessor extends WorkerHost {
  private readonly logger = new Logger(VoteTotalsProcessor.name);

  constructor(
    @InjectRepository(VoteMemberEntity, 'mimate')
    private readonly voteMemberRepository: Repository<VoteMemberEntity>,
    @InjectRepository(VoteEntity, 'mimate')
    private readonly voteRepository: Repository<VoteEntity>,
    @InjectRepository(PostEntity, 'mimate')
    private readonly postRepository: Repository<PostEntity>,
  ) {
    super();
  }

  async process(job: Job<VoteTotalsJobPayload>) {
    this.logger.log(`Processing vote totals for post_id=${job.data.post_id}`);
    try {
      await this.recalculateVoteTotalsForPost(job.data.post_id);
      this.logger.log(`Vote totals updated for post_id=${job.data.post_id}`);
    } catch (error) {
      this.logger.error(`Error updating vote totals: ${error?.message}`, error?.stack);
      throw error;
    }
  }

  private async recalculateVoteTotalsForPost(postId: number): Promise<void> {
    const votes = await this.voteRepository.find({
      where: { postId },
      order: { order: 'ASC' },
    });

    let postTotal = 0;
    for (const vote of votes) {
      const count = await this.voteMemberRepository.count({
        where: { postId, voteId: vote.id },
      });
      await this.voteRepository.update(
        { id: vote.id },
        { total_vote: count },
      );
      postTotal += count;
    }

    await this.postRepository.update(
      { id: postId },
      { total_vote: postTotal },
    );
  }
}
