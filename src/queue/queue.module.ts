import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { QueueProcessor } from './queue.processor';
import { HttpModule } from '@nestjs/axios';

@Module({
    // import bull
  imports: [
    BullModule.registerQueue({
      name: 'notification-queue', // Queue name
    }),
    HttpModule
    ],
  providers: [QueueService, QueueProcessor],
  exports: [QueueService],
})
export class QueueModule {}
