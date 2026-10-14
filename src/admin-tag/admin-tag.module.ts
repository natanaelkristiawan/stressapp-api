import { Module } from '@nestjs/common';
import { AdminTagController } from './admin-tag.controller';
import { AdminTagService } from './admin-tag.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TagsEntity } from 'src/entity/tags.entity';
import { AdminPostModule } from 'src/admin-post/admin-post.module';
import { PostTagsEntity } from 'src/entity/post-tags.entity';

@Module({
  // include tags entity
  imports: [TypeOrmModule.forFeature([TagsEntity, PostTagsEntity], 'mimate'),
    AdminPostModule
  ],
  controllers: [AdminTagController],
  providers: [AdminTagService]
})
export class AdminTagModule {}
