import { Module } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Activity } from '../entity/activity.entity';
import { PostEntity } from 'src/entity/post.entity';
import { QuestModule } from 'src/quest/quest.module';
import { CommentEntity } from 'src/entity/comment.entity';
import { ReactionEntity } from 'src/entity/reaction.entity';
import { ActivityController } from './activity.controller';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { OlympicService } from './olympic.service';
import { UserAdmin } from 'src/entity/user-admin.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([Activity, PostEntity, CommentEntity, ReactionEntity, UserMimateEntity, UserAdmin], 'mimate'),
    QuestModule
  ],
  providers: [ActivityService, OlympicService],
  exports: [ActivityService, OlympicService],
  controllers: [ActivityController]
})
export class ActivityModule {

}
