import { Module } from '@nestjs/common';
import { AdminStaffService } from './admin-staff.service';
import { AdminStaffController } from './admin-staff.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAdmin } from 'src/entity/user-admin.entity';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserAdmin, UserMimateEntity], 'mimate')],
  providers: [AdminStaffService],
  controllers: [AdminStaffController]
})
export class AdminStaffModule {}
