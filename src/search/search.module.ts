import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { PostEntity } from 'src/entity/post.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DateHelper } from 'src/common/helpers/date.helper';
import { TagsEntity } from 'src/entity/tags.entity';
import { PostTagsEntity } from 'src/entity/post-tags.entity';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
@Module({
  imports: [TypeOrmModule.forFeature([PostEntity, TagsEntity, PostTagsEntity, UserMimateEntity], 'mimate')],
  controllers: [SearchController],
  providers: [SearchService, DateHelper]
})
export class SearchModule {}
