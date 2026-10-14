import { Module } from '@nestjs/common';
import { PostReportController } from './post-report.controller';
import { PostReportService } from './post-report.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostReport } from 'src/entity/post-report.entity';
import { PostEntity } from 'src/entity/post.entity';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PostReport, PostEntity, UserMimateEntity], 'mimate')],
  controllers: [PostReportController],
  providers: [PostReportService]
})
export class PostReportModule {}
