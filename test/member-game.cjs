const assert = require('assert');

// Test suite for MemberGameService & MemberGameController
const { MemberGameService } = require('../dist/member-game/member-game.service');
const { MemberGameController } = require('../dist/member-game/member-game.controller');

console.log('--- Starting MemberGameService & Controller Unit Tests ---');

// Mock data
const mockLevels = [
  {
    id: 1,
    levelNumber: 1,
    title: 'Misi Level 1',
    targetDescription: '<p>Tujuan Level 1</p>',
    isActive: true,
    games: [
      { id: 101, isPublished: true, orderIndex: 1 },
      { id: 102, isPublished: true, orderIndex: 2 },
    ],
  },
  {
    id: 2,
    levelNumber: 2,
    title: 'Misi Level 2',
    targetDescription: '<p>Tujuan Level 2</p>',
    isActive: true,
    games: [
      { id: 201, isPublished: true, orderIndex: 1 },
      { id: 202, isPublished: true, orderIndex: 2 },
    ],
  },
];

const mockGames = [
  {
    id: 101,
    levelId: 1,
    key: 'aktivitas-harian',
    name: 'Aktivitas Harian',
    orderIndex: 1,
    pointsReward: 50,
    haveNextLevel: true,
    isPublished: true,
    successMessage: 'Selamat Anda menyelesaikan tantangan 1!',
    level: { id: 1, levelNumber: 1 },
    steps: [
      {
        id: 1,
        stepOrder: 1,
        layout: 'detail',
        title: 'Aktivitas Harian',
        description: 'Lakukan aktivitas sehari-hari',
        descriptionExtra: 'Paragraf ekstra',
        instruction: 'Instruksi detail',
        videoUrl: null,
        reflectiveTitle: null,
        reflectiveQuestion: null,
      },
      {
        id: 2,
        stepOrder: 2,
        layout: 'convident',
        title: 'Aktivitas Harian',
        description: 'Seberapa yakin Anda?',
        descriptionExtra: null,
        instruction: '*drag icon',
        videoUrl: null,
        reflectiveTitle: null,
        reflectiveQuestion: null,
      },
    ],
  },
  {
    id: 102,
    levelId: 1,
    key: 'apresiasi-diri',
    name: 'Apresiasi Diri',
    orderIndex: 2,
    pointsReward: 50,
    haveNextLevel: true,
    isPublished: true,
    successMessage: 'Selamat seluruh misi level 1 selesai!',
    level: { id: 1, levelNumber: 1 },
    steps: [
      {
        id: 3,
        stepOrder: 1,
        layout: 'list-input',
        title: 'Apresiasi Diri',
        description: 'Tulis rasa syukur',
        descriptionExtra: null,
        instruction: null,
        videoUrl: null,
        reflectiveTitle: null,
        reflectiveQuestion: null,
      },
    ],
  },
  {
    id: 201,
    levelId: 2,
    key: 'psikoedukasi-kesepian',
    name: 'Psikoedukasi Kesepian',
    orderIndex: 1,
    pointsReward: 100,
    haveNextLevel: true,
    isPublished: true,
    successMessage: 'Selamat!',
    level: { id: 2, levelNumber: 2 },
    steps: [],
  },
];

let progressStore = [];
let submissionStore = [];
let pointsStore = [];
let leaderboardCalls = [];

