import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { getQueueToken } from '@nestjs/bullmq';
import { OTP_EMAIL_QUEUE } from './member-auth.email.processor';
import { createHash, createHmac } from 'crypto';
import * as bcrypt from 'bcrypt';
import { MemberAuthService } from './member-auth.service';
import { GoogleLoginDto } from './member-auth.dto';
import { Member } from '../entity/user-mimate.entity';
import { MemberOtp } from '../entity/member-otp.entity';
import { MemberSession } from '../entity/member-session.entity';

// Runs the real password/OTP/session logic with a transactional repository boundary mock.
describe('registration OTP session', () => {
  /** Builds purpose-bound credentials and the real service. Returns observable transaction mocks. */
  async function setup(purpose: 'registration' | 'recovery') {
    const member = new Member();
    Object.assign(member, {
      id: 7,
      name: 'Test',
      email: 'test@example.test',
      is_suspended: false,
      memberAuthEnabled: true,
      deleted_at: null,
      verifiedAt: purpose === 'recovery' ? new Date() : null,
    });
    const passwordHash = await bcrypt.hash('Testpass123!', 4);
    const otp = new MemberOtp();
    Object.assign(otp, {
      memberId: 7,
      purpose,
      attempts: 0,
      consumedAt: null,
      expiresAt: new Date(Date.now() + 300000),
      codeHash: createHmac('sha256', 'test-secret')
        .update(`7:${purpose}:1234`)
        .digest('hex'),
    });
    const query = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: async () => ({ ...member, passwordHash }),
    };
    let committed = false;
    const emails = {
      add: jest.fn(async () => {
        expect(committed).toBe(true);
      }),
    };
    const manager = {
      delete: jest.fn(async () => undefined),
      findOne: jest.fn(async () => member),
      findOneBy: async () => otp,
      getRepository: () => ({ createQueryBuilder: () => query }),
      insert: jest.fn(async () => undefined),
      save: jest.fn(
        async (entity: unknown, value?: unknown) => value || entity,
      ),
    };
    const sessions = {
      findOneBy: jest.fn(async () => ({
        tokenHash: 'a'.repeat(64),
        memberId: 7,
      })),
    };
    const module = await Test.createTestingModule({
      providers: [
        MemberAuthService,
        {
          provide: getDataSourceToken('mimate'),
          useValue: {
            getRepository: () => sessions,
            transaction: async (
              work: (value: typeof manager) => Promise<unknown>,
            ) => {
              const result = await work(manager);
              committed = true;
              return result;
            },
          },
        },
        { provide: getQueueToken(OTP_EMAIL_QUEUE), useValue: emails },
        {
          provide: RedisService,
          useValue: { getOrThrow: () => ({ eval: async () => 1 }) },
        },
        {
          provide: ConfigService,
          useValue: { get: () => undefined, getOrThrow: () => 'test-secret' },
        },
        { provide: JwtService, useValue: new JwtService() },
      ],
    }).compile();
    return {
      service: module.get(MemberAuthService),
      member,
      otp,
      manager,
      emails,
      sessions,
    };
  }
  it('cookie logout hashes the credential and deletes only its stable session ID', async () => {
    const { service, manager, sessions } = await setup('recovery');
    const refreshToken = `refresh_${'b'.repeat(64)}`;
    await service.logoutByRefreshToken(refreshToken);
    expect(sessions.findOneBy).toHaveBeenCalledWith({
      refreshHash: createHash('sha256').update(refreshToken).digest('hex'),
    });
    expect(manager.delete).toHaveBeenCalledWith(MemberSession, {
      tokenHash: 'a'.repeat(64),
      memberId: 7,
    });
  });

  it('queues delivery only after OTP commit and surfaces queue failure', async () => {
    const { service, member, emails } = await setup('registration');
    await service.sendOtp(member.email, 'registration');
    expect(emails.add).toHaveBeenCalledWith(
      'send-otp',
      expect.objectContaining({
        memberId: member.id,
        purpose: 'registration',
        code: expect.stringMatching(/^\d{4}$/),
      }),
      expect.objectContaining({
        attempts: 3,
        removeOnComplete: true,
        removeOnFail: true,
      }),
    );
    emails.add.mockRejectedValueOnce(new Error('Redis unavailable'));
    await expect(service.sendOtp(member.email, 'registration')).rejects.toThrow(
      'Gagal menjadwalkan email',
    );
  });
  it('verifies email and creates JWT/refresh credentials in the same transaction', async () => {
    const { service, member, otp, manager } = await setup('registration');
    const result = await service.verify({
      email: member.email,
      purpose: 'registration',
      code: '1234',
      password: 'Testpass123!',
    });
    expect(result).toEqual(
      expect.objectContaining({
        token: expect.any(String),
        refreshToken: expect.stringMatching(/^refresh_/),
        member: expect.objectContaining({ id: 7, emailVerified: true }),
      }),
    );
    expect(member.verifiedAt).toBeInstanceOf(Date);
    expect(otp.consumedAt).toBeInstanceOf(Date);
    expect(manager.save).toHaveBeenCalledWith(
      MemberSession,
      expect.objectContaining({ memberId: 7, refreshHash: expect.any(String) }),
    );
  });
  it('does not create a session for an incorrect OTP', async () => {
    const { service, member, manager } = await setup('registration');
    await expect(
      service.verify({
        email: member.email,
        purpose: 'registration',
        code: '9999',
        password: 'Testpass123!',
      }),
    ).rejects.toThrow();
    expect(member.verifiedAt).toBeNull();
    expect(
      manager.save.mock.calls.some((call) => call[0] === MemberSession),
    ).toBe(false);
  });
  it('does not enable member auth for a legacy or CMS-only profile', async () => {
    const { service, member, manager, emails } = await setup('registration');
    member.memberAuthEnabled = false;
    await service.sendOtp(member.email, 'registration');
    expect(emails.add).not.toHaveBeenCalled();
    await expect(
      service.verify({
        email: member.email,
        purpose: 'registration',
        code: '1234',
        password: 'Testpass123!',
      }),
    ).rejects.toThrow();
    expect(
      manager.save.mock.calls.some((call) => call[0] === MemberSession),
    ).toBe(false);
  });
  it('returns reset proof without a login session for recovery', async () => {
    const { service, member, manager } = await setup('recovery');
    const result = await service.verify({
      email: member.email,
      purpose: 'recovery',
      code: '1234',
    });
    expect(result).toEqual(
      expect.objectContaining({ resetToken: expect.any(String) }),
    );
    expect(result).not.toHaveProperty('token');
    expect(
      manager.save.mock.calls.some((call) => call[0] === MemberSession),
    ).toBe(false);
  });

  it('verifies a Google ID token and creates or links a verified member session', async () => {
    const { service, member, manager } = await setup('registration');
    const googleClient = (
      service as unknown as {
        googleClient: {
          verifyIdToken: jest.Mock;
        };
      }
    ).googleClient;

    jest.spyOn(googleClient, 'verifyIdToken').mockResolvedValue({
      getPayload: () => ({
        email: 'test@example.test',
        email_verified: true,
        name: 'Google User',
        picture: 'https://lh3.googleusercontent.com/a/default-user',
      }),
    } as never);

    const dto: GoogleLoginDto = {
      idToken: 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signature',
      rememberMe: true,
    };

    const result = await service.loginWithGoogle(dto);
    expect(result).toEqual(
      expect.objectContaining({
        token: expect.any(String),
        refreshToken: expect.stringMatching(/^refresh_/),
        member: expect.objectContaining({
          id: 7,
          email: 'test@example.test',
          emailVerified: true,
          avatarUrl: 'https://lh3.googleusercontent.com/a/default-user',
        }),
      }),
    );
    expect(member.verifiedAt).toBeInstanceOf(Date);
    expect(
      manager.save.mock.calls.some((call) => call[0] === MemberSession),
    ).toBe(true);
  });
});
