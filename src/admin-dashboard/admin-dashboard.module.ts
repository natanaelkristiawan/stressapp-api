import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { CmsMembersGuard } from '../cms-members/cms-members.guard';
import { Module } from '@nestjs/common';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Activity } from 'src/entity/activity.entity';
import { Member } from 'src/entity/user-mimate.entity';
import { SpaceEntity } from 'src/entity/space.entity';
import { PostEntity } from 'src/entity/post.entity';
import { ReportPostService } from './report-post.service';
import { CommentEntity } from 'src/entity/comment.entity';
import { CardRevisionService } from './card-revision.service';
import { ReactionEntity } from 'src/entity/reaction.entity';
import { DataSource } from 'typeorm';
import { ExportRevisionService } from './export-revision.service';
import { Visitor } from 'src/entity/visitor.entity';
import { ExportPostService } from './export-post.service';
import { RequestLogEntity } from 'src/entity/log.entity';

@Module({
  providers: [
    CmsMembersGuard,
    AdminDashboardService,
    ReportPostService,
    CardRevisionService,
    ExportRevisionService,
    ExportPostService,
  ],
  controllers: [AdminDashboardController],
  imports: [
    AdminAuthModule,
    TypeOrmModule.forFeature(
      [
        Activity,
        Member,
        SpaceEntity,
        PostEntity,
        CommentEntity,
        ReactionEntity,
        DataSource,
        Visitor,
        RequestLogEntity,
      ],
      'mimate',
    ),
  ],
})
export class AdminDashboardModule {}
