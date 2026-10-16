import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AdminAuthService } from '../admin-auth/admin-auth.service';
import { UserMimateEntity } from '../entity/user-mimate.entity';
import { UserAdmin } from '../entity/user-admin.entity';

// Uses real Nest dependency injection to catch removed external provider dependencies.
describe('local identity without mmid', () => {
  /** Creates the local-only service graph. Returns services and observable repository/JWT mocks. */
  async function setup() {
    const findOne = jest.fn();
    const adminFindOne = jest.fn();
    const sign = jest.fn().mockReturnValue('signed-admin-token');
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        AdminAuthService,
        {
          provide: getRepositoryToken(UserMimateEntity, 'mimate'),
          useValue: { findOne },
        },
        { provide: getRepositoryToken(UserAdmin, 'mimate'), useValue: { findOne: adminFindOne } },
        { provide: JwtService, useValue: { sign } },
      ],
    }).compile();
    return {
      auth: module.get(AuthService),
      admin: module.get(AdminAuthService),
      findOne,
      sign,
      adminFindOne,
    };
  }
  it('rejects invalid IDs before querying and looks up valid local IDs', async () => {
    const { auth, findOne } = await setup();
    for (const id of [0, -1, NaN, 1.5])
      expect(await auth.getLocalMember(id)).toBeNull();
    expect(findOne).not.toHaveBeenCalled();
    const profile = new UserMimateEntity();
    profile.id = 7;
    findOne.mockResolvedValue(profile);
    expect(await auth.getLocalMember(7)).toBe(profile);
    expect(findOne).toHaveBeenCalledWith({
      where: { id: 7 },
      withDeleted: false,
    });
  });
  it('issues CMS JWTs using the local profile ID and explicit scope', async () => {
    const { admin, sign } = await setup();
    const user = new UserAdmin();
    user.email = 'staff@example.test';
    user.userMimate = new UserMimateEntity();
    user.userMimate.id = 7;
    user.userMimate.userId = 999;
    expect(await admin.login(user)).toBe('signed-admin-token');
    expect(sign).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7, kind: 'admin-access', aud: 'cms' }),
    );
  });
  it('returns only admin identity and rejects missing, suspended or deleted accounts', async () => {
    const { admin, adminFindOne } = await setup();
    const user = Object.assign(new UserAdmin(), {
      id: 3, name: 'Staff', email: 'staff@example.test', password: 'private-hash',
      userMimate: { id: 7, is_suspended: false, deleted_at: null },
    });
    adminFindOne.mockResolvedValue(user);
    expect(await admin.currentAdmin(7)).toEqual({ id: '3', name: 'Staff', email: 'staff@example.test' });
    user.userMimate.is_suspended = true;
    await expect(admin.currentAdmin(7)).rejects.toThrow('Invalid credentials');
    user.userMimate.is_suspended = false;
    user.userMimate.deleted_at = new Date();
    await expect(admin.currentAdmin(7)).rejects.toThrow('Invalid credentials');
    adminFindOne.mockResolvedValue(null);
    await expect(admin.currentAdmin(7)).rejects.toThrow('Invalid credentials');
  });

});
