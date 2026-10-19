import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as request from 'supertest';
import { MemberAuthService } from './member-auth.service';
import { VerifyOtpDto } from './member-auth.dto';
import { MemberWebAuthController } from './member-auth.web.controller';

const refreshToken = `refresh_${'a'.repeat(64)}`;
const nextRefreshToken = `refresh_${'b'.repeat(64)}`;
const session = {
  token: 'synthetic.access.token',
  expiresAt: '2030-01-02T00:00:00.000Z',
  refreshToken,
  refreshExpiresAt: '2030-01-08T00:00:00.000Z',
  member: {
    id: 1,
    name: 'Test Member',
    email: 'test@example.test',
    emailVerified: true,
  },
};

// Real HTTP routing, DTO validation and cookie serialization; auth database boundaries are mocked.
describe('browser member session cookies', () => {
  let app: INestApplication;
  const auth = {
    limit: jest.fn(async () => undefined),
    login: jest.fn(async () => session),
    verify: jest.fn(async (input: VerifyOtpDto) =>
      input.purpose === 'recovery'
        ? { resetToken: 'f'.repeat(64), message: 'Code verified' }
        : session,
    ),
    refresh: jest.fn(async () => ({
      ...session,
      refreshToken: nextRefreshToken,
    })),
    logoutByRefreshToken: jest.fn(async () => undefined),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [MemberWebAuthController],
      providers: [
        { provide: MemberAuthService, useValue: auth },
        {
          provide: ConfigService,
          useValue: new ConfigService({ NODE_ENV: 'development' }),
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.listen(0, '127.0.0.1');
  });

  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => jest.clearAllMocks());

  it('sets a host-only HttpOnly secure cookie and excludes refresh credentials from JSON', async () => {
    const result = await request(app.getHttpServer())
      .post('/member-auth/web/login')
      .set('Origin', 'https://temusobat.tech')
      .set('X-Member-Web', '1')
      .send({
        email: 'test@example.test',
        password: 'Testpass123!',
        rememberMe: true,
      })
      .expect(200);
    expect(result.body.token).toBe(session.token);
    expect(result.body).not.toHaveProperty('refreshToken');
    expect(result.headers['cache-control']).toBe('private, no-store');
    const cookie = result.headers['set-cookie'][0];
    expect(cookie).toContain(`member_refresh=${refreshToken}`);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/member-auth/web');
    expect(cookie).toContain('Expires=Tue, 08 Jan 2030');
    expect(cookie).not.toContain('Domain=');
  });

  it('restores/rotates only from a valid cookie, including on local HTTP', async () => {
    const result = await request(app.getHttpServer())
      .post('/member-auth/web/refresh')
      .set('Origin', 'http://localhost:8081')
      .set('X-Member-Web', '1')
      .set('Cookie', `member_refresh=${refreshToken}`)
      .send({})
      .expect(200);
    expect(auth.refresh).toHaveBeenCalledWith(refreshToken);
    expect(result.body).not.toHaveProperty('refreshToken');
    expect(result.headers['set-cookie'][0]).toContain(nextRefreshToken);
    expect(result.headers['set-cookie'][0]).not.toContain('Secure');
  });

  it('rejects missing/untrusted origins, missing custom headers and client body tokens', async () => {
    const endpoint = '/member-auth/web/refresh';
    await request(app.getHttpServer()).post(endpoint).send({}).expect(403);
    await request(app.getHttpServer())
      .post(endpoint)
      .set('Origin', 'https://untrusted.example')
      .set('X-Member-Web', '1')
      .send({})
      .expect(403);
    await request(app.getHttpServer())
      .post(endpoint)
      .set('Origin', 'https://temusobat.tech')
      .send({})
      .expect(403);
    await request(app.getHttpServer())
      .post(endpoint)
      .set('Origin', 'https://temusobat.tech')
      .set('X-Member-Web', '1')
      .send({ refreshToken })
      .expect(400);
    expect(auth.refresh).not.toHaveBeenCalled();
  });

  it('rejects malformed/missing/duplicate cookies without rotation', async () => {
    for (const cookie of [
      '',
      'member_refresh=invalid',
      `member_refresh=${refreshToken}; member_refresh=${nextRefreshToken}`,
    ]) {
      await request(app.getHttpServer())
        .post('/member-auth/web/refresh')
        .set('Origin', 'https://temusobat.tech')
        .set('X-Member-Web', '1')
        .set('Cookie', cookie)
        .send({})
        .expect(401);
    }
    expect(auth.refresh).not.toHaveBeenCalled();
  });

  it('registration OTP establishes a cookie session', async () => {
    const result = await request(app.getHttpServer())
      .post('/member-auth/web/otp/verify')
      .set('Origin', 'https://temusobat.tech')
      .set('X-Member-Web', '1')
      .send({
        email: 'test@example.test',
        purpose: 'registration',
        password: 'Testpass123!',
        code: '1234',
      })
      .expect(200);
    expect(result.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(result.body).not.toHaveProperty('refreshToken');
  });

  it('recovery verification never creates a login cookie', async () => {
    const result = await request(app.getHttpServer())
      .post('/member-auth/web/otp/verify')
      .set('Origin', 'https://temusobat.tech')
      .set('X-Member-Web', '1')
      .send({ email: 'test@example.test', purpose: 'recovery', code: '1234' })
      .expect(200);
    expect(result.body.resetToken).toBe('f'.repeat(64));
    expect(result.headers['set-cookie']).toBeUndefined();
  });

  it('invalidated refresh returns 401 without deleting another tab’s newer cookie', async () => {
    auth.refresh.mockRejectedValueOnce(new UnauthorizedException());
    const result = await request(app.getHttpServer())
      .post('/member-auth/web/refresh')
      .set('Origin', 'https://temusobat.tech')
      .set('X-Member-Web', '1')
      .set('Cookie', `member_refresh=${refreshToken}`)
      .send({})
      .expect(401);
    expect(result.headers['set-cookie']).toBeUndefined();
  });

  it('logout revokes only the cookie session and expires the same cookie path', async () => {
    const result = await request(app.getHttpServer())
      .post('/member-auth/web/logout')
      .set('Origin', 'https://temusobat.tech')
      .set('X-Member-Web', '1')
      .set('Cookie', `member_refresh=${refreshToken}`)
      .send({})
      .expect(200);
    expect(auth.logoutByRefreshToken).toHaveBeenCalledWith(refreshToken);
    expect(result.headers['set-cookie'][0]).toContain('member_refresh=;');
    expect(result.headers['set-cookie'][0]).toContain('Path=/member-auth/web');
    expect(result.headers['set-cookie'][0]).toContain(
      'Expires=Thu, 01 Jan 1970',
    );
  });
});
