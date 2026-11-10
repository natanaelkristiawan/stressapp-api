require('reflect-metadata');
const assert = require('node:assert/strict');
const { NotFoundException, BadRequestException, ConflictException } = require('@nestjs/common');
const { AdminGameService } = require('../dist/admin-game/admin-game.service');
const { AdminGameController } = require('../dist/admin-game/admin-game.controller');

async function runTests() {
  console.log('--- Starting AdminGameService & Controller Unit Tests ---');

  // In-memory data store for mock testing
  let mockLevels = [
    {
      id: 1,
      levelNumber: 1,
      title: 'Level 1 - Eksplorasi Diri',
      targetDescription: '<p>Tujuan Level 1</p>',
      isActive: true,
      games: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      levelNumber: 2,
      title: 'Level 2 - Interaksi',
      targetDescription: '<p>Tujuan Level 2</p>',
      isActive: true,
      games: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  let mockGames = [
    {
      id: 10,
      levelId: 1,
      key: 'eksplorasi-diri',
      name: 'Eksplorasi Diri',
      orderIndex: 0,
      successMessage: 'Selamat!',
      haveNextLevel: true,
      pointsReward: 50,
      isPublished: true,
      level: mockLevels[0],
      steps: [
        {
          id: 101,
          gameId: 10,
          stepOrder: 1,
          layout: 'detail',
          title: 'Misi 1',
          description: 'Deskripsi',
          descriptionExtra: null,
          instruction: 'Instruksi',
          videoUrl: null,
          reflectiveTitle: null,
          reflectiveQuestion: null,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
  ];

  mockLevels[0].games = [mockGames[0]];

  let mockSteps = [...mockGames[0].steps];
  let mockSubmissions = [
    {
      id: 1,
      memberId: 5,
      gameId: 10,
      note: 'Catatan pengujian',
      attachments: [{ type: 'image', url: 'https://example.com/photo.jpg' }],
      confidenceScore: 85,
      listAnswers: null,
      reflectiveAnswer: 'Jawaban refleksi',
      createdAt: new Date(),
      member: {
        id: 5,
        name: 'John Doe',
        email: 'john@example.com',
        profilePictureUrl: null,
      },
      game: mockGames[0],
    },
  ];

  // Mock repositories
  const mockLevelRepo = {
    find: async (opts) => [...mockLevels],
    findOne: async ({ where }) => mockLevels.find((l) => l.id === where.id) || null,
    save: async (lvl) => {
      const idx = mockLevels.findIndex((l) => l.id === lvl.id);
      if (idx >= 0) mockLevels[idx] = { ...mockLevels[idx], ...lvl };
      return mockLevels[idx];
    },
  };

  const mockGameRepo = {
    findOne: async ({ where, withDeleted }) => {
      if (where.id) return mockGames.find((g) => g.id === where.id && (!g.deletedAt || withDeleted)) || null;
      if (where.key) return mockGames.find((g) => g.key === where.key && (!g.deletedAt || withDeleted)) || null;
      return null;
    },
    createQueryBuilder: () => {
      let filtered = [...mockGames];
      const qb = {
        innerJoinAndSelect: () => qb,
        leftJoinAndSelect: () => qb,
        andWhere: (clause, params) => {
          if (params?.levelNumber) filtered = filtered.filter((g) => g.level?.levelNumber === params.levelNumber);
          if (params?.isPublished !== undefined) filtered = filtered.filter((g) => g.isPublished === params.isPublished);
          if (params?.search) {
            const raw = params.search.replace(/%/g, '').toLowerCase();
            filtered = filtered.filter((g) => g.name.toLowerCase().includes(raw) || g.key.toLowerCase().includes(raw));
          }
          return qb;
        },
        orderBy: () => qb,
        addOrderBy: () => qb,
        skip: () => qb,
        take: () => qb,
        getManyAndCount: async () => [filtered, filtered.length],
      };
      return qb;
    },
    softDelete: async (id) => {
      const game = mockGames.find((g) => g.id === id);
      if (game) game.deletedAt = new Date();
      return { affected: 1 };
    },
  };

  const mockStepRepo = {};

  const mockSubmissionRepo = {
    createQueryBuilder: () => {
      let filtered = [...mockSubmissions];
      const qb = {
        leftJoinAndSelect: () => qb,
        andWhere: (clause, params) => {
          if (params?.gameId) filtered = filtered.filter((s) => s.gameId === params.gameId);
          if (params?.memberId) filtered = filtered.filter((s) => s.memberId === params.memberId);
          return qb;
        },
        orderBy: () => qb,
        skip: () => qb,
        take: () => qb,
        getManyAndCount: async () => [filtered, filtered.length],
      };
      return qb;
    },
  };

  const mockDataSource = {
    transaction: async (cb) => {
      const manager = {
        create: (EntityClass, values) => ({ ...values, id: Math.floor(Math.random() * 1000) + 20 }),
        save: async (EntityClass, itemOrItems) => {
          if (Array.isArray(itemOrItems)) {
            mockSteps.push(...itemOrItems);
            return itemOrItems;
          }
          mockGames.push(itemOrItems);
          return itemOrItems;
        },
        delete: async (EntityClass, condition) => {
          if (condition.gameId) {
            mockSteps = mockSteps.filter((s) => s.gameId !== condition.gameId);
          }
        },
      };
      return await cb(manager);
    },
  };

  const service = new AdminGameService(
    mockLevelRepo,
    mockGameRepo,
    mockStepRepo,
    mockSubmissionRepo,
    mockDataSource,
  );

  const controller = new AdminGameController(service);

  // Test 1: getLevels
  console.log('Test 1: getLevels');
  const levelsRes = await controller.getLevels();
  assert.equal(levelsRes.message, 'Berhasil memuat daftar level game');
  assert.equal(levelsRes.data.length, 2);
  assert.equal(levelsRes.data[0].levelNumber, 1);
  assert.equal(levelsRes.data[0].totalGames, 1);
  assert.equal(levelsRes.data[0].publishedGames, 1);

  // Test 2: updateLevel
  console.log('Test 2: updateLevel');
  const updateLevelRes = await controller.updateLevel({ id: 1 }, { title: 'Level 1 Baru' });
  assert.equal(updateLevelRes.data.title, 'Level 1 Baru');
  assert.equal(updateLevelRes.message, 'Level berhasil diperbarui');

  // Test 3: updateLevel not found
  console.log('Test 3: updateLevel throws 404 for unknown level');
  await assert.rejects(
    async () => await service.updateLevel(999, { title: 'X' }),
    (err) => err instanceof NotFoundException,
  );

  // Test 4: getGames
  console.log('Test 4: getGames');
  const gamesRes = await controller.getGames({ status: 'all', page: 1, pageSize: 20 });
  assert.equal(gamesRes.data.items.length, 1);
  assert.equal(gamesRes.data.items[0].key, 'eksplorasi-diri');
  assert.equal(gamesRes.data.items[0].totalSteps, 1);

  // Test 5: getGameDetail
  console.log('Test 5: getGameDetail');
  const detailRes = await controller.getGameDetail({ id: 10 });
  assert.equal(detailRes.data.key, 'eksplorasi-diri');
  assert.equal(detailRes.data.steps.length, 1);
  assert.equal(detailRes.data.steps[0].layout, 'detail');

  // Test 6: getGameDetail not found
  console.log('Test 6: getGameDetail throws 404');
  await assert.rejects(
    async () => await service.getGameDetail(999),
    (err) => err instanceof NotFoundException,
  );

  // Test 7: createGame
  console.log('Test 7: createGame');
  const newGameRes = await controller.createGame({
    levelId: 1,
    key: 'misi-baru',
    name: 'Misi Baru',
    orderIndex: 1,
    pointsReward: 75,
    haveNextLevel: true,
    isPublished: true,
    steps: [
      {
        stepOrder: 1,
        layout: 'detail',
        title: 'Step 1 Baru',
        description: 'Deskripsi langkah baru',
      },
    ],
  });
  assert.equal(newGameRes.message, 'Game berhasil dibuat');
  assert.equal(newGameRes.data.key, 'misi-baru');

  // Test 8: createGame duplicate key throws ConflictException
  console.log('Test 8: createGame throws conflict on duplicate key');
  await assert.rejects(
    async () =>
      await service.createGame({
        levelId: 1,
        key: 'eksplorasi-diri',
        name: 'Duplicate',
        steps: [{ stepOrder: 1, layout: 'detail', title: 'T', description: 'D' }],
      }),
    (err) => err instanceof ConflictException,
  );

  // Test 9: deleteGame
  console.log('Test 9: deleteGame');
  const deleteRes = await controller.deleteGame({ id: 10 });
  assert.equal(deleteRes.message, 'Game berhasil dihapus');
  assert.equal(deleteRes.data.deleted, true);

  // Test 10: getSubmissions
  console.log('Test 10: getSubmissions');
  const subsRes = await controller.getSubmissions({ page: 1, pageSize: 20 });
  assert.equal(subsRes.message, 'Berhasil memuat riwayat pengiriman game');
  assert.equal(subsRes.data.items.length, 1);
  assert.equal(subsRes.data.items[0].memberName, 'John Doe');
  assert.equal(subsRes.data.items[0].confidenceScore, 85);

  console.log('--- ALL 10 TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
