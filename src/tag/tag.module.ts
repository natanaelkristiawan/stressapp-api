import { Module } from '@nestjs/common';
import { TagService } from './tag.service';
import { TagController } from './tag.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostTagsEntity } from '../entity/post-tags.entity';

@Module({
  // entity tag
  imports: [TypeOrmModule.forFeature([PostTagsEntity], 'mimate')],
  providers: [TagService],
  controllers: [TagController]
})
export class TagModule {}
