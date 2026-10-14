import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { MoengageService } from './moengage.service';
import { MoengageProcessor } from './moengage.processor';   
import { BullModule } from '@nestjs/bullmq';
@Module({
  imports: [HttpModule, ConfigModule, BullModule.registerQueue({
    name: 'moengage',
  })],
  providers: [MoengageService, MoengageProcessor],
  exports: [MoengageService],
})
export class MoengageModule {}