const mockDataSource = {
  transaction: async (cb) => {
    const manager = {
      create: (EntityClass, data) => ({ ...data, id: Math.floor(Math.random() * 10000) }),
      save: async (EntityClassOrData, maybeData) => {
        const data = maybeData || EntityClassOrData;
        if (data.status) {
          // progress
          const idx = progressStore.findIndex(
            (p) => p.memberId === data.memberId && p.gameId === data.gameId,
          );
          if (idx >= 0) progressStore[idx] = { ...progressStore[idx], ...data };
          else progressStore.push({ ...data, id: data.id || progressStore.length + 1 });
        } else if (data.points) {
          // quest point detail
          pointsStore.push(data);
        } else if (data.confidenceScore !== undefined || data.note !== undefined) {
          // submission
          submissionStore.push(data);
        }
        return data;
      },
      findOne: async (EntityClass, options) => {
        if (options?.where?.memberId && options?.where?.gameId) {
          return progressStore.find(
            (p) => p.memberId === options.where.memberId && p.gameId === options.where.gameId,
          ) || null;
        }
        if (options?.where?.levelNumber) {
          return mockLevels.find((l) => l.levelNumber === options.where.levelNumber) || null;
        }
        if (options?.where?.levelId) {
          const games = mockGames.filter((g) => g.levelId === options.where.levelId);
          return games[0] || null;
        }
        return null;
      },
      find: async (EntityClass, options) => {
        if (options?.where?.levelId) {
          return mockGames.filter((g) => g.levelId === options.where.levelId);
        }
        return [];
      },
      getRepository: (EntityClass) => ({
        findOne: async ({ where }) => {
          return pointsStore.find((p) => p.memberId === where.memberId) || null;
        },
        increment: async ({ id }, field, amount) => {
          const item = pointsStore.find((p) => p.id === id);
          if (item) item.totalPoints = (item.totalPoints || 0) + amount;
        },
        save: async (data) => {
          pointsStore.push({ id: pointsStore.length + 1, ...data });
          return data;
        },
      }),
    };
    return cb(manager);
  },
};

const mockLevelRepo = {
  find: async () => mockLevels,
  findOne: async ({ where }) => {
    return mockLevels.find((l) => l.levelNumber === where.levelNumber) || null;
  },
};

const mockGameRepo = {
  find: async ({ where }) => {
    return mockGames.filter((g) => g.levelId === where.levelId && g.isPublished === true);
  },
  findOne: async ({ where }) => {
    return mockGames.find((g) => g.key === where.key && g.isPublished === true) || null;
  },
};

const mockStepRepo = {
  find: async () => [],
};

const mockProgressRepo = {
  find: async ({ where }) => {
    return progressStore.filter((p) => p.memberId === where.memberId);
  },
  findOne: async ({ where }) => {
    return progressStore.find((p) => p.memberId === where.memberId && p.gameId === where.gameId) || null;
  },
  count: async ({ where }) => {
    return progressStore.filter(
      (p) => p.memberId === where.memberId && p.status === where.status,
    ).length;
  },
};

const mockSubmissionRepo = {
  find: async () => submissionStore,
};

const mockQuestPointRepo = {};
const mockQuestPointDetailRepo = {};

const mockLeaderboardService = {
  record: async (manager, detail) => {
    leaderboardCalls.push(detail);
  },
};

const service = new MemberGameService(
  mockDataSource,
  mockLevelRepo,
  mockGameRepo,
  mockStepRepo,
  mockProgressRepo,
  mockSubmissionRepo,
  mockQuestPointRepo,
  mockQuestPointDetailRepo,
  mockLeaderboardService,
);

const controller = new MemberGameController(service);

