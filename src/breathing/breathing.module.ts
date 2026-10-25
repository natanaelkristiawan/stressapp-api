import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { MemberAuthModule } from '../member-auth/member-auth.module';
import { CmsMembersGuard } from '../cms-members/cms-members.guard';
import { BreathingService } from './breathing.service';
import {
  CmsBreathingController,
  MemberBreathingController,
} from './breathing.controller';

@Module({
  imports: [AdminAuthModule, MemberAuthModule],
  controllers: [CmsBreathingController, MemberBreathingController],
  providers: [BreathingService, CmsMembersGuard],
})
export class BreathingModule {}
