import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameLevel } from '../entity/game-level.entity';
import { Game } from '../entity/game.entity';
import { GameStep } from '../entity/game-step.entity';
import { MemberGameProgress } from '../entity/member-game-progress.entity';
import { MemberGameSubmission } from '../entity/member-game-submission.entity';
import { QuestPoint } from '../entity/quest-point.entity';
import { QuestPointDetail } from '../entity/quest-point-detail.entity';
import { Member } from '../entity/user-mimate.entity';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { MemberAuthModule } from '../member-auth/member-auth.module';
import { MemberGameController } from './member-game.controller';
import { MemberGameService } from './member-game.service';

@Module({
  imports: [
    MemberAuthModule,
    LeaderboardModule,
    TypeOrmModule.forFeature(
      [
        GameLevel,
        Game,
        GameStep,
        MemberGameProgress,
        MemberGameSubmission,
        QuestPoint,
        QuestPointDetail,
        Member,
      ],
      'mimate',
    ),
  ],
  controllers: [MemberGameController],
  providers: [MemberGameService],
  exports: [MemberGameService],
})
export class MemberGameModule {}

