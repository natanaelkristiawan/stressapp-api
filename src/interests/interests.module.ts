import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { CmsMembersGuard } from '../cms-members/cms-members.guard';
import { InterestsController } from './interests.controller';
import { InterestsService } from './interests.service';

@Module({
  imports: [AdminAuthModule],
  controllers: [InterestsController],
  providers: [InterestsService, CmsMembersGuard],
})
export class InterestsModule {}
