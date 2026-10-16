import { getMetadataArgsStorage, QueryRunner } from 'typeorm';
import { Member } from '../../entity/user-mimate.entity';
import { MemberOtp } from '../../entity/member-otp.entity';
import { MemberSession } from '../../entity/member-session.entity';
import { UserAdmin } from '../../entity/user-admin.entity';
import { InitialIdentity1792195200000 } from './1792195200000-InitialIdentity';

describe('fresh identity schema', () => {
  it('creates final tables directly with every mapped scalar column', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await new InitialIdentity1792195200000().up({ query } as unknown as QueryRunner);
    expect(query).toHaveBeenCalledTimes(4);
    for (const [index, entity, table] of [
      [0, Member, 'members'], [1, MemberOtp, 'member_otps'],
      [2, MemberSession, 'member_sessions'], [3, UserAdmin, 'users'],
    ] as const) {
      const sql = query.mock.calls[index][0].replace(/`/g, '');
      expect(sql).toContain(`CREATE TABLE ${table}`);
      for (const column of getMetadataArgsStorage().columns.filter(c => c.target === entity)) {
        expect(sql.split(/\W+/)).toContain(column.options.name || column.propertyName);
      }
      expect(sql).not.toMatch(/IF NOT EXISTS|backup_members|archive|ALTER|INSERT|DELETE FROM/);
    }
    expect(query.mock.calls[0][0]).toContain('UNIQUE KEY');
    expect(query.mock.calls[3][0]).toContain('REFERENCES `members` (`id`)');
  });
  it('propagates schema errors without attempting repair', async () => {
    const query = jest.fn().mockRejectedValue(new Error('schema failure'));
    await expect(new InitialIdentity1792195200000().up({ query } as unknown as QueryRunner)).rejects.toThrow('schema failure');
    expect(query).toHaveBeenCalledTimes(1);
  });
});
