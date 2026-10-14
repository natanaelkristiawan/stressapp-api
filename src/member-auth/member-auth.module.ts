import { BullModule } from '@nestjs/bullmq';
import {
  MemberOtpEmailProcessor,
  OTP_EMAIL_QUEUE,
} from './member-auth.email.processor';
import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';
import { MemberAuthController } from './member-auth.controller';
import { MemberAuthService } from './member-auth.service';
@Module({
  imports: [
    JwtModule.register({}),
    BullModule.registerQueue({ name: OTP_EMAIL_QUEUE }),
  ],
  controllers: [MemberAuthController],
  providers: [MemberAuthService, MemberOtpEmailProcessor],
})
export class MemberAuthModule {}
