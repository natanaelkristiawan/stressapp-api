import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { CmsMembersGuard } from '../cms-members/cms-members.guard';
import { CmsLogsController } from './cms-logs.controller';
import { CmsLogsService } from './cms-logs.service';

@Module({
  imports: [AdminAuthModule],
  controllers: [CmsLogsController],
  providers: [CmsMembersGuard, CmsLogsService],
})
export class CmsLogsModule {}
