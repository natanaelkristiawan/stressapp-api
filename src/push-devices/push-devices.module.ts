import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { CmsMembersGuard } from '../cms-members/cms-members.guard';
import { CmsPushSettingsController } from './cms-push-settings.controller';
import { PushNotificationsService } from './push-notifications.service';
import { Module } from '@nestjs/common';
import { MemberAuthModule } from '../member-auth/member-auth.module';
import { PushDevicesController } from './push-devices.controller';
import { PushDevicesService } from './push-devices.service';

@Module({
  imports: [MemberAuthModule, AdminAuthModule],
  controllers: [PushDevicesController, CmsPushSettingsController],
  providers: [PushDevicesService, PushNotificationsService, CmsMembersGuard],
  exports: [PushDevicesService, PushNotificationsService],
})
export class PushDevicesModule {}
