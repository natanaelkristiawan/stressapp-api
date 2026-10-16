import { DataSource, DataSourceOptions } from 'typeorm';
import { runProjectMigrations } from './run-migrations';

describe('central project migrations', () => {
  it('uses the original histories and active migrations, then closes both connections', async () => {
    const options: DataSourceOptions[] = [];
    const sources: {
      initialize: jest.Mock;
      runMigrations: jest.Mock;
      destroy: jest.Mock;
      isInitialized: boolean;
    }[] = [];
    await runProjectMigrations((config) => {
      options.push(config);
      const source = {
        initialize: jest.fn(),
        runMigrations: jest.fn(),
        destroy: jest.fn(),
        isInitialized: true,
      };
      sources.push(source);
      return source as unknown as DataSource;
    });
    expect(options.map((o) => o.migrationsTableName)).toEqual([
      'member_auth_migrations',
      'cms_auth_migrations',
    ]);
    expect(options.map((o) => o.migrations)).toEqual([
      [
        expect.objectContaining({ name: 'MemberAuth1791936000000' }),
        expect.objectContaining({ name: 'MemberRefresh1791936001000' }),
      ],
      [expect.objectContaining({ name: 'CmsAdmin1792108800000' })],
    ]);
    for (const source of sources) {
      expect(source.runMigrations).toHaveBeenCalledTimes(1);
      expect(source.destroy).toHaveBeenCalledTimes(1);
    }
  });
  it('stops on failure and closes the failed connection', async () => {
    const source = {
      initialize: jest.fn(),
      runMigrations: jest.fn().mockRejectedValue(new Error('failed')),
      destroy: jest.fn(),
      isInitialized: true,
    };
    const create = jest.fn().mockReturnValue(source);
    await expect(runProjectMigrations(create)).rejects.toThrow('failed');
    expect(create).toHaveBeenCalledTimes(1);
    expect(source.destroy).toHaveBeenCalled();
  });
});
