import { Module } from '@nestjs/common';
import { MemberAuthModule } from '../member-auth/member-auth.module';
import { PushDevicesController } from './push-devices.controller';
import { PushDevicesService } from './push-devices.service';

@Module({
  imports: [MemberAuthModule],
  controllers: [PushDevicesController],
  providers: [PushDevicesService],
  exports: [PushDevicesService],
})
export class PushDevicesModule {}
