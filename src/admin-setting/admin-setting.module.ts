import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingEntity } from 'src/entity/setting.entity';
import { LogLastActiveManual } from 'src/entity/log-last-active-manual.entity';
import { AdminSettingController } from './admin-setting.controller';
import { AdminSettingService } from './admin-setting.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SettingEntity, LogLastActiveManual], 'mimate'),
  ],
  controllers: [AdminSettingController],
  providers: [AdminSettingService],
  exports: [AdminSettingService],
})
export class AdminSettingModule {}