(async () => {
  // Test 1: getLevels for a new member
  console.log('Test 1: getLevels returns active levels with unlock progression');
  progressStore = [];
  const levels = await service.getLevels(1);
  assert.strictEqual(levels.length, 2);
  assert.strictEqual(levels[0].levelNumber, 1);
  assert.strictEqual(levels[0].isUnlocked, true);
  assert.strictEqual(levels[0].totalMissions, 2);
  assert.strictEqual(levels[0].completedMissions, 0);
  assert.strictEqual(levels[1].levelNumber, 2);
  assert.strictEqual(levels[1].isUnlocked, false, 'Level 2 should be locked for new member');

  // Test 2: getLevelMissions for Level 1
  console.log('Test 2: getLevelMissions returns missions with available / locked status');
  const missions = await service.getLevelMissions(1, 1);
  assert.strictEqual(missions.length, 2);
  assert.strictEqual(missions[0].key, 'aktivitas-harian');
  assert.strictEqual(missions[0].status, 'available', 'First mission should be available');
  assert.strictEqual(missions[1].key, 'apresiasi-diri');
  assert.strictEqual(missions[1].status, 'locked', 'Second mission should be locked');

  // Test 3: getLevelMissions throws 404 for invalid level
  console.log('Test 3: getLevelMissions throws 404 for invalid level');
  await assert.rejects(
    async () => await service.getLevelMissions(1, 99),
    /Level 99 tidak ditemukan/,
  );

  // Test 4: getGameDetail returns full steps and layouts
  console.log('Test 4: getGameDetail returns steps metadata');
  const detail = await service.getGameDetail(1, 'aktivitas-harian');
  assert.strictEqual(detail.key, 'aktivitas-harian');
  assert.strictEqual(detail.pointsReward, 50);
  assert.strictEqual(detail.steps.length, 2);
  assert.strictEqual(detail.steps[0].layout, 'detail');
  assert.strictEqual(detail.steps[0].descriptionExtra, 'Paragraf ekstra');
  assert.strictEqual(detail.steps[1].layout, 'convident');

  // Test 5: getGameDetail throws 404 for unknown game
  console.log('Test 5: getGameDetail throws 404 for unknown game key');
  await assert.rejects(
    async () => await service.getGameDetail(1, 'non-existent-game'),
    /Game 'non-existent-game' tidak ditemukan/,
  );

  // Test 6: submitMission awards points and unlocks next mission
  console.log('Test 6: submitMission awards points and unlocks next mission');
  pointsStore = [];
  leaderboardCalls = [];
  const submitRes = await service.submitMission(1, 'aktivitas-harian', {
    confidenceScore: 90,
    note: 'Refleksi berjalan santai',
    attachments: [{ type: 'image', url: 'https://example.com/pic.jpg' }],
  });

  assert.strictEqual(submitRes.success, true);
  assert.strictEqual(submitRes.earnedPoints, 50);
  assert.strictEqual(submitRes.nextMissionKey, 'apresiasi-diri');
  assert.strictEqual(leaderboardCalls.length, 1, 'LeaderboardService.record must be invoked');
  assert.strictEqual(submissionStore.length, 1);
  assert.strictEqual(submissionStore[0].confidenceScore, 90);

  // Check that second mission is now available
  const missionsAfterSubmit = await service.getLevelMissions(1, 1);
  assert.strictEqual(missionsAfterSubmit[0].status, 'finish');
  assert.strictEqual(missionsAfterSubmit[1].status, 'available');

  // Test 7: Repeat submission does not award duplicate points
  console.log('Test 7: Repeat submission of finished mission gives 0 earned points');
  const repeatSubmitRes = await service.submitMission(1, 'aktivitas-harian', {
    note: 'Second try',
  });
  assert.strictEqual(repeatSubmitRes.success, true);
  assert.strictEqual(repeatSubmitRes.earnedPoints, 0, 'No points awarded on repeat completion');

  // Test 8: Completing final mission in Level 1 unlocks Level 2
  console.log('Test 8: Completing final mission in Level 1 unlocks Level 2');
  const submitFinalRes = await service.submitMission(1, 'apresiasi-diri', {
    listAnswers: ['item 1', 'item 2'],
  });
  assert.strictEqual(submitFinalRes.success, true);
  assert.strictEqual(submitFinalRes.earnedPoints, 50);
  assert.strictEqual(submitFinalRes.nextMissionKey, 'psikoedukasi-kesepian', 'Next level first game unlocked');

  const levelsAfterAllFinish = await service.getLevels(1);
  assert.strictEqual(levelsAfterAllFinish[1].isUnlocked, true, 'Level 2 is now unlocked');

  // Test 9: Controller endpoints return GlobalResponse<T> format
  console.log('Test 9: Controller endpoints follow GlobalResponse<T> contract');
  const mockReq = { member: { id: 1 } };
  const controllerLevelsRes = await controller.getLevels(mockReq);
  assert.strictEqual(typeof controllerLevelsRes.message, 'string');
  assert(Array.isArray(controllerLevelsRes.data));

  const controllerDetailRes = await controller.getGameDetail(mockReq, { gameKey: 'aktivitas-harian' });
  assert.strictEqual(typeof controllerDetailRes.message, 'string');
  assert.strictEqual(controllerDetailRes.data.key, 'aktivitas-harian');

  console.log('--- ALL 9 MEMBER GAME UNIT TESTS PASSED! ---');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

