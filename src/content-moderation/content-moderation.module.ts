import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import {
  ContentModerationService,
  MODERATION_QUEUE,
} from './content-moderation.service';
import { ContentModerationProcessor } from './content-moderation.processor';

@Module({
  imports: [BullModule.registerQueue({ name: MODERATION_QUEUE })],
  providers: [ContentModerationService, ContentModerationProcessor],
  exports: [ContentModerationService],
})
export class ContentModerationModule {}
