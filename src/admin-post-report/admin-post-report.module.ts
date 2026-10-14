import { Module } from '@nestjs/common';
import { AdminPostReportController } from './admin-post-report.controller';
import { AdminPostReportService } from './admin-post-report.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostReport } from '../entity/post-report.entity';
import { PostEntity } from '../entity/post.entity';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { TagsEntity } from 'src/entity/tags.entity';

@Module({
  imports: [
    // typeorm
    TypeOrmModule.forFeature([PostReport, PostEntity, TagsEntity], 'mimate'),
    // redis
    RedisModule
  ],
  controllers: [AdminPostReportController],
  providers: [AdminPostReportService]
})
export class AdminPostReportModule {}
