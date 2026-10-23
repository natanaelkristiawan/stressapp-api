import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { CmsModerationSettingsController } from './cms-moderation-settings.controller';
import { ContentModerationService } from './content-moderation.service';
import { CmsMembersGuard } from '../cms-members/cms-members.guard';
import { AdminAuthService } from '../admin-auth/admin-auth.service';
import { SuccessInterceptor } from '../common/interceptors/success.interceptor';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor';
import { RequestLogService } from '../request-log/request-log.service';

describe('CMS moderation test endpoint', () => {
  let app: INestApplication;
  const admin = { currentAdmin: jest.fn() };
  const moderation = { status: jest.fn(), testContent: jest.fn() };
  const logger = { create: jest.fn() };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [CmsModerationSettingsController],
      providers: [
        CmsMembersGuard,
        { provide: AdminAuthService, useValue: admin },
        { provide: ContentModerationService, useValue: moderation },
      ],
    }).compile();
    app = module.createNestApplication();
    app.use((req, _res, next) => {
      // Production CMS middleware verifies JWTs; only this synthetic identity is accepted here.
      if (req.headers.authorization === 'Bearer synthetic-admin') {
        req.userData = { id: 7 };
      }
      next();
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(
      new LoggingInterceptor(logger as unknown as RequestLogService),
      new SuccessInterceptor(),
    );
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    admin.currentAdmin.mockResolvedValue({ id: '1' });
    moderation.status.mockReturnValue({
      configured: true,
      model: 'test-model',
    });
    moderation.testContent.mockResolvedValue({
      action: 'publish',
      categories: [],
      model: 'test-model',
      policy: 'test-policy',
      checkedAt: new Date().toISOString(),
    });
  });

  it('returns safe setup state with no-store headers', async () => {
    const result = await request(app.getHttpServer())
      .get('/cms-settings/moderation')
      .set('Authorization', 'Bearer synthetic-admin')
      .expect(200);
    expect(result.body.data).toEqual({ configured: true, model: 'test-model' });
    expect(result.headers['cache-control']).toBe('private, no-store');
    expect(admin.currentAdmin).toHaveBeenCalledWith(7);
  });
  it.each(['publish', 'reject', 'pending'])(
    'returns %s using the real member classifier interface without CMS bypass',
    async (action) => {
      moderation.testContent.mockResolvedValue({
        action,
        categories: [],
        model: 'test-model',
        policy: 'test-policy',
        checkedAt: new Date().toISOString(),
      });
      const result = await request(app.getHttpServer())
        .post('/cms-settings/moderation/test')
        .set('Authorization', 'Bearer synthetic-admin')
        .send({ content: 'synthetic test text' })
        .expect(200);
      expect(result.body.data.action).toBe(action);
      expect(moderation.testContent).toHaveBeenCalledWith(
        ['synthetic test text'],
        7,
      );
      expect(logger.create).not.toHaveBeenCalled();
    },
  );
  it.each([
    {},
    { content: '' },
    { content: '   ' },
    { content: 123 },
    { content: 'x'.repeat(10001) },
    { content: 'text', skipModeration: true },
  ])('rejects invalid input %p', async (body) => {
    await request(app.getHttpServer())
      .post('/cms-settings/moderation/test')
      .set('Authorization', 'Bearer synthetic-admin')
      .send(body)
      .expect(400);
    expect(moderation.testContent).not.toHaveBeenCalled();
  });
  it('rejects anonymous/forged-source and inactive admin requests before classification', async () => {
    await request(app.getHttpServer())
      .post('/cms-settings/moderation/test')
      .set('X-Source', 'cms')
      .send({ content: 'text' })
      .expect(401);
    admin.currentAdmin.mockRejectedValue(new UnauthorizedException());
    await request(app.getHttpServer())
      .post('/cms-settings/moderation/test')
      .set('Authorization', 'Bearer synthetic-admin')
      .send({ content: 'text' })
      .expect(401);
    expect(moderation.testContent).not.toHaveBeenCalled();
  });
});
