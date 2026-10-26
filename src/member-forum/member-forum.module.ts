import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemberAuthModule } from 'src/member-auth/member-auth.module';
import { PostModule } from 'src/post/post.module';
import { SpaceModule } from 'src/space/space.module';
import { CommentModule } from 'src/comment/comment.module';
import { ReactionModule } from 'src/reaction/reaction.module';
import { PostReportModule } from 'src/post-report/post-report.module';
import { PostEntity } from 'src/entity/post.entity';
import { SpaceEntity } from 'src/entity/space.entity';
import { ReactionEntity } from 'src/entity/reaction.entity';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { MemberForumController } from './member-forum.controller';
import { MemberForumService } from './member-forum.service';

@Module({
  imports: [
    MemberAuthModule,
    PostModule,
    SpaceModule,
    CommentModule,
    ReactionModule,
    PostReportModule,
    TypeOrmModule.forFeature(
      [PostEntity, SpaceEntity, ReactionEntity, UserMimateEntity],
      'mimate',
    ),
  ],
  controllers: [MemberForumController],
  providers: [MemberForumService],
  exports: [MemberForumService],
})
export class MemberForumModule {}
