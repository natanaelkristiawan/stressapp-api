import { Module } from '@nestjs/common';
import { MemberAuthModule } from '../member-auth/member-auth.module';
import { MemberNotificationsController } from './member-notifications.controller';
import { MemberNotificationsService } from './member-notifications.service';

@Module({
  imports: [MemberAuthModule],
  controllers: [MemberNotificationsController],
  providers: [MemberNotificationsService],
})
export class MemberNotificationsModule {}
