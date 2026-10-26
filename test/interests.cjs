require('ts-node/register');
require('tsconfig-paths/register');
const assert = require('node:assert/strict');
const { ValidationPipe, ForbiddenException } = require('@nestjs/common');
const { Test } = require('@nestjs/testing');
const { getDataSourceToken } = require('@nestjs/typeorm');
const { InterestsModule } = require('../src/interests/interests.module');
const { InterestsService } = require('../src/interests/interests.service');
const {
  InterestsController,
} = require('../src/interests/interests.controller');
const { CmsMembersGuard } = require('../src/cms-members/cms-members.guard');
const { AdminAuthService } = require('../src/admin-auth/admin-auth.service');
const { Interest } = require('../src/entity/interest.entity');
const { Activity } = require('../src/entity/activity.entity');
const dto = require('../src/interests/interests.dto');
let rows = [],
  audits = [],
  failAudit = false;
const calls = [];
const builder = {};
for (const method of ['andWhere', 'orderBy', 'addOrderBy', 'skip', 'take']) {
  builder[method] = (...args) => {
    calls.push([method, ...args]);
    return builder;
  };
}
builder.getManyAndCount = async () => [rows, rows.length];
// A transaction double; real MySQL schema, locking and races need separate verification.
const db = {
  entityMetadatas: [],
  options: { type: 'mysql' },
  getRepository: () => ({
    findOneBy: async ({ id }) => rows.find((row) => row.id === id),
    createQueryBuilder: () => builder,
  }),
  async transaction(callback) {
    const snapshot = structuredClone(rows),
      previousAudits = structuredClone(audits);
    try {
      return await callback({
        create: (_entity, values) => ({ ...values }),
        findOne: async (_entity, options) => {
          assert.equal(options.lock.mode, 'pessimistic_write');
          return rows.find((row) => row.id === options.where.id);
        },
        save: async (entity, row) => {
          if (entity === Activity) {
            if (failAudit) throw new Error('audit unavailable');
            audits.push(row);
            return row;
          }
          assert.equal(entity, Interest);
          if (
            rows.some(
              (other) => other.id !== row.id && other.nameKey === row.nameKey,
            )
          ) {
            throw Object.assign(new Error('duplicate'), {
              code: 'ER_DUP_ENTRY',
            });
          }
          if (!row.id) {
            row.id = rows.length + 1;
            row.createdAt = new Date();
            rows.push(row);
          }
          row.updatedAt = new Date();
          return row;
        },
      });
    } catch (error) {
      rows = snapshot;
      audits = previousAudits;
      throw error;
    }
  },
};
async function main() {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
  const validate = (type, value, source = 'body') =>
    pipe.transform(value, { type: source, metatype: type });
  const input = {
    name: '  Ｈiking   Club  ',
    description: ' Outdoors ',
    sortOrder: 0,
    isActive: true,
  };
  const clean = await validate(dto.InterestInputDto, input);
  assert.equal(clean.name, 'Hiking Club');
  assert.equal(clean.description, 'Outdoors');
  for (const override of [
    { name: ' ' },
    { name: null },
    { name: 'x'.repeat(101) },
    { description: null },
    { description: 'x'.repeat(501) },
    { isActive: 'false' },
    { isActive: null },
    { sortOrder: -1 },
    { sortOrder: 100001 },
    { sortOrder: 1.1 },
    { sortOrder: '1' },
    { extra: true },
  ]) {
    await assert.rejects(
      validate(dto.InterestInputDto, { ...input, ...override }),
      (error) => error.getStatus() === 400,
    );
  }
  await assert.rejects(validate(dto.UpdateInterestDto, clean));
  await assert.rejects(validate(dto.InterestRevisionDto, { revision: 0 }));
  for (const query of [
    { page: '0' },
    { pageSize: '101' },
    { status: 'deleted' },
    { sortBy: 'name DESC' },
    { search: null },
  ]) {
    await assert.rejects(validate(dto.InterestListDto, query, 'query'));
  }
  const defaults = await validate(dto.InterestListDto, {}, 'query');
  assert.equal(defaults.pageSize, 20);
  assert.equal((await validate(dto.InterestIdDto, { id: '2' }, 'param')).id, 2);
  await assert.rejects(validate(dto.InterestIdDto, { id: '-1' }, 'param'));
  let active = true;
  const auth = {
    currentAdmin: async (id) => {
      if (id !== 7 || !active) throw new ForbiddenException();
    },
  };
  const module = await Test.createTestingModule({ imports: [InterestsModule] })
    .overrideProvider(AdminAuthService)
    .useValue(auth)
    .useMocker((token) => (token === getDataSourceToken('mimate') ? db : {}))
    .compile();
  try {
    const service = module.get(InterestsService),
      controller = module.get(InterestsController),
      guard = module.get(CmsMembersGuard);
    const context = (id) => ({
      switchToHttp: () => ({ getRequest: () => ({ userData: { id } }) }),
    });
    await assert.rejects(
      guard.canActivate(context(undefined)),
      (error) => error.getStatus() === 401,
    );
    await assert.rejects(
      guard.canActivate(context(8)),
      (error) => error.getStatus() === 403,
    );
    assert.equal(await guard.canActivate(context(7)), true);
    active = false;
    await assert.rejects(
      guard.canActivate(context(7)),
      (error) => error.getStatus() === 403,
    );
    assert(
      Reflect.getMetadata('__guards__', InterestsController).includes(
        CmsMembersGuard,
      ),
    );
    const created = (await controller.create(clean, { userData: { id: 7 } }))
      .data;
    assert.equal(created.name, 'Hiking Club');
    assert.equal(created.revision, 1);
    assert.equal(created.nameKey, undefined);
    assert.equal(audits[0].userId, 7);
    await assert.rejects(
      service.save({ ...clean, name: 'hiking club' }, 7),
      (error) => error.getStatus() === 409,
    );
    const inactive = await service.deactivate(created.id, 1, 7);
    assert.equal(inactive.isActive, false);
    assert.equal(inactive.revision, 2);
    await assert.rejects(
      service.save({ ...clean, name: 'HIKING CLUB' }, 7),
      (error) => error.getStatus() === 409,
    );
    await assert.rejects(
      service.save({ ...clean, revision: 1 }, 7, created.id),
      (error) => error.getStatus() === 409,
    );
    await assert.rejects(
      service.deactivate(created.id, 1, 7),
      (error) => error.getStatus() === 409,
    );
    const reactivated = await service.save(
      { ...clean, revision: 2 },
      7,
      created.id,
    );
    assert.equal(reactivated.id, created.id);
    assert.equal(reactivated.isActive, true);
    failAudit = true;
    await assert.rejects(
      service.deactivate(created.id, 3, 7),
      /audit unavailable/,
    );
    assert.equal((await service.detail(created.id)).isActive, true);
    assert.equal((await service.detail(created.id)).revision, 3);
    await assert.rejects(
      service.detail(100),
      (error) => error.getStatus() === 404,
    );
    await service.list({
      ...defaults,
      search: '%_',
      page: 2,
      pageSize: 10,
      status: 'inactive',
      sortBy: 'name',
      sortOrder: 'desc',
    });
    assert.deepEqual(
      calls.find((call) => call[0] === 'orderBy'),
      ['orderBy', 'interest.name', 'DESC'],
    );
    assert.deepEqual(
      calls.find((call) => call[0] === 'skip'),
      ['skip', 10],
    );
    assert(
      calls.some(
        (call) =>
          call[1] === 'LOCATE(:search, LOWER(interest.name)) > 0' &&
          call[2].search === '%_',
      ),
    );
    assert(
      calls.some(
        (call) =>
          call[1] === 'interest.isActive = :active' && call[2].active === false,
      ),
    );
  } finally {
    await module.close();
  }
  console.log(
    'PASS: catalog validation, Nest module/guard wiring, normalization, duplicate/stale conflicts, reactivation, audit rollback, safe list query (repository double).',
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
