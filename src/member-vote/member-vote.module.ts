import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { MemberVoteService } from './member-vote.service';
import { MemberVoteController } from './member-vote.controller';
import { VoteTotalsProcessor } from './vote-totals.processor';
import { VoteMemberEntity } from 'src/entity/vote-member.entity';
import { PostEntity } from 'src/entity/post.entity';
import { VoteEntity } from 'src/entity/vote.entity';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [VoteMemberEntity, PostEntity, VoteEntity, UserMimateEntity],
      'mimate',
    ),
    BullModule.registerQueue({ name: 'vote-totals-queue' }),
  ],
  exports:[MemberVoteService],
  providers: [MemberVoteService, VoteTotalsProcessor],
  controllers: [MemberVoteController],
})
export class MemberVoteModule {}
