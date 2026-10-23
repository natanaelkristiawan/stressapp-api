import { MemberContentController } from './member-content.controller';
import { MemberContentService, COMMENT_QUEUE } from './member-content.service';
import { MemberContentProcessor } from './member-content.processor';
import { MemberAuthModule } from '../member-auth/member-auth.module';
import { BullModule } from '@nestjs/bullmq';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { CmsMembersGuard } from '../cms-members/cms-members.guard';
import { ContentModerationModule } from '../content-moderation/content-moderation.module';
import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { VoteService } from './vote.service';
import { PostController } from './post.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { PostEntity } from 'src/entity/post.entity';
import { TagsEntity } from 'src/entity/tags.entity';
import { PostTagsEntity } from 'src/entity/post-tags.entity';
import { AssetsEntity } from 'src/entity/asset.entity';
import { SpaceEntity } from 'src/entity/space.entity';
import { ReactionEntity } from 'src/entity/reaction.entity';
import { UserFollowEntity } from 'src/entity/user-follow.entity';
import { Activity } from 'src/entity/activity.entity';
import { ProfileModule } from 'src/profile/profile.module';
import { ActivityModule } from 'src/activity/activity.module';
import { QueueModule } from 'src/queue/queue.module';
import { MemberSpaceEntity } from 'src/entity/member-spaces.entity';
import { VoteEntity } from 'src/entity/vote.entity';
import { UserAdmin } from 'src/entity/user-admin.entity';
import { MoengageModule } from 'src/moengage/moengage.module';
import { MemberVoteModule } from 'src/member-vote/member-vote.module';
@Module({
  imports: [
    MemberAuthModule,
    BullModule.registerQueue({ name: COMMENT_QUEUE }),
    AdminAuthModule,
    ContentModerationModule,
    TypeOrmModule.forFeature(
      [
        UserMimateEntity,
        PostEntity,
        TagsEntity,
        PostTagsEntity,
        AssetsEntity,
        SpaceEntity,
        ReactionEntity,
        UserFollowEntity,
        Activity,
        MemberSpaceEntity,
        VoteEntity,
        UserAdmin,
      ],
      'mimate',
    ),
    ProfileModule,
    ActivityModule,
    QueueModule,
    MoengageModule,
    MemberVoteModule,
  ],
  exports: [PostService, VoteService],
  providers: [
    MemberContentService,
    MemberContentProcessor,
    CmsMembersGuard,
    PostService,
    VoteService,
  ],
  controllers: [PostController, MemberContentController],
})
export class PostModule {}
