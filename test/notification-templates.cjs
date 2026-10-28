require('ts-node/register');
require('tsconfig-paths/register');
const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const { resolve } = require('node:path');
const { ValidationPipe } = require('@nestjs/common');
const { Test } = require('@nestjs/testing');
const { JwtService } = require('@nestjs/jwt');
const { getDataSourceToken } = require('@nestjs/typeorm');
const { DataSource } = require('typeorm');
const {
  NotificationTemplatesModule,
} = require('../src/notification-templates/notification-templates.module');
const {
  NotificationTemplatesService,
} = require('../src/notification-templates/notification-templates.service');
const {
  NotificationTemplate,
} = require('../src/entity/notification-template.entity');
const { Member } = require('../src/entity/user-mimate.entity');
const { UserAdmin } = require('../src/entity/user-admin.entity');
const {
  NotificationType,
} = require('../src/entity/member-notification.entity');
const { Activity } = require('../src/entity/activity.entity');
const {
  RedisTokenMiddleware,
} = require('../src/middleware/redis-token.middleware');
const {
  LoggingInterceptor,
} = require('../src/common/interceptors/logging.interceptor');
const {
  renderTemplateText,
} = require('../src/notification-templates/notification-templates.render');

let rows = [];
let audits = [];
let failAudit = false;
let writeError;
let adminEnabled = true;
let suspended = false;
let memberDeleted = false;
const lockCalls = [];
const requestLogs = [];
const repository = {
  find: async () => structuredClone(rows),
  findOneBy: async ({ type }) =>
    structuredClone(rows.find((row) => row.type === type) ?? null),
};
// Repository/transaction double verifies scope and rollback, not MySQL lock semantics.
const db = {
  entityMetadatas: [],
  options: { type: 'mysql' },
  getRepository(entity) {
    if (entity === NotificationTemplate) return repository;
    if (entity === UserAdmin) {
      return {
        findOne: async ({ where }) =>
          adminEnabled && where.backup_member_id === 7
            ? {
                id: 1,
                name: 'Synthetic admin',
                email: 'admin@example.test',
                userMimate: {
                  id: 7,
                  is_suspended: suspended,
                  deleted_at: memberDeleted ? new Date() : null,
                },
              }
            : null,
      };
    }
    throw new Error('Unexpected repository');
  },
  async transaction(callback) {
    const snapshot = structuredClone({ rows, audits });
    try {
      return await callback({
        create: (entity, values) => {
          assert.equal(entity, NotificationTemplate);
          return { ...values };
        },
        findOne: async (entity, options) => {
          assert.equal(entity, NotificationTemplate);
          assert.equal(options.lock.mode, 'pessimistic_write');
          lockCalls.push(options.where.type);
          return structuredClone(
            rows.find((row) => row.type === options.where.type) ?? null,
          );
        },
        save: async (entity, row) => {
          if (entity === Activity) {
            if (failAudit) throw new Error('synthetic audit failure');
            audits.push(structuredClone(row));
            return row;
          }
          assert.equal(entity, NotificationTemplate);
          if (writeError)
            throw Object.assign(new Error('synthetic write failure'), {
              code: writeError,
            });
          const existing = rows.findIndex((item) => item.type === row.type);
          const saved = {
            ...row,
            createdAt: row.createdAt ?? new Date(),
            updatedAt: new Date(),
          };
          if (existing === -1) rows.push(saved);
          else rows[existing] = saved;
          return structuredClone(saved);
        },
      });
    } catch (error) {
      rows = snapshot.rows;
      audits = snapshot.audits;
      throw error;
    }
  },
};

