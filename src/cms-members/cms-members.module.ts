import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { CmsMembersController } from './cms-members.controller';
import { CmsMembersGuard } from './cms-members.guard';
import { CmsMembersService } from './cms-members.service';

@Module({
  imports: [AdminAuthModule],
  controllers: [CmsMembersController],
  providers: [CmsMembersService, CmsMembersGuard],
})
export class CmsMembersModule {}
