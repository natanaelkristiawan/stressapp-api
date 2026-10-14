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
    const sign = jest.fn().mockReturnValue('signed-admin-token');
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        AdminAuthService,
        {
          provide: getRepositoryToken(UserMimateEntity, 'mimate'),
          useValue: { findOne },
        },
        { provide: getRepositoryToken(UserAdmin, 'mimate'), useValue: {} },
        { provide: JwtService, useValue: { sign } },
      ],
    }).compile();
    return {
      auth: module.get(AuthService),
      admin: module.get(AdminAuthService),
      findOne,
      sign,
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
});
