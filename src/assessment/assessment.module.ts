import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { MemberAuthModule } from '../member-auth/member-auth.module';
import { CmsMembersGuard } from '../cms-members/cms-members.guard';
import { AssessmentController } from './assessment.controller';
import { CmsAssessmentController } from './cms-assessment.controller';
import { AssessmentService } from './assessment.service';

@Module({
  imports: [MemberAuthModule, AdminAuthModule],
  controllers: [AssessmentController, CmsAssessmentController],
  providers: [AssessmentService, CmsMembersGuard],
})
export class AssessmentModule {}
