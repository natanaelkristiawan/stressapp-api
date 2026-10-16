import { getMetadataArgsStorage, QueryRunner } from 'typeorm';
import { UserAdmin } from '../../entity/user-admin.entity';
import { UserMimateEntity } from '../../entity/user-mimate.entity';
import { CmsAdmin1792108800000 } from './1792108800000-CmsAdmin';

describe('CMS identity baseline migration', () => {
  it('creates profiles before admins and includes every mapped scalar column', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await new CmsAdmin1792108800000().up({ query } as unknown as QueryRunner);
    expect(query).toHaveBeenCalledTimes(2);
    for (const [index, entity, table] of [[0, UserMimateEntity, 'backup_members'], [1, UserAdmin, 'users']] as const) {
      const sql = query.mock.calls[index][0];
      expect(sql).toContain(`CREATE TABLE IF NOT EXISTS \`${table}\``);
      for (const column of getMetadataArgsStorage().columns.filter(c => c.target === entity)) {
        expect(sql).toContain(`\`${column.options.name || column.propertyName}\``);
      }
      expect(sql).not.toMatch(/(?:^|;)\s*(?:DROP|ALTER|DELETE|TRUNCATE)\b/i);
    }
    expect(query.mock.calls[1][0]).toContain('REFERENCES `backup_members` (`id`)');
    expect(query.mock.calls[1][0]).toContain('UNIQUE KEY');
  });
  it('propagates schema failures and refuses destructive rollback', async () => {
    const query = jest.fn().mockRejectedValue(new Error('schema failure'));
    const migration = new CmsAdmin1792108800000();
    await expect(migration.up({ query } as unknown as QueryRunner)).rejects.toThrow('schema failure');
    expect(query).toHaveBeenCalledTimes(1);
    await expect(migration.down()).rejects.toThrow('rollback is disabled');
  });
});
