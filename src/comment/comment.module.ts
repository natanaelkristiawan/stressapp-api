import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { CmsMembersGuard } from '../cms-members/cms-members.guard';
import { ContentModerationModule } from '../content-moderation/content-moderation.module';
import { Module } from '@nestjs/common';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostEntity } from 'src/entity/post.entity';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { CommentEntity } from 'src/entity/comment.entity';
import { Activity } from 'src/entity/activity.entity';
import { QueueModule } from 'src/queue/queue.module';
import { ActivityModule } from 'src/activity/activity.module';
import { CommentReactionEntity } from 'src/entity/comment-reaction.entity';
@Module({
  imports: [
    AdminAuthModule,
    ContentModerationModule,
    TypeOrmModule.forFeature(
      [
        UserMimateEntity,
        PostEntity,
        CommentEntity,
        Activity,
        CommentReactionEntity,
      ],
      'mimate',
    ),
    QueueModule,
    ActivityModule,
  ],
  controllers: [CommentController],
  providers: [CmsMembersGuard, CommentService],
})
export class CommentModule {}
