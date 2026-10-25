import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { MemberAuthModule } from '../member-auth/member-auth.module';
import { CmsMembersGuard } from '../cms-members/cms-members.guard';
import {
  CmsPsychologistsController,
  MemberPsychologistsController,
} from './psychologists.controller';
import { PsychologistsService } from './psychologists.service';
import { PsychologistsImport } from './psychologists.import';
@Module({
  imports: [AdminAuthModule, MemberAuthModule],
  controllers: [CmsPsychologistsController, MemberPsychologistsController],
  providers: [CmsMembersGuard, PsychologistsService, PsychologistsImport],
})
export class PsychologistsModule {}
