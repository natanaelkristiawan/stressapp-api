import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignWinner } from 'src/entity/campaign-winner.entity';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { AdminSettingModule } from 'src/admin-setting/admin-setting.module';
import { WinnerController } from './winner.controller';
import { WinnerService } from './winner.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CampaignWinner, UserMimateEntity], 'mimate'),
    AdminSettingModule,
  ],
  controllers: [WinnerController],
  providers: [WinnerService],
  exports: [WinnerService],
})
export class WinnerModule {}
