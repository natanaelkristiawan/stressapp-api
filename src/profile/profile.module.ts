import { ContentModerationModule } from '../content-moderation/content-moderation.module';
import { Module } from '@nestjs/common';
import {
  MemberFriendsController,
  MemberProfileController,
  ProfileController,
} from './profile.controller';
import { ProfileService } from './profile.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { AssetsEntity } from 'src/entity/asset.entity';
import { PostTagsEntity } from 'src/entity/post-tags.entity';
import { PostEntity } from 'src/entity/post.entity';
import { ReactionEntity } from 'src/entity/reaction.entity';
import { SpaceEntity } from 'src/entity/space.entity';
import { TagsEntity } from 'src/entity/tags.entity';
import { PostService } from 'src/post/post.service';
import { UserFollowEntity } from 'src/entity/user-follow.entity';
import { MemberSpaceEntity } from 'src/entity/member-spaces.entity';
import { QueueModule } from 'src/queue/queue.module';
import { CommentEntity } from 'src/entity/comment.entity';
import { ActivityModule } from 'src/activity/activity.module';
import { QuestModule } from 'src/quest/quest.module';
import { MemberVoteModule } from 'src/member-vote/member-vote.module';
import { UserAdmin } from 'src/entity/user-admin.entity';
import { MemberAuthModule } from 'src/member-auth/member-auth.module';

@Module({
  imports:[
    ContentModerationModule,
    MemberAuthModule,
    TypeOrmModule.forFeature([UserMimateEntity, PostEntity, TagsEntity,  PostTagsEntity, AssetsEntity, SpaceEntity, ReactionEntity, UserFollowEntity, MemberSpaceEntity, CommentEntity, UserAdmin], 'mimate'),
    QueueModule,
    ActivityModule,
    QuestModule,
    MemberVoteModule
  ],
  controllers: [
    ProfileController,
    MemberFriendsController,
    MemberProfileController,
  ],
  providers: [ProfileService, PostService],
  exports: [ProfileService]
})
export class ProfileModule {}
