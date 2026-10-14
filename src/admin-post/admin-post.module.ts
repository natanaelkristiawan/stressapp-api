import { Module } from '@nestjs/common';
import { AdminPostController } from './admin-post.controller';
import { AdminPostService } from './admin-post.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostEntity } from 'src/entity/post.entity';
import { SpaceEntity } from 'src/entity/space.entity';
import { QueueModule } from 'src/queue/queue.module';
import { PostModule } from 'src/post/post.module';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { ActivityModule } from 'src/activity/activity.module';
import { TagsEntity } from 'src/entity/tags.entity';
import { MemberVoteModule } from 'src/member-vote/member-vote.module';
import { Activity } from 'src/entity/activity.entity';
import { AdminPostActivityService } from './admin-post-activity.service';

@Module({
  imports: [TypeOrmModule.forFeature([PostEntity, SpaceEntity, UserMimateEntity, TagsEntity, Activity ], 'mimate'), QueueModule, PostModule, ActivityModule,
  MemberVoteModule
],
  controllers: [AdminPostController],
  providers: [AdminPostService, AdminPostActivityService],
  exports: [AdminPostService]
})
export class AdminPostModule {}
