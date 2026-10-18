import { Module } from '@nestjs/common';
import { MemberAuthModule } from '../member-auth/member-auth.module';
import { UploadModule } from '../upload/upload.module';
import { MoodTrackerController } from './mood-tracker.controller';
import { MoodTrackerService } from './mood-tracker.service';

@Module({
  imports: [MemberAuthModule, UploadModule],
  controllers: [MoodTrackerController],
  providers: [MoodTrackerService],
})
export class MoodTrackerModule {}
