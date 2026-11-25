import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { CmsMembersGuard } from '../cms-members/cms-members.guard';
import { InterestCategoriesController } from './interest-categories.controller';
import { InterestCategoriesService } from './interest-categories.service';

@Module({
  imports: [AdminAuthModule],
  controllers: [InterestCategoriesController],
  providers: [InterestCategoriesService, CmsMembersGuard],
  exports: [InterestCategoriesService],
})
export class InterestCategoriesModule {}
