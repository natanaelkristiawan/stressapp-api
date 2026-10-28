import 'reflect-metadata';
import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { FindOperator, FindOptionsWhere } from 'typeorm';
import * as request from 'supertest';
import {
  MemberNotification,
  NotificationType,
} from '../entity/member-notification.entity';
import { MemberAuthGuard } from '../member-auth/member-auth.guard';
import { MemberAuthService } from '../member-auth/member-auth.service';
import { MemberAuthController } from '../member-auth/member-auth.controller';
import { MemberNotificationsController } from './member-notifications.controller';
import { MemberNotificationsService } from './member-notifications.service';

// Exercise real HTTP/DTO/guard/services; only authentication proof and persistence are doubles.
describe('Member notification inbox', () => {
  let app: INestApplication;
  let records: MemberNotification[];
  const repository = {
    findAndCount: jest.fn(),
    findOneBy: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  };
  const db = { getRepository: jest.fn(() => repository) };
  const auth = Object.create(MemberAuthService.prototype) as MemberAuthService;
  const identity = { id: 7, email: 'synthetic@example.test' };

  function matches(
    record: MemberNotification,
    where: FindOptionsWhere<MemberNotification>,
  ) {
    return Object.entries(where).every(([key, expected]) => {
      const actual = record[key as keyof MemberNotification];
      if (expected instanceof FindOperator) {
        expect(expected.type).toBe('isNull');
        return actual === null;
      }
      return actual === expected;
    });
  }

  beforeAll(async () => {
    Object.assign(auth, { db });
    jest.spyOn(auth, 'authenticateSession').mockResolvedValue({
      member: identity,
      sessionId: 'synthetic-session',
    } as Awaited<ReturnType<MemberAuthService['authenticateSession']>>);
    const module = await Test.createTestingModule({
      controllers: [MemberNotificationsController, MemberAuthController],
      providers: [
        MemberNotificationsService,
        MemberAuthGuard,
        { provide: getDataSourceToken('mimate'), useValue: db },
        { provide: MemberAuthService, useValue: auth },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.listen(0, '127.0.0.1');
  });

  beforeEach(() => {
    records = [
      {
        id: 1,
        memberId: 7,
        type: NotificationType.Message,
        readAt: null,
        deletedAt: null,
      },
      {
        id: 2,
        memberId: 7,
        type: NotificationType.Forum,
        readAt: null,
        deletedAt: null,
      },
      {
        id: 3,
        memberId: 8,
        type: NotificationType.Message,
        readAt: null,
        deletedAt: null,
      },
      {
        id: 4,
        memberId: 7,
        type: NotificationType.Message,
        readAt: new Date(1000),
        deletedAt: null,
      },
      {
        id: 5,
        memberId: 7,
        type: NotificationType.Message,
        readAt: null,
        deletedAt: new Date(2000),
      },
    ].map((record) =>
      Object.assign(new MemberNotification(), record, {
        title: 'Synthetic notification',
        body: 'Synthetic body',
        destination: null,
        createdAt: new Date(0),
      }),
    );
    repository.findAndCount.mockImplementation(
      async ({ where, skip, take }) => {
        const filtered = records
          .filter((record) => matches(record, where))
          .sort((a, b) => b.id - a.id);
        return [filtered.slice(skip, skip + take), filtered.length];
      },
    );
    repository.findOneBy.mockImplementation(
      async (where) => records.find((record) => matches(record, where)) ?? null,
    );
    repository.count.mockImplementation(
      async ({ where }) =>
        records.filter((record) => matches(record, where)).length,
    );
    repository.update.mockImplementation(async (where, patch) => {
      const selected = records.filter((record) => matches(record, where));
      selected.forEach((record) => Object.assign(record, patch));
      return { affected: selected.length };
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires member authentication', async () => {
    await request(app.getHttpServer())
      .get('/me/notifications?type=message')
      .expect(401);
    await request(app.getHttpServer())
      .patch('/me/notifications/1/read')
      .expect(401);
    await request(app.getHttpServer())
      .delete('/me/notifications/1')
      .expect(401);
  });

  it.each([
    '',
    '?type=all',
    '?type=message&page=0',
    '?type=message&pageSize=101',
    '?type=message&memberId=8',
  ])('rejects invalid list input %s', async (query) => {
    await request(app.getHttpServer())
      .get(`/me/notifications${query}`)
      .auth('synthetic', { type: 'bearer' })
      .expect(400);
  });

  it('scopes category, ownership and soft deletion with stable pagination', async () => {
    const response = await request(app.getHttpServer())
      .get('/me/notifications?type=message&pageSize=1')
      .auth('synthetic', { type: 'bearer' })
      .expect(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.body.data.total).toBe(2);
    expect(
      response.body.data.items.map((item: { id: number }) => item.id),
    ).toEqual([4]);
    expect(response.body.data.items[0]).not.toHaveProperty('memberId');
    const next = await request(app.getHttpServer())
      .get('/me/notifications?type=message&pageSize=1&page=2')
      .auth('synthetic', { type: 'bearer' })
      .expect(200);
    expect(next.body.data.items[0].id).toBe(1);
  });

  it('preserves first read time on repeated reads and updates the unread count', async () => {
    const first = await request(app.getHttpServer())
      .patch('/me/notifications/1/read')
      .auth('synthetic', { type: 'bearer' })
      .expect(200);
    const second = await request(app.getHttpServer())
      .patch('/me/notifications/1/read')
      .auth('synthetic', { type: 'bearer' })
      .expect(200);
    expect(second.body.data.readAt).toBe(first.body.data.readAt);
    expect(second.body.data.unreadNotificationCount).toBe(1);
  });

  it('soft-deletes without removing history, supports repeated clear, excludes cleared from reads/count', async () => {
    const first = await request(app.getHttpServer())
      .delete('/me/notifications/1')
      .auth('synthetic', { type: 'bearer' })
      .expect(200);
    const second = await request(app.getHttpServer())
      .delete('/me/notifications/1')
      .auth('synthetic', { type: 'bearer' })
      .expect(200);
    expect(second.body.data.deletedAt).toBe(first.body.data.deletedAt);
    expect(second.body.data.unreadNotificationCount).toBe(1);
    expect(records).toHaveLength(5);
    await request(app.getHttpServer())
      .patch('/me/notifications/1/read')
      .auth('synthetic', { type: 'bearer' })
      .expect(404);
  });

  it.each([3, 999])(
    'does not expose or mutate foreign/missing record %s',
    async (id) => {
      await request(app.getHttpServer())
        .patch(`/me/notifications/${id}/read`)
        .auth('synthetic', { type: 'bearer' })
        .expect(404);
      await request(app.getHttpServer())
        .delete(`/me/notifications/${id}`)
        .auth('synthetic', { type: 'bearer' })
        .expect(404);
      expect(records.find((record) => record.id === 3)?.deletedAt).toBeNull();
      expect(records.find((record) => record.id === 3)?.readAt).toBeNull();
    },
  );

  it.each(['0', '-1', '1.5', 'abc', '2147483648'])(
    'rejects invalid route ID %s',
    async (id) => {
      await request(app.getHttpServer())
        .patch(`/me/notifications/${id}/read`)
        .auth('synthetic', { type: 'bearer' })
        .expect(400);
      await request(app.getHttpServer())
        .delete(`/me/notifications/${id}`)
        .auth('synthetic', { type: 'bearer' })
        .expect(400);
    },
  );

  it('adds only the retained unread count to /member-auth/me', async () => {
    const result = await request(app.getHttpServer())
      .get('/member-auth/me')
      .auth('synthetic', { type: 'bearer' })
      .expect(200);
    expect(result.headers['cache-control']).toBe('private, no-store');
    expect(result.body).toEqual({ ...identity, unreadNotificationCount: 2 });
    await request(app.getHttpServer()).get('/member-auth/me').expect(401);
  });

  it('honors live-session rejection before touching inbox data', async () => {
    const callsBefore = repository.findAndCount.mock.calls.length;
    jest
      .spyOn(auth, 'authenticateSession')
      .mockRejectedValueOnce(new UnauthorizedException());
    await request(app.getHttpServer())
      .get('/me/notifications?type=message')
      .auth('synthetic', { type: 'bearer' })
      .expect(401);
    expect(repository.findAndCount.mock.calls.length).toBe(callsBefore);
  });

  it('returns zero and an empty category when no retained notifications remain', async () => {
    records = [];
    const list = await request(app.getHttpServer())
      .get('/me/notifications?type=forum')
      .auth('synthetic', { type: 'bearer' })
      .expect(200);
    expect(list.body.data).toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
    expect(await auth.me('synthetic')).toEqual({
      ...identity,
      unreadNotificationCount: 0,
    });
  });

  it('propagates database failure instead of reporting a false zero', async () => {
    repository.count.mockRejectedValueOnce(new Error('synthetic outage'));
    await expect(auth.me('synthetic')).rejects.toThrow('synthetic outage');
  });
});
