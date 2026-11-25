require('ts-node/register');
require('tsconfig-paths/register');
const assert = require('node:assert/strict');
const { ValidationPipe, ForbiddenException } = require('@nestjs/common');
const { Test } = require('@nestjs/testing');
const { getDataSourceToken } = require('@nestjs/typeorm');
const {
  InterestCategoriesModule,
} = require('../src/interest-categories/interest-categories.module');
const {
  InterestCategoriesService,
} = require('../src/interest-categories/interest-categories.service');
const {
  InterestCategoriesController,
} = require('../src/interest-categories/interest-categories.controller');
const { CmsMembersGuard } = require('../src/cms-members/cms-members.guard');
const { AdminAuthService } = require('../src/admin-auth/admin-auth.service');
const {
  InterestCategory,
} = require('../src/entity/interest-category.entity');
const { Interest } = require('../src/entity/interest.entity');
const { Activity } = require('../src/entity/activity.entity');
const dto = require('../src/interest-categories/interest-categories.dto');
let rows = [],
  audits = [],
  activeInterestCount = 0;
const calls = [];
const builder = {};
for (const method of ['andWhere', 'orderBy', 'addOrderBy', 'skip', 'take']) {
  builder[method] = (...args) => {
    calls.push([method, ...args]);
    return builder;
  };
}
builder.getManyAndCount = async () => [rows, rows.length];
const db = {
  entityMetadatas: [],
  options: { type: 'mysql' },
  getRepository: () => ({
    find: async (options) => {
      calls.push(['find', options]);
      return rows;
    },
    findOneBy: async ({ id }) => rows.find((row) => row.id === id),
    createQueryBuilder: () => builder,
  }),
  async transaction(callback) {
    const snapshot = structuredClone(rows);
    try {
      return await callback({
        create: (_entity, values) => ({ ...values }),
        findOne: async (entity, options) => {
          assert.equal(entity, InterestCategory);
          assert.equal(options.lock.mode, 'pessimistic_write');
          return rows.find((row) => row.id === options.where.id);
        },
        count: async (entity, options) => {
          assert.equal(entity, Interest);
          assert.equal(options.where.categoryId, 1);
          return activeInterestCount;
        },
        save: async (entity, row) => {
          if (entity === Activity) {
            audits.push(row);
            return row;
          }
          assert.equal(entity, InterestCategory);
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
    name: '  Social   Life  ',
    description: ' People and community ',
    sortOrder: 1,
    isActive: true,
  };
  const clean = await validate(dto.InterestCategoryInputDto, input);
  assert.equal(clean.name, 'Social Life');
  for (const override of [
    { name: ' ' },
    { name: null },
    { description: null },
    { isActive: 'true' },
    { sortOrder: -1 },
    { sortOrder: '1' },
    { extra: true },
  ]) {
    await assert.rejects(
      validate(dto.InterestCategoryInputDto, { ...input, ...override }),
      (error) => error.getStatus() === 400,
    );
  }
  await assert.rejects(validate(dto.UpdateInterestCategoryDto, clean));

  const module = await Test.createTestingModule({
    imports: [InterestCategoriesModule],
  })
    .overrideProvider(AdminAuthService)
    .useValue({ currentAdmin: async () => undefined })
    .useMocker((token) => (token === getDataSourceToken('mimate') ? db : {}))
    .compile();
  try {
    const service = module.get(InterestCategoriesService),
      controller = module.get(InterestCategoriesController),
      guard = module.get(CmsMembersGuard);
    assert(
      Reflect.getMetadata('__guards__', InterestCategoriesController).includes(
        CmsMembersGuard,
      ),
    );
    assert.equal(
      Reflect.getMetadata('path', InterestCategoriesController),
      'cms-interest-categories',
    );
    await assert.rejects(
      guard.canActivate({
        switchToHttp: () => ({ getRequest: () => ({ userData: undefined }) }),
      }),
      (error) => error.getStatus() === 401,
    );
    const created = (
      await controller.create(clean, { userData: { id: 7 } })
    ).data;
    assert.equal(created.name, 'Social Life');
    assert.equal(created.revision, 1);
    assert.equal(audits[0].source, 'cms-interest-categories');
    await assert.rejects(
      service.save({ ...clean, name: 'social life' }, 7),
      (error) => error.getStatus() === 409,
    );
    activeInterestCount = 2;
    await assert.rejects(
      service.deactivate(created.id, 1, 7),
      (error) => error.getStatus() === 400,
    );
    activeInterestCount = 0;
    const inactive = await service.deactivate(created.id, 1, 7);
    assert.equal(inactive.isActive, false);
    assert.equal(inactive.revision, 2);
    const reactivated = await service.save(
      { ...clean, revision: 2 },
      7,
      created.id,
    );
    assert.equal(reactivated.isActive, true);
    const detail = await service.detail(created.id);
    assert.equal(detail.name, 'Social Life');
    const options = await service.listActive();
    assert.deepEqual(calls.at(-1), [
      'find',
      { where: { isActive: true }, order: { sortOrder: 'ASC', id: 'ASC' } },
    ]);
    assert.equal(options.length, rows.length);
    assert.equal(options[0].revision, undefined);
  } finally {
    await module.close();
  }
  console.log(
    'PASS: interest category validation, guard wiring, duplicate conflicts, active-interest deactivation guard, reactivation, options.',
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
