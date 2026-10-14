import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CaptureBsiController } from './capture-bsi.controller';
import { CaptureBsiService } from './capture-bsi.service';
import { BasicAuthMiddleware } from 'src/middleware/basic-auth.middleware';
import { AdminUserModule } from 'src/admin-user/admin-user.module';
import { AdminPostModule } from 'src/admin-post/admin-post.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReactionEntity } from 'src/entity/reaction.entity';
import { PostEntity } from 'src/entity/post.entity';
import { CommentEntity } from 'src/entity/comment.entity';
import { SpaceEntity } from 'src/entity/space.entity';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { TagsEntity } from 'src/entity/tags.entity';
import { PostTagsEntity } from 'src/entity/post-tags.entity';
import { AdminSpaceModule } from 'src/admin-space/admin-space.module';

@Module({
  controllers: [CaptureBsiController],
  providers: [CaptureBsiService],
  imports:[
    AdminUserModule,
    AdminPostModule,
    AdminSpaceModule,
    TypeOrmModule.forFeature([ReactionEntity, PostEntity, SpaceEntity, CommentEntity, UserMimateEntity, TagsEntity, PostTagsEntity], 'mimate')

  ]
})
export class CaptureBsiModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(BasicAuthMiddleware)
      .forRoutes('capture-bsi'); // applies to ALL routes under /capture-bsi
  }
}
