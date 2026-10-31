import { Module } from '@nestjs/common';
import { NotificationTemplatesModule } from '../notification-templates/notification-templates.module';
import { PushDevicesModule } from '../push-devices/push-devices.module';
import { NotificationEventsProcessor } from './notification-events.processor';

@Module({
  imports: [NotificationTemplatesModule, PushDevicesModule],
  providers: [NotificationEventsProcessor],
})
export class NotificationEventsModule {}
