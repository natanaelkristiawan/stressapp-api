import { Test } from '@nestjs/testing';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { ProfileModule } from '../profile/profile.module';
import { PostService } from '../post/post.service';
import { ContentModerationModule } from './content-moderation.module';
import {
  ContentModerationService,
  MODERATION_QUEUE,
} from './content-moderation.service';

describe('Profile moderation dependency wiring', () => {
  it('resolves its PostService through the exported moderation provider', async () => {
    const imports: unknown[] = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      ProfileModule,
    );
    const providers: unknown[] = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      ProfileModule,
    );
    expect(providers).toContain(PostService);
    expect(imports).toContain(ContentModerationModule);

    // Keep the real moderation module wiring; isolate unrelated DB/queue services.
    const module = await Test.createTestingModule({
      imports: imports.filter(
        (item): item is typeof ContentModerationModule =>
          item === ContentModerationModule,
      ),
      providers: [PostService],
    })
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
      expect(module.get(PostService)).toBeInstanceOf(PostService);
      expect(module.get(ContentModerationService)).toBeInstanceOf(
        ContentModerationService,
      );
    } finally {
      await module.close();
    }
  });
});
