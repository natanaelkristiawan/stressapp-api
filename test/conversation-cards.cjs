require('ts-node/register');
require('tsconfig-paths/register');
const assert = require('node:assert/strict');
const { ValidationPipe } = require('@nestjs/common');
const { Test } = require('@nestjs/testing');
const { getDataSourceToken } = require('@nestjs/typeorm');
const {
  ConversationCardsModule,
} = require('../src/conversation-cards/conversation-cards.module');
const {
  ConversationCardsService,
} = require('../src/conversation-cards/conversation-cards.service');
const {
  ConversationCardsController,
} = require('../src/conversation-cards/conversation-cards.controller');
const { CmsMembersGuard } = require('../src/cms-members/cms-members.guard');
const { AdminAuthService } = require('../src/admin-auth/admin-auth.service');
const { ConversationCard } = require('../src/entity/conversation-card.entity');
const { InterestCategory } = require('../src/entity/interest-category.entity');
const { Activity } = require('../src/entity/activity.entity');
const dto = require('../src/conversation-cards/conversation-cards.dto');

let rows = [];
let audits = [];
const calls = [];
const builder = {};
for (const method of [
  'leftJoinAndSelect',
  'andWhere',
  'where',
  'orderBy',
  'addOrderBy',
  'skip',
  'take',
]) {
  builder[method] = (...args) => {
    calls.push([method, ...args]);
    return builder;
  };
}
builder.getManyAndCount = async () => [rows, rows.length];
builder.getMany = async () => rows;

const db = {
  entityMetadatas: [],
  options: { type: 'mysql' },
  getRepository: () => ({
    createQueryBuilder: () => builder,
    findOne: async (options) => rows.find((row) => row.id === options.where.id),
  }),
  async transaction(callback) {
    const snapshot = structuredClone(rows);
    try {
      return await callback({
        create: (_entity, values) => ({ ...values }),
        findOne: async (entity, options) => {
          if (entity === InterestCategory) {
            return options.where.id === 1 ? { id: 1, name: 'Kuliner' } : null;
          }
          assert.equal(entity, ConversationCard);
          assert.equal(options.lock.mode, 'pessimistic_write');
          return rows.find((row) => row.id === options.where.id);
        },
        save: async (entity, row) => {
          if (entity === Activity) {
            audits.push(row);
            return row;
          }
          assert.equal(entity, ConversationCard);
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
    title: '  Kuliner   Enak  ',
    prompt: ' Bahas makanan favorit ',
    subPrompt: ' Ada rekomendasi? ',
    color: '#5B7C28',
    textColor: '#E6F34C',
    visual: 'kuliner',
    categoryId: null,
    sortOrder: 1,
    isActive: true,
  };
  const clean = await validate(dto.ConversationCardInputDto, input);
  assert.equal(clean.title, 'Kuliner Enak');
  assert.equal(clean.prompt, 'Bahas makanan favorit');
  assert.equal(clean.subPrompt, 'Ada rekomendasi?');
  for (const override of [
    { title: ' ' },
    { title: null },
    { prompt: ' ' },
    { prompt: null },
    { color: '' },
    { textColor: '' },
    { visual: 'random' },
    { categoryId: 0 },
    { isActive: 'true' },
    { sortOrder: -1 },
    { extra: true },
  ]) {
    await assert.rejects(
      validate(dto.ConversationCardInputDto, { ...input, ...override }),
      (error) => error.getStatus() === 400,
    );
  }
  await assert.rejects(validate(dto.UpdateConversationCardDto, clean));

  const module = await Test.createTestingModule({
    imports: [ConversationCardsModule],
  })
    .overrideProvider(AdminAuthService)
    .useValue({ currentAdmin: async () => undefined })
    .useMocker((token) => (token === getDataSourceToken('mimate') ? db : {}))
    .compile();
  try {
    const service = module.get(ConversationCardsService);
    const controller = module.get(ConversationCardsController);
    const guard = module.get(CmsMembersGuard);
    assert(
      Reflect.getMetadata('__guards__', ConversationCardsController).includes(
        CmsMembersGuard,
      ),
    );
    assert.equal(
      Reflect.getMetadata('path', ConversationCardsController),
      'cms-chat-cards',
    );
    await assert.rejects(
      guard.canActivate({
        switchToHttp: () => ({ getRequest: () => ({ userData: undefined }) }),
      }),
      (error) => error.getStatus() === 401,
    );

    const created = (await controller.create(clean, { userData: { id: 7 } }))
      .data;
    assert.equal(created.title, 'Kuliner Enak');
    assert.equal(created.revision, 1);
    assert.equal(created.categoryId, null);
    assert.equal(audits[0].source, 'cms-chat-cards');

    // Stale revision is rejected.
    await assert.rejects(
      service.save({ ...clean, revision: 2 }, 7, created.id),
      (error) => error.getStatus() === 409,
    );

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
    assert.equal(detail.title, 'Kuliner Enak');

    const options = await service.listActive();
    assert.equal(options.length, rows.length);
    assert.equal(options[0].revision, undefined);

    // A card bound to a missing category is refused.
    await assert.rejects(
      service.save({ ...clean, categoryId: 999 }, 7),
      (error) => error.getStatus() === 400,
    );
  } finally {
    await module.close();
  }
  console.log(
    'PASS: conversation-card validation, guard wiring, stale-revision conflicts, deactivation, reactivation, options, missing-category rejection.',
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
