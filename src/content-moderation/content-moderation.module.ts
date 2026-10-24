import { ModerationProviderSettingsService } from './moderation-provider-settings.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingEntity } from '../entity/setting.entity';
import { ModerationMessagesService } from './moderation-messages.service';
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import {
  ContentModerationService,
  MODERATION_QUEUE,
} from './content-moderation.service';
import { ContentModerationProcessor } from './content-moderation.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([SettingEntity], 'mimate'),
    BullModule.registerQueue({ name: MODERATION_QUEUE }),
  ],
  providers: [
    ModerationProviderSettingsService,
    ContentModerationService,
    ContentModerationProcessor,
    ModerationMessagesService,
  ],
  exports: [ContentModerationService, ModerationMessagesService],
})
export class ContentModerationModule {}
