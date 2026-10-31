// Only a newly created disposable localhost MySQL is accepted. No .env or real member data.
require('ts-node/register');
require('tsconfig-paths/register');
const assert = require('node:assert/strict');
const { readdirSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const mysql = require('mysql2/promise');
const { Test } = require('@nestjs/testing');
const { ValidationPipe } = require('@nestjs/common');
const { TypeOrmModule, getDataSourceToken } = require('@nestjs/typeorm');
const { JwtService } = require('@nestjs/jwt');
const { ConfigModule } = require('@nestjs/config');
const { CmsLogsModule } = require('../src/cms-logs/cms-logs.module');
const { Member } = require('../src/entity/user-mimate.entity');
const { UserAdmin } = require('../src/entity/user-admin.entity');
const { Activity } = require('../src/entity/activity.entity');
const {
  MemberNotification,
} = require('../src/entity/member-notification.entity');
const {
  RedisTokenMiddleware,
} = require('../src/middleware/redis-token.middleware');
const { AuthService } = require('../src/auth/auth.service');
const {
  SuccessInterceptor,
} = require('../src/common/interceptors/success.interceptor');
const {
  NullToEmptyInterceptor,
} = require('../src/common/interceptors/null-to-empty.interceptor');
const {
  LoggingInterceptor,
} = require('../src/common/interceptors/logging.interceptor');

async function main() {
  assert.equal(process.env.CMS_LOGS_TEST_DISPOSABLE, '1');
  const port = Number(process.env.CMS_LOGS_TEST_PORT);
  assert(Number.isInteger(port) && port > 1024 && port !== 3306);
  const options = {
    host: '127.0.0.1',
    port,
    user: 'root',
    password: 'synthetic-logs-root',
  };
  const connection = await mysql.createConnection(options);
  const schema = `cms_logs_test_${Date.now()}_${process.pid}`;
  const secret = 'synthetic-logs-jwt';
  let app;
  let checks = 0;
  const requests = [];
  try {
    await connection.query(
      `CREATE DATABASE \`${schema}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`,
    );
    const folder = resolve(__dirname, '../src/entity');
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ JWT_SECRET: secret })],
        }),
        TypeOrmModule.forRoot({
          name: 'mimate',
          type: 'mysql',
          host: options.host,
          port,
          username: options.user,
          password: options.password,
          database: schema,
          timezone: 'Z',
          synchronize: true,
          entities: readdirSync(folder)
            .filter(
              (file) =>
                /\.entity\.ts$/.test(file) &&
                !/^(user|car|vehicle)\.entity\./.test(file),
            )
            .map((file) => resolve(folder, file)),
        }),
        CmsLogsModule,
      ],
    }).compile();
    app = module.createNestApplication();
    app.useLogger(false);
    const db = module.get(getDataSourceToken('mimate'));
    const jwt = new JwtService({ secret });
    const middleware = new RedisTokenMiddleware(
      jwt,
      new AuthService(db.getRepository(Member)),
      { getOrNil: () => ({ set: async () => undefined }) },
      {},
    );
    app.use((req, res, next) =>
      middleware
        .use(req, res, next)
        .catch((error) =>
          res.status(error.getStatus?.() ?? 500).json({ success: false }),
        ),
    );
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(
      new SuccessInterceptor(),
      new NullToEmptyInterceptor(),
      new LoggingInterceptor({
        create: async (request) => requests.push(request),
      }),
    );
    const admin = await db
      .getRepository(Member)
      .save({
        name: 'Synthetic admin',
        email: 'qa-admin@example.test',
        memberAuthEnabled: true,
        verifiedAt: new Date(),
      });
    const member = await db
      .getRepository(Member)
      .save({
        name: 'Literal %_ member',
        email: 'qa-member@example.test',
        bio: 'PRIVATE_PROFILE',
        passwordHash: 'PRIVATE_HASH',
      });
    await db
      .getRepository(UserAdmin)
      .save({
        backup_member_id: admin.id,
        name: admin.name,
        email: admin.email,
        password: 'synthetic-unused',
      });
    const claims = {
      id: admin.id,
      iss: 'https://mimate.otesuto.com/admin-auth/login',
      aud: 'cms',
      kind: 'admin-access',
    };
    const token = jwt.sign(claims);
    const audit = await db.getRepository(Activity).save([
      {
        userId: admin.id,
        targetUserId: member.id,
        action: 'login',
        source: 'fixture',
        message: 'RAW_PRIVATE_BODY',
        hit_from: 'PRIVATE_CLIENT_LOCATION',
        createdAt: new Date('2026-10-28T23:59:59Z'),
      },
      {
        userId: member.id,
        action: 'notification-template-save',
        source: 'cms-notification-templates',
        message: 'PRIVATE_AUDIT_PAYLOAD',
        createdAt: new Date('2026-10-29T00:00:00Z'),
      },
      {
        userId: admin.id,
        action: 'login',
        source: 'fixture',
        createdAt: new Date('2026-10-29T00:00:00Z'),
      },
    ]);
    const notifications = await db.getRepository(MemberNotification).save([
      {
        memberId: member.id,
        type: 'message',
        title: 'Synthetic unread',
        body: 'Saved template text',
        createdAt: new Date('2026-10-29T00:00:00Z'),
        readAt: null,
        deletedAt: null,
        pushStatus: 'pending',
      },
      {
        memberId: member.id,
        type: 'forum',
        title: 'Synthetic read',
        body: '<b>Literal text</b>',
        createdAt: new Date('2026-10-29T00:00:00Z'),
        readAt: new Date('2026-10-29T01:00:00Z'),
        deletedAt: null,
        pushStatus: 'accepted',
        pushAccepted: 2,
      },
      {
        memberId: member.id,
        type: 'mood-reminder',
        title: 'Synthetic cleared',
        body: 'Saved generic reminder',
        createdAt: new Date('2026-10-28T23:59:59Z'),
        readAt: null,
        deletedAt: new Date('2026-10-29T00:00:00Z'),
        pushStatus: 'failed',
        pushFailed: 1,
        pushFailureCode: 'messaging/request-failed',
      },
      {
        memberId: admin.id,
        type: 'comment-reply',
        title: 'Synthetic other user',
        body: 'Saved generic reply',
        createdAt: new Date('2026-10-29T00:00:00Z'),
        readAt: null,
        deletedAt: null,
        pushStatus: 'skipped',
      },
    ]);
    await app.listen(0, '127.0.0.1');
    const base = `${await app.getUrl()}/cms-logs`;
    async function http(status, path, auth = token, method = 'GET') {
      const response = await fetch(`${base}${path}`, {
        method,
        headers: auth ? { Authorization: `Bearer ${auth}` } : {},
      });
      const json = await response.json();
      assert.equal(response.status, status, `${path}: ${JSON.stringify(json)}`);
      if (status === 200)
        assert.equal(
          response.headers.get('cache-control'),
          'private, no-store',
        );
      assert(!JSON.stringify(json).includes('PRIVATE'));
      checks++;
      return json.data;
    }
    for (const path of [
      '/activity',
      '/notification',
      `/activity/${audit[0].id}`,
      `/notification/${notifications[0].id}`,
    ]) {
      await http(401, path, '');
      await http(
        401,
        path,
        jwt.sign({ ...claims, kind: 'member-access', aud: 'member' }),
      );
      await http(401, path, jwt.sign({ ...claims, id: member.id }));
      await http(401, path, jwt.sign({ ...claims, exp: 1 }));
    }
    const activity = await http(200, '/activity?pageSize=1');
    assert.equal(activity.total, 3);
    assert.equal(activity.items[0].id, audit[2].id);
    const second = await http(200, '/activity?pageSize=1&page=2');
    assert.equal(second.items[0].id, audit[1].id);
    const actorOrTarget = await http(200, `/activity?memberId=${member.id}`);
    assert.equal(actorOrTarget.total, 2);
    assert.equal((await http(200, '/activity?search=%25_')).total, 2);
    assert.equal((await http(200, '/activity?action=login')).total, 2);
    assert.equal(
      (await http(200, '/activity?from=2026-10-29&to=2026-10-29')).total,
      2,
    );
    const detail = await http(200, `/activity/${audit[0].id}`);
    assert.equal(detail.targetMember.id, member.id);
    assert(!('message' in detail));
    assert(!('hit_from' in detail));
    assert.deepEqual(Object.keys(detail.actor).sort(), ['email', 'id', 'name']);
    const all = await http(200, '/notification');
    assert.equal(all.total, 4);
    const cleared = await http(200, '/notification?state=cleared');
    assert.equal(cleared.total, 1);
    assert.equal(cleared.items[0].deletedAt, '2026-10-29T00:00:00.000Z');
    assert.equal((await http(200, '/notification?state=unread')).total, 2);
    assert.equal((await http(200, '/notification?state=read')).total, 1);
    assert.equal(
      (await http(200, '/notification?type=message&pushStatus=pending')).total,
      1,
    );
    assert.equal(
      (await http(200, `/notification?memberId=${member.id}`)).total,
      3,
    );
    assert.equal((await http(200, '/notification?search=%25_')).total, 3);
    assert.equal(
      (await http(200, '/notification?from=2026-10-28&to=2026-10-28')).total,
      1,
    );
    assert.equal(
      (await http(200, '/notification?pushStatus=failed')).items[0].pushFailed,
      1,
    );
    const notification = await http(
      200,
      `/notification/${notifications[0].id}`,
    );
    assert.equal(notification.readAt, null);
    assert.equal(notification.deletedAt, null);
    assert(!('eventKey' in notification));
    assert(!('destination' in notification));
    assert.equal(
      (await http(200, '/notification?memberId=2147483647')).total,
      0,
    );
    for (const path of [
      '/activity?page=0',
      '/activity?pageSize=101',
      '/activity?memberId=0',
      '/activity?memberId=null',
      '/activity?from=2026-02-31',
      '/activity?from=2026-10-29&to=2026-10-28',
      '/activity?from=',
      '/activity?type=message',
      '/activity?search=' + 'x'.repeat(101),
      '/activity?action=' + 'x'.repeat(51),
      '/notification?state=deleted',
      '/notification?type=all',
      '/notification?pushStatus=delivered',
      '/notification?to=not-a-date',
      '/notification?adminId=1',
      '/notification?sortBy=SQL',
      '/notification/-1',
      '/notification/2147483648',
      '/activity/not-an-id',
    ])
      await http(400, path);
    await http(404, '/activity/2147483647');
    await http(404, '/notification/2147483647');
    await http(404, `/notification/${notifications[0].id}`, token, 'DELETE');
    await http(404, '/notification', token, 'POST');
    await db
      .getRepository(Member)
      .update({ id: admin.id }, { is_suspended: true });
    await http(401, '/notification');
    await db
      .getRepository(Member)
      .update(
        { id: admin.id },
        { is_suspended: false, deleted_at: new Date() },
      );
    await http(401, '/activity');
    assert.equal(await db.getRepository(MemberNotification).count(), 4);
    assert.equal(await db.getRepository(Activity).count(), 3);
    assert.equal(
      (
        await db
          .getRepository(MemberNotification)
          .findOneByOrFail({ id: notifications[0].id })
      ).readAt,
      null,
    );
    assert.equal(requests.length, 0);
    const appSource = readFileSync(
      resolve(__dirname, '../src/app.module.ts'),
      'utf8',
    );
    assert(
      appSource.includes(
        "{ path: 'cms-logs/(.*)', method: RequestMethod.ALL }",
      ),
    );
    console.log(
      `PASS: ${checks} real HTTP checks with MySQL, live admin JWT/guard, UTC filters, literal search, stable pages, cleared history, safe projection and no write/logging side effects.`,
    );
  } finally {
    if (app) await app.close();
    await connection.query(`DROP DATABASE IF EXISTS \`${schema}\``);
    await connection.end();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
