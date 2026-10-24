import { DEFAULT_MESSAGES } from './moderation-policy';
import { ModerationMessagesService } from './moderation-messages.service';
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
  const moderation = {
    status: jest.fn(),
    saveProvider: jest.fn(),
    testContent: jest.fn(),
  };
  const messages = { read: jest.fn(), save: jest.fn() };
  const logger = { create: jest.fn() };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [CmsModerationSettingsController],
      providers: [
        CmsMembersGuard,
        {
          provide: ModerationMessagesService,
          useValue: messages,
        },
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
    messages.read.mockResolvedValue({
      messages: DEFAULT_MESSAGES,
      version: 'a'.repeat(64),
    });
    messages.save.mockResolvedValue({
      messages: DEFAULT_MESSAGES,
      version: 'b'.repeat(64),
    });
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

  it('saves provider settings without echoing or logging the key', async () => {
    const safe = {
      configured: true,
      model: 'deepseek-v4-flash',
      version: 'b'.repeat(64),
    };
    moderation.saveProvider.mockResolvedValue(safe);
    const result = await request(app.getHttpServer())
      .put('/cms-settings/moderation')
      .set('Authorization', 'Bearer synthetic-admin')
      .send({
        apiKey: 'synthetic-private-key',
        model: 'deepseek-v4-flash',
        version: 'a'.repeat(64),
      })
      .expect(200);
    expect(result.body.data).toEqual(safe);
    expect(JSON.stringify(result.body)).not.toContain('synthetic-private-key');
    expect(result.headers['cache-control']).toBe('private, no-store');
    expect(logger.create).not.toHaveBeenCalled();
  });

  it.each([
    {},
    { apiKey: 'has space', model: 'test', version: 'a'.repeat(64) },
    { apiKey: 'secret\nheader', model: 'test', version: 'a'.repeat(64) },
    { apiKey: 'x'.repeat(4097), model: 'test', version: 'a'.repeat(64) },
    { apiKey: '', model: '../invalid', version: 'a'.repeat(64) },
    { apiKey: '', model: '', version: 'a'.repeat(64) },
    { apiKey: '', model: 'test', version: 'bad' },
    { apiKey: null, model: 'test', version: 'a'.repeat(64) },
    {
      apiKey: '',
      model: 'test',
      version: 'a'.repeat(64),
      endpoint: 'https://elsewhere',
    },
  ])('rejects invalid provider input %p', async (input) => {
    await request(app.getHttpServer())
      .put('/cms-settings/moderation')
      .set('Authorization', 'Bearer synthetic-admin')
      .send(input)
      .expect(400);
    expect(moderation.saveProvider).not.toHaveBeenCalled();
  });

  it('requires an authorized live admin for provider changes', async () => {
    const body = { apiKey: '', model: 'test', version: 'a'.repeat(64) };
    await request(app.getHttpServer())
      .put('/cms-settings/moderation')
      .send(body)
      .expect(401);
    admin.currentAdmin.mockRejectedValue(new UnauthorizedException());
    await request(app.getHttpServer())
      .put('/cms-settings/moderation')
      .set('Authorization', 'Bearer synthetic-admin')
      .send(body)
      .expect(401);
    expect(moderation.saveProvider).not.toHaveBeenCalled();
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
  it('reads and updates four fixed messages through the live admin guard', async () => {
    const result = await request(app.getHttpServer())
      .get('/cms-settings/moderation/messages')
      .set('Authorization', 'Bearer synthetic-admin')
      .expect(200);
    expect(result.body.data.messages).toEqual(DEFAULT_MESSAGES);
    await request(app.getHttpServer())
      .put('/cms-settings/moderation/messages')
      .set('Authorization', 'Bearer synthetic-admin')
      .send({ messages: DEFAULT_MESSAGES, version: 'a'.repeat(64) })
      .expect(200);
    expect(messages.save).toHaveBeenCalledWith(
      DEFAULT_MESSAGES,
      'a'.repeat(64),
    );
    await request(app.getHttpServer())
      .put('/cms-settings/moderation/messages')
      .send({ messages: DEFAULT_MESSAGES, version: 'a'.repeat(64) })
      .expect(401);
  });
  it.each([
    {},
    { messages: DEFAULT_MESSAGES },
    { messages: { ...DEFAULT_MESSAGES, sexual: '' }, version: 'a'.repeat(64) },
    {
      messages: { ...DEFAULT_MESSAGES, sara: ' '.repeat(4) },
      version: 'a'.repeat(64),
    },
    {
      messages: { ...DEFAULT_MESSAGES, bullying: 'x'.repeat(2001) },
      version: 'a'.repeat(64),
    },
    {
      messages: { ...DEFAULT_MESSAGES, custom: 'extra' },
      version: 'a'.repeat(64),
    },
    { messages: DEFAULT_MESSAGES, version: 'wrong' },
  ])('rejects invalid message configuration %p', async (input) => {
    await request(app.getHttpServer())
      .put('/cms-settings/moderation/messages')
      .set('Authorization', 'Bearer synthetic-admin')
      .send(input)
      .expect(400);
    expect(messages.save).not.toHaveBeenCalled();
  });
});