async function main() {
  const module = await Test.createTestingModule({
    imports: [NotificationTemplatesModule],
  })
    .useMocker((token) =>
      token === getDataSourceToken('mimate') ? db : undefined,
    )
    .compile();
  const app = module.createNestApplication();
  app.useLogger(false);
  const jwt = new JwtService({ secret: 'synthetic-notification-test-key' });
  const claims = {
    id: 7,
    iss: 'https://mimate.otesuto.com/admin-auth/login',
    aud: 'cms',
    kind: 'admin-access',
  };
  const adminToken = jwt.sign(claims);
  const middleware = new RedisTokenMiddleware(
    jwt,
    {
      getLocalMember: async (id) =>
        [7, 8].includes(id) ? { id, is_suspended: suspended } : null,
    },
    { getOrNil: () => ({ set: async () => undefined }) },
    {},
  );
  app.use((req, res, next) => {
    middleware
      .use(req, res, next)
      .catch((error) =>
        res
          .status(error.getStatus?.() ?? 500)
          .json({ message: 'Unauthorized' }),
      );
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(
    new LoggingInterceptor({
      create: async (entry) => requestLogs.push(entry),
    }),
  );
  await app.listen(0, '127.0.0.1');
  const base = `${await app.getUrl()}/cms-notification-templates`;
  let assertions = 0;
  async function http(
    status,
    path = '',
    method = 'GET',
    body,
    token = adminToken,
  ) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const result = await response.json();
    assert.equal(
      response.status,
      status,
      `${method} ${path}: ${JSON.stringify(result)}`,
    );
    assertions++;
    return { result: result.data, headers: response.headers };
  }
  try {
    const service = module.get(NotificationTemplatesService);
    const input = {
      title: 'Pesan baru',
      body: '{{actorName}} mengirim pesan.',
      revision: 0,
    };
    await http(401, '', 'GET', undefined, '');
    await http(401, '/message', 'PUT', input, '');
    for (const token of [
      'invalid',
      jwt.sign({ ...claims, id: 8 }),
      jwt.sign({ ...claims, kind: 'member-access', aud: 'member' }),
      jwt.sign({ ...claims, exp: 1 }),
    ])
      await http(401, '', 'GET', undefined, token);
    adminEnabled = false;
    await http(401);
    await http(401, '/message', 'PUT', input);
    adminEnabled = true;
    suspended = true;
    await http(401);
    suspended = false;
    memberDeleted = true;
    await http(401);
    memberDeleted = false;

    const initial = await http(200);
    assert.equal(initial.headers.get('cache-control'), 'private, no-store');
    assert.equal(initial.result.total, 4);
    assert(
      initial.result.items.every(
        (row) => row.revision === 0 && !row.configured,
      ),
    );
    assert.equal(rows.length, 0);
    assert.equal(audits.length, 0);
    assert.deepEqual(
      (await http(200, '/mood-reminder')).result.placeholders,
      [],
    );
    await http(400, '/all');
    await http(400, '/all', 'PUT', input);
    await assert.rejects(
      service.render(NotificationType.Message, { actorName: 'Budi' }),
      (error) => error.getStatus() === 503,
    );

    for (const override of [
      { title: '' },
      { title: '   ' },
      { title: null },
      { title: 7 },
      { title: 'x'.repeat(161) },
      { body: 'x'.repeat(1001) },
      { body: null },
      { body: '{{messageText}}' },
      { body: '{{constructor}}' },
      { body: '{{ actorName }}' },
      { body: '{{actorName}' },
      { body: '{{{actorName}}}' },
      { body: '${actorName}' },
      { body: '<script>alert(1)</script>' },
      { body: 'Bad\u0000text' },
      { title: '{{actorName}}'.repeat(2) },
      { body: '{{actorName}}'.repeat(11) },
      { revision: -1 },
      { revision: 1.5 },
      { revision: '0' },
      { revision: true },
      { revision: null },
      { revision: 2147483647 },
      { actorId: 8 },
      { isActive: false },
    ])
      await http(400, '/message', 'PUT', { ...input, ...override });
    const { revision, ...missingRevision } = input;
    await http(400, '/message', 'PUT', missingRevision);
    await http(400, '/mood-reminder', 'PUT', input);
    assert.equal(rows.length, 0);

    const saved = (
      await http(200, '/message', 'PUT', { ...input, title: ' Pesan baru ' })
    ).result;
    assert.equal(saved.title, 'Pesan baru');
    assert.equal(saved.revision, 1);
    assert.equal(saved.configured, true);
    assert.deepEqual(saved.placeholders, ['actorName']);
    assert.equal(audits.length, 1);
    assert.equal(audits[0].userId, 7);
    assert.deepEqual(JSON.parse(audits[0].message), {
      type: 'message',
      revision: 1,
    });
    assert(!JSON.stringify(audits).includes('mengirim'));
    assert.deepEqual(lockCalls, ['message']);
    const oldSnapshot = await service.render(NotificationType.Message, {
      actorName: 'Budi',
    });
    assert.equal(oldSnapshot.body, 'Budi mengirim pesan.');
    assert.equal(oldSnapshot.templateRevision, 1);
    await http(409, '/message', 'PUT', input);
    const updated = (
      await http(200, '/message', 'PUT', {
        ...input,
        body: 'Pesan dari {{actorName}}.',
        revision: 1,
      })
    ).result;
    assert.equal(updated.revision, 2);
    assert.equal(oldSnapshot.body, 'Budi mengirim pesan.');
    assert.equal(
      (await service.render(NotificationType.Message, { actorName: 'Budi' }))
        .body,
      'Pesan dari Budi.',
    );
    await http(409, '/message', 'PUT', { ...input, revision: 1 });
    assert.equal(audits.length, 2);

    for (const values of [
      undefined,
      null,
      [],
      'Budi',
      {},
      { actorName: '' },
      { actorName: 'x'.repeat(101) },
      { actorName: 2 },
      { actorName: 'Budi\nspoof' },
      { actorName: 'Budi', messageText: 'private' },
    ]) {
      await assert.rejects(
        service.render(NotificationType.Message, values),
        (error) => error.getStatus() === 400,
      );
    }
    assert.equal(
      (
        await service.render(NotificationType.Message, {
          actorName: '{{actorName}} $&',
        })
      ).body,
      'Pesan dari {{actorName}} $&.',
    );
    assert.equal(
      renderTemplateText(NotificationType.Message, 'Pesan', '{{actorName}}', {
        actorName: '<b>Budi</b>',
      }).body,
      '<b>Budi</b>',
    );
    // Values are literal plain text, not HTML. Consumers must use text rendering, never innerHTML.
    assert.equal(
      (
        await service.render(NotificationType.Message, {
          actorName: 'x'.repeat(100),
        })
      ).body.length,
      112,
    );

    failAudit = true;
    await assert.rejects(
      service.save(NotificationType.Message, { ...input, revision: 2 }, 7),
      /synthetic audit failure/,
    );
    failAudit = false;
    assert.equal((await service.detail(NotificationType.Message)).revision, 2);
    assert.equal(audits.length, 2);
    for (const code of [
      'ER_DUP_ENTRY',
      'ER_LOCK_DEADLOCK',
      'ER_LOCK_WAIT_TIMEOUT',
    ]) {
      writeError = code;
      await assert.rejects(
        service.save(NotificationType.Message, { ...input, revision: 2 }, 7),
        (error) => error.getStatus() === 409,
      );
    }
    writeError = 'UNEXPECTED';
    await assert.rejects(
      service.save(NotificationType.Message, { ...input, revision: 2 }, 7),
      /synthetic write failure/,
    );
    writeError = undefined;
    assert.equal((await service.detail(NotificationType.Message)).revision, 2);
    for (const type of ['forum', 'comment-reply']) {
      await http(200, `/${type}`, 'PUT', {
        ...input,
        body: '{{actorName}} memiliki aktivitas baru.',
      });
      assert.equal(
        (await service.render(type, { actorName: 'Budi' })).body,
        'Budi memiliki aktivitas baru.',
      );
    }
    await http(200, '/mood-reminder', 'PUT', {
      title: 'Mood Tracker',
      body: 'Yuk, catat mood hari ini.',
      revision: 0,
    });
    assert.equal(
      (await service.render(NotificationType.MoodReminder, {})).body,
      'Yuk, catat mood hari ini.',
    );
    await assert.rejects(
      service.render(NotificationType.MoodReminder, { actorName: 'Budi' }),
      (error) => error.getStatus() === 400,
    );
    assert((await http(200)).result.items.every((row) => row.configured));
    assert.equal(requestLogs.length, 0);
    await http(404, '/message/send', 'POST', { memberId: 8 });

    const source = readFileSync(
      resolve(__dirname, '../src/app.module.ts'),
      'utf8',
    );
    assert(source.includes('NotificationTemplatesModule,'));
    assert(source.includes('entities: [NotificationTemplate,'));
    assert(
      source.includes(
        "{ path: 'cms-notification-templates/(.*)', method: RequestMethod.ALL }",
      ),
    );
    const folder = resolve(__dirname, '../src/entity');
    const metadataDb = new DataSource({
      type: 'mysql',
      database: 'synthetic_metadata_only',
      entities: readdirSync(folder)
        .filter(
          (file) =>
            /\.entity\.ts$/.test(file) &&
            !/^(user|car|vehicle)\.entity\./.test(file),
        )
        .map((file) => resolve(folder, file)),
    });
    await metadataDb.buildMetadatas();
    const metadata = metadataDb.getMetadata(NotificationTemplate);
    assert.deepEqual(
      metadata.primaryColumns.map((column) => column.propertyName),
      ['type'],
    );
    assert.equal(
      metadata.columns.find((column) => column.propertyName === 'body').length,
      '1000',
    );
    assert(metadataDb.hasMetadata(Member));
    console.log(
      `PASS: ${assertions} real HTTP checks, live admin/JWT boundaries, template validation/rendering, revision conflicts, audit rollback/log exclusion and offline TypeORM metadata (repository doubles; no MySQL or push send).`,
    );
  } finally {
    await app.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
