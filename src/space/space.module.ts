import { Module } from '@nestjs/common';
import { SpaceController } from './space.controller';
import { SpaceService } from './space.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpaceEntity } from 'src/entity/space.entity';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { MemberSpaceEntity } from 'src/entity/member-spaces.entity';
import { PostEntity } from 'src/entity/post.entity';
import { TagsEntity } from 'src/entity/tags.entity';
import { PostTagsEntity } from 'src/entity/post-tags.entity';
import { AssetsEntity } from 'src/entity/asset.entity';
import { UserFollowEntity } from 'src/entity/user-follow.entity';
import { PostModule } from 'src/post/post.module';

@Module({
  imports:[
      TypeOrmModule.forFeature([SpaceEntity, UserMimateEntity, MemberSpaceEntity, PostEntity, TagsEntity, PostTagsEntity, AssetsEntity, UserFollowEntity], 'mimate'),
      PostModule,
    ],
  controllers: [SpaceController],
  providers: [SpaceService],
  exports: [SpaceService]

})
export class SpaceModule {}
