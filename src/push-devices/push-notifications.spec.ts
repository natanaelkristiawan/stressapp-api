import { ConfigService } from '@nestjs/config';
import {
  HttpException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { AdminAuthService } from '../admin-auth/admin-auth.service';
import { CmsMembersGuard } from '../cms-members/cms-members.guard';
import { MemberPushDevice } from '../entity/member-push-device.entity';
import { MemberAuthService } from '../member-auth/member-auth.service';
import { CmsPushSettingsController } from './cms-push-settings.controller';
import { PushDevicesService } from './push-devices.service';
import { PushNotificationsService } from './push-notifications.service';

jest.mock('firebase-admin/app', () => ({
  applicationDefault: jest.fn(),
  getApps: jest.fn(),
  initializeApp: jest.fn(),
}));
jest.mock('firebase-admin/messaging', () => ({ getMessaging: jest.fn() }));

/** Creates synthetic provider registrations with no real delivery tokens. */
function device(provider: 'fcm' | 'apns' = 'fcm'): MemberPushDevice {
  return Object.assign(new MemberPushDevice(), {
    provider,
    token: `synthetic-${provider}-token`,
  });
}

// Real controller/DTO/admin-guard/service flow; database, Redis and Firebase are observable mocks.
describe('CMS push notification test', () => {
  let app: INestApplication;
  let sender: PushNotificationsService;
  let config: ConfigService;
  const member = {
    id: 12,
    memberAuthEnabled: true,
    verifiedAt: new Date(),
    is_suspended: false,
    deleted_at: null,
  };
  const repository = { findOneBy: jest.fn() };
  const registrations = { recipients: jest.fn() };
  const auth = { limit: jest.fn() };
  const firebase = { sendEachForMulticast: jest.fn() };
  const admin = { currentAdmin: jest.fn() };

  beforeAll(async () => {
    config = new ConfigService({
      FIREBASE_PROJECT_ID: 'temu-sobat',
      GOOGLE_APPLICATION_CREDENTIALS: '/private/synthetic-test.json',
    });
    const module = await Test.createTestingModule({
      controllers: [CmsPushSettingsController],
      providers: [
        PushNotificationsService,
        CmsMembersGuard,
        { provide: ConfigService, useValue: config },
        { provide: PushDevicesService, useValue: registrations },
        { provide: MemberAuthService, useValue: auth },
        { provide: AdminAuthService, useValue: admin },
        {
          provide: getDataSourceToken('mimate'),
          useValue: { getRepository: () => repository },
        },
      ],
    }).compile();
    sender = module.get(PushNotificationsService);
    app = module.createNestApplication();
    // Production middleware validates CMS JWTs; this fixture only supplies an identity for an explicit synthetic admin.
    app.use((req, _res, next) => {
      if (req.headers.authorization === 'Bearer synthetic-admin')
        req.userData = { id: 7 };
      next();
    });
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.listen(0, '127.0.0.1');
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.resetAllMocks();
    config.set(
      'GOOGLE_APPLICATION_CREDENTIALS',
      '/private/synthetic-test.json',
    );
    repository.findOneBy.mockResolvedValue(member);
    registrations.recipients.mockResolvedValue([
      device(),
      device(),
      device('apns'),
    ]);
    firebase.sendEachForMulticast.mockImplementation(async (message) => ({
      successCount: message.tokens.length,
      failureCount: 0,
      responses: message.tokens.map(() => ({ success: true })),
    }));
    (getApps as jest.Mock).mockReturnValue([]);
    (getMessaging as jest.Mock).mockReturnValue(firebase);
    admin.currentAdmin.mockResolvedValue({ id: '7' });
  });

  it('sends fixed nonclinical text to all FCM devices, skips APNs and returns no tokens', async () => {
    const result = await request(app.getHttpServer())
      .post('/cms-settings/push/test')
      .set('Authorization', 'Bearer synthetic-admin')
      .send({ email: ' TEST@EXAMPLE.TEST ' })
      .expect(200);
    expect(result.body.data).toEqual({
      attempted: 2,
      accepted: 2,
      failed: 0,
      skipped: 1,
      failures: [],
    });
    expect(repository.findOneBy).toHaveBeenCalledWith({
      email: 'test@example.test',
      memberAuthEnabled: true,
    });
    expect(auth.limit).toHaveBeenCalledWith('push-test-admin', '7', 5, 60);
    expect(registrations.recipients).toHaveBeenCalledWith(12);
    expect(firebase.sendEachForMulticast).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: ['synthetic-fcm-token', 'synthetic-fcm-token'],
        android: { notification: { channelId: 'default' } },
        data: { type: 'test-notification' },
      }),
    );
    expect(JSON.stringify(result.body)).not.toContain('synthetic-fcm-token');
    expect(result.headers['cache-control']).toBe('private, no-store');
  });

  it('rejects non-admin identities and rechecks disabled admins', async () => {
    await request(app.getHttpServer())
      .post('/cms-settings/push/test')
      .send({ email: 'test@example.test' })
      .expect(401);
    await request(app.getHttpServer())
      .get('/cms-settings/push')
      .set('Authorization', 'Bearer member')
      .expect(401);
    admin.currentAdmin.mockRejectedValueOnce(
      new HttpException('Disabled', 401),
    );
    await request(app.getHttpServer())
      .post('/cms-settings/push/test')
      .set('Authorization', 'Bearer synthetic-admin')
      .send({ email: 'test@example.test' })
      .expect(401);
    expect(firebase.sendEachForMulticast).not.toHaveBeenCalled();
  });

  it('validates body fields and refuses unavailable members or unregistered devices', async () => {
    for (const body of [
      { email: 'invalid' },
      { email: 123 },
      { email: 'test@example.test', token: 'forged' },
    ]) {
      await request(app.getHttpServer())
        .post('/cms-settings/push/test')
        .set('Authorization', 'Bearer synthetic-admin')
        .send(body)
        .expect(400);
    }
    for (const unavailable of [
      null,
      { ...member, is_suspended: true },
      { ...member, verifiedAt: null },
      { ...member, deleted_at: new Date() },
    ]) {
      repository.findOneBy.mockResolvedValueOnce(unavailable);
      await expect(sender.sendTest('test@example.test', 7)).rejects.toThrow(
        'No active',
      );
    }
    registrations.recipients.mockResolvedValueOnce([]);
    await expect(sender.sendTest('test@example.test', 7)).rejects.toThrow(
      'no active Android/web',
    );
    expect(firebase.sendEachForMulticast).not.toHaveBeenCalled();
  });

  it('reports configuration presence and fails safely when server credentials are absent', async () => {
    config.set('GOOGLE_APPLICATION_CREDENTIALS', '');
    const result = await request(app.getHttpServer())
      .get('/cms-settings/push')
      .set('Authorization', 'Bearer synthetic-admin')
      .expect(200);
    expect(result.body.data).toEqual({
      configured: false,
      projectId: 'temu-sobat',
    });
    await request(app.getHttpServer())
      .post('/cms-settings/push/test')
      .set('Authorization', 'Bearer synthetic-admin')
      .send({ email: 'test@example.test' })
      .expect(503);
    expect(applicationDefault).not.toHaveBeenCalled();
    expect(initializeApp).not.toHaveBeenCalled();
  });

  it('counts partial provider failure and masks unknown provider details', async () => {
    firebase.sendEachForMulticast.mockResolvedValueOnce({
      successCount: 1,
      failureCount: 1,
      responses: [
        { success: true },
        {
          success: false,
          error: { code: 'unsafe-provider-text', message: 'private-token' },
        },
      ],
    });
    const result = await sender.sendTest('test@example.test', 7);
    expect(result.accepted).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.failures).toEqual([
      { code: 'messaging/unknown-error', count: 1 },
    ]);
    expect(JSON.stringify(result)).not.toContain('private-token');
  });

  it('chunks at 500 and reports ambiguous failures without a duplicate retry', async () => {
    registrations.recipients.mockResolvedValueOnce(
      Array.from({ length: 501 }, () => device()),
    );
    firebase.sendEachForMulticast.mockRejectedValueOnce(
      new Error('Synthetic network failure'),
    );
    const result = await sender.sendTest('test@example.test', 7);
    expect(
      firebase.sendEachForMulticast.mock.calls.map(
        ([message]) => message.tokens.length,
      ),
    ).toEqual([500, 1]);
    expect(result).toMatchObject({ accepted: 1, failed: 500, attempted: 501 });
    expect(firebase.sendEachForMulticast).toHaveBeenCalledTimes(2);
  });

  it('honors Redis throttling before looking up a target or contacting Firebase', async () => {
    auth.limit.mockRejectedValueOnce(
      new HttpException('Too many requests', 429),
    );
    await request(app.getHttpServer())
      .post('/cms-settings/push/test')
      .set('Authorization', 'Bearer synthetic-admin')
      .send({ email: 'test@example.test' })
      .expect(429);
    expect(repository.findOneBy).not.toHaveBeenCalled();
    expect(firebase.sendEachForMulticast).not.toHaveBeenCalled();
  });
});
