import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { CmsMembersGuard } from '../cms-members/cms-members.guard';
import { GameLevel } from '../entity/game-level.entity';
import { Game } from '../entity/game.entity';
import { GameStep } from '../entity/game-step.entity';
import { MemberGameSubmission } from '../entity/member-game-submission.entity';
import { AdminGameController } from './admin-game.controller';
import { AdminGameService } from './admin-game.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GameLevel,
      Game,
      GameStep,
      MemberGameSubmission,
    ]),
    AdminAuthModule,
  ],
  controllers: [AdminGameController],
  providers: [AdminGameService, CmsMembersGuard],
  exports: [AdminGameService],
})
export class AdminGameModule {}

