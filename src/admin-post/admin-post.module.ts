import { ContentImportController } from './content-import.controller';
import { ContentImportService } from './content-import.service';
import { CmsModerationSettingsController } from '../content-moderation/cms-moderation-settings.controller';
import { ContentModerationModule } from '../content-moderation/content-moderation.module';
import { PsychoeducationController } from './psychoeducation.controller';
import { AdminPostContentService } from './admin-post-content.service';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { CmsMembersGuard } from '../cms-members/cms-members.guard';
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
  imports: [
    ContentModerationModule,
    AdminAuthModule,
    TypeOrmModule.forFeature(
      [PostEntity, SpaceEntity, UserMimateEntity, TagsEntity, Activity],
      'mimate',
    ),
    QueueModule,
    PostModule,
    ActivityModule,
    MemberVoteModule,
  ],
  controllers: [
    ContentImportController,
    AdminPostController,
    PsychoeducationController,
    CmsModerationSettingsController,
  ],
  providers: [
    ContentImportService,
    AdminPostService,
    AdminPostActivityService,
    AdminPostContentService,
    CmsMembersGuard,
  ],
  exports: [AdminPostService],
})
export class AdminPostModule {}
