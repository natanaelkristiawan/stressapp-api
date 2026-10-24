import { ConfigService } from '@nestjs/config';
import {
  ModerationProviderSettingsService,
  MODERATION_PROVIDER_KEY,
} from './moderation-provider-settings.service';

/** Minimal repository keeps tests focused on encrypted persistence and stale-write rules. */
function setup() {
  let row: { key: string; value: string | null } | null = null;
  const repository = {
    findOneBy: jest.fn(async () => row),
    findOne: jest.fn(async () => row),
    save: jest.fn(async (value: typeof row) => {
      row = value;
      return value;
    }),
    createQueryBuilder: () => ({
      insert: () => ({
        values: (value: typeof row) => ({
          orIgnore: () => ({
            updateEntity: () => ({
              execute: async () => {
                row ??= value;
              },
            }),
          }),
        }),
      }),
    }),
    manager: {
      transaction: async (callback: (manager: unknown) => Promise<unknown>) =>
        callback({ getRepository: () => repository }),
    },
  };
  const config = new ConfigService({
    JWT_SECRET: 'synthetic-server-secret',
    OPENCODE_API_KEY: 'synthetic-env-key',
    OPENCODE_MODERATION_MODEL: 'env-model',
  });
  return {
    service: new ModerationProviderSettingsService(repository as never, config),
    repository,
    config,
  };
}

describe('private moderation provider settings', () => {
  it('uses environment configuration until CMS saves an override', async () => {
    const { service } = setup();
    expect(await service.read()).toEqual({
      apiKey: 'synthetic-env-key',
      model: 'env-model',
      version: '0'.repeat(64),
    });
    const status = await service.status();
    expect(status).toEqual({
      configured: true,
      model: 'env-model',
      version: '0'.repeat(64),
    });
    expect(JSON.stringify(status)).not.toContain('synthetic-env-key');
  });

  it('encrypts the key/model, persists across service instances and preserves a blank key', async () => {
    const { service, repository, config } = setup();
    const status = await service.save({
      apiKey: 'synthetic-saved-key',
      model: 'deepseek-v4-flash',
      version: '0'.repeat(64),
    });
    const row = await repository.findOneBy();
    expect(row.key).toBe(MODERATION_PROVIDER_KEY);
    expect(row.value).not.toContain('synthetic-saved-key');
    expect(row.value).not.toContain('deepseek');
    expect(JSON.stringify(status)).not.toContain('synthetic-saved-key');
    const otherProcess = new ModerationProviderSettingsService(
      repository as never,
      config,
    );
    expect(await otherProcess.read()).toEqual({
      apiKey: 'synthetic-saved-key',
      model: 'deepseek-v4-flash',
      version: status.version,
    });
    const changed = await otherProcess.save({
      apiKey: '',
      model: 'new-model',
      version: status.version,
    });
    expect(changed.version).not.toBe(status.version);
    expect(await service.read()).toMatchObject({
      apiKey: 'synthetic-saved-key',
      model: 'new-model',
    });
    await expect(
      service.save({
        apiKey: 'stale-key',
        model: 'old-model',
        version: status.version,
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(await service.read()).toMatchObject({
      apiKey: 'synthetic-saved-key',
      model: 'new-model',
    });
  });

  it('fails closed on unreadable settings without exposing ciphertext or DB errors', async () => {
    const { service, repository } = setup();
    repository.findOneBy.mockResolvedValue({
      key: MODERATION_PROVIDER_KEY,
      value: 'corrupt-ciphertext',
    });
    await expect(service.read()).rejects.toMatchObject({
      status: 503,
      message: 'Moderation provider settings are unavailable.',
    });
    repository.findOneBy.mockRejectedValue(new Error('private-db-details'));
    await expect(service.status()).rejects.toMatchObject({
      status: 503,
      message: 'Moderation provider settings are unavailable.',
    });
  });

  it('requires server encryption secret and a usable key/model', async () => {
    const { service, config } = setup();
    await expect(
      service.save({
        apiKey: 'bad\nkey',
        model: 'test',
        version: '0'.repeat(64),
      }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.save({ apiKey: '', model: '../bad', version: '0'.repeat(64) }),
    ).rejects.toMatchObject({ status: 400 });
    config.set('JWT_SECRET', '');
    await expect(
      service.save({
        apiKey: 'synthetic',
        model: 'test',
        version: '0'.repeat(64),
      }),
    ).rejects.toMatchObject({ status: 503 });
  });
});
