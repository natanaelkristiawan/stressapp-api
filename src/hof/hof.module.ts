import { LeaderboardModule } from 'src/leaderboard/leaderboard.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HofList } from 'src/entity/hof-list.entity';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { HofController } from './hof.controller';
import { HofService } from './hof.service';

@Module({
  imports: [
    LeaderboardModule,
    TypeOrmModule.forFeature([HofList, UserMimateEntity], 'mimate'),
  ],
  controllers: [HofController],
  providers: [HofService],
  exports: [HofService],
})
export class HofModule {}
