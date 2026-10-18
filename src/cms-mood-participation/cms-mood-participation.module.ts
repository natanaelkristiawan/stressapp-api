import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { CmsMembersGuard } from '../cms-members/cms-members.guard';
import { CmsMoodParticipationController } from './cms-mood-participation.controller';
import { CmsMoodParticipationService } from './cms-mood-participation.service';

@Module({
  imports: [AdminAuthModule],
  controllers: [CmsMoodParticipationController],
  providers: [CmsMoodParticipationService, CmsMembersGuard],
})
export class CmsMoodParticipationModule {}
