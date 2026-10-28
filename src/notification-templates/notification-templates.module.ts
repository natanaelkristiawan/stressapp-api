import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { CmsMembersGuard } from '../cms-members/cms-members.guard';
import { NotificationTemplatesController } from './notification-templates.controller';
import { NotificationTemplatesService } from './notification-templates.service';

@Module({
  imports: [AdminAuthModule],
  controllers: [NotificationTemplatesController],
  providers: [NotificationTemplatesService, CmsMembersGuard],
  exports: [NotificationTemplatesService],
})
export class NotificationTemplatesModule {}
