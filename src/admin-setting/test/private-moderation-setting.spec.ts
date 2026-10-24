import { AdminSettingService } from '../admin-setting.service';
import { MODERATION_PROVIDER_KEY } from '../../content-moderation/moderation-provider-settings.service';

describe('generic settings credential isolation', () => {
  it('blocks private keys through direct reads, updates, creates, upserts and deletion', async () => {
    const repository = {
      findOne: jest.fn(async () => ({
        id: 1,
        key: MODERATION_PROVIDER_KEY,
        value: 'private-ciphertext',
      })),
      save: jest.fn(),
      remove: jest.fn(),
    };
    const service = new AdminSettingService(repository as never, {} as never);
    await expect(service.getDetailSetting(1)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      service.getSettingByKey(MODERATION_PROVIDER_KEY),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      service.createSetting({ key: MODERATION_PROVIDER_KEY, value: 'secret' }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      service.upsertSetting({ key: MODERATION_PROVIDER_KEY, value: 'secret' }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      service.updateSetting(1, { value: 'secret' }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      service.updateSetting(2, { key: MODERATION_PROVIDER_KEY }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(service.deleteSetting(1)).rejects.toMatchObject({
      status: 404,
    });
    expect(repository.save).not.toHaveBeenCalled();
    expect(repository.remove).not.toHaveBeenCalled();
  });

  it.each([
    MODERATION_PROVIDER_KEY.toUpperCase(),
    MODERATION_PROVIDER_KEY + ' ',
    MODERATION_PROVIDER_KEY.replace('moderation', 'móderation'),
  ])('reserves MySQL-equivalent private keys: %s', async (key) => {
    const repository = { save: jest.fn() };
    const service = new AdminSettingService(repository as never, {} as never);
    await expect(
      service.upsertSetting({ key, value: 'private' }),
    ).rejects.toMatchObject({ status: 404 });
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('excludes the private row from generic listings and counts, including searches', async () => {
    const query = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn(async () => 2),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () => []),
    };
    const service = new AdminSettingService(
      { createQueryBuilder: () => query } as never,
      {} as never,
    );
    const result = await service.getAllSetting({
      page: 1,
      limit: 10,
      search: 'moderation',
    });
    expect(query.where).toHaveBeenCalledWith('setting.key <> :privateKey', {
      privateKey: MODERATION_PROVIDER_KEY,
    });
    expect(query.andWhere).toHaveBeenCalled();
    expect(result.recordsTotal).toBe(2);
    expect(result.items).toEqual([]);
  });
});
