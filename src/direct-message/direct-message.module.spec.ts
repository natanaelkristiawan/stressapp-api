import { Test } from '@nestjs/testing';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { SettingEntity } from '../entity/setting.entity';
import { ContentModerationModule } from '../content-moderation/content-moderation.module';
import {
  ContentModerationService,
  MODERATION_QUEUE,
} from '../content-moderation/content-moderation.service';
import { DirectMessageModule } from './direct-message.module';
import { DirectMessageService } from './direct-message.service';

describe('Chat moderation wiring', () => {
  it('resolves the real moderation dependency exported to the chat service', async () => {
    const imports: unknown[] = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      DirectMessageModule,
    );
    expect(imports).toContain(ContentModerationModule);
    const module = await Test.createTestingModule({
      imports: imports.filter(
        (item): item is typeof ContentModerationModule =>
          item === ContentModerationModule,
      ),
      providers: [DirectMessageService],
    })
      .overrideProvider(getRepositoryToken(SettingEntity, 'mimate'))
      .useValue({})
      .overrideProvider(getQueueToken(MODERATION_QUEUE))
      .useValue({})
      .useMocker((token) => {
        if (token === ContentModerationService) {
          return undefined;
        }
        if (token === ConfigService) {
          return new ConfigService();
        }
        if (token === RedisService) {
          return { getOrNil: () => ({}) };
        }
        return {};
      })
      .compile();
    try {
      expect(module.get(DirectMessageService)).toBeInstanceOf(
        DirectMessageService,
      );
      expect(module.get(ContentModerationService)).toBeInstanceOf(
        ContentModerationService,
      );
    } finally {
      await module.close();
    }
  });
});
