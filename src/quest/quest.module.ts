import { LeaderboardModule } from 'src/leaderboard/leaderboard.module';
import { Module } from '@nestjs/common';
import { QuestService } from './quest.service';
import { QuestController } from './quest.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quest } from 'src/entity/quest.entity';
import { QuestPoint } from 'src/entity/quest-point.entity';
import { QuestPointDetail } from 'src/entity/quest-point-detail.entity';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { PostEntity } from 'src/entity/post.entity';
import { CommentEntity } from 'src/entity/comment.entity';
import { ReactionEntity } from 'src/entity/reaction.entity';
import { Activity } from 'src/entity/activity.entity';
import { UserEntity } from 'src/entity/user.entity';
import { QuestBackup } from 'src/entity/quest-backup.entity';
import { QuestBackupLog } from 'src/entity/quest-backup-log.entity';
import { AdminQuestModule } from 'src/admin-quest/admin-quest.module';
import { AdminSettingModule } from 'src/admin-setting/admin-setting.module';

@Module({
  imports: [
    LeaderboardModule,
    TypeOrmModule.forFeature([Quest, QuestPoint, QuestPointDetail, UserMimateEntity, PostEntity, CommentEntity, ReactionEntity, Activity, QuestBackup, QuestBackupLog], 'mimate'),
    TypeOrmModule.forFeature([UserEntity], 'mmid'),
    AdminQuestModule,
    AdminSettingModule
  ],
  providers: [QuestService],
  controllers: [QuestController],
  exports: [QuestService]
})
export class QuestModule { }
