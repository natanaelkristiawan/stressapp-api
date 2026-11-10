require('reflect-metadata');
const assert = require('node:assert/strict');
const { seedGames } = require('../dist/database/seeds/game.seed');

async function testGameSeed() {
  console.log('--- Running Game Seed Unit Test ---');

  // In-memory repositories
  const storedLevels = [];
  const storedGames = [];
  const storedSteps = [];

  const mockDataSource = {
    getRepository: (entity) => {
      const entityName = entity.name || entity;
      if (entityName === 'GameLevel') {
        return {
          findOne: async ({ where }) =>
            storedLevels.find((l) => l.levelNumber === where.levelNumber) || null,
          create: (data) => ({ id: storedLevels.length + 1, ...data }),
          save: async (lvl) => {
            const idx = storedLevels.findIndex((l) => l.levelNumber === lvl.levelNumber);
            if (idx >= 0) {
              storedLevels[idx] = { ...storedLevels[idx], ...lvl };
              return storedLevels[idx];
            }
            storedLevels.push(lvl);
            return lvl;
          },
        };
      }
      if (entityName === 'Game') {
        return {
          findOne: async ({ where }) =>
            storedGames.find((g) => g.key === where.key) || null,
          create: (data) => ({ id: storedGames.length + 1, ...data }),
          save: async (g) => {
            const idx = storedGames.findIndex((item) => item.key === g.key);
            if (idx >= 0) {
              storedGames[idx] = { ...storedGames[idx], ...g };
              return storedGames[idx];
            }
            storedGames.push(g);
            return g;
          },
        };
      }
      if (entityName === 'GameStep') {
        return {
          findOne: async ({ where }) =>
            storedSteps.find(
              (s) => s.gameId === where.gameId && s.stepOrder === where.stepOrder
            ) || null,
          create: (data) => ({ id: storedSteps.length + 1, ...data }),
          save: async (s) => {
            const idx = storedSteps.findIndex(
              (item) => item.gameId === s.gameId && item.stepOrder === s.stepOrder
            );
            if (idx >= 0) {
              storedSteps[idx] = { ...storedSteps[idx], ...s };
              return storedSteps[idx];
            }
            storedSteps.push(s);
            return s;
          },
        };
      }
      throw new Error(`Unknown entity in test: ${entityName}`);
    },
  };

  // Run 1: Initial seed
  console.log('Testing Initial Seeding...');
  await seedGames(mockDataSource);

  assert.equal(storedLevels.length, 4, 'Should seed 4 levels');
  assert.equal(storedGames.length, 9, 'Should seed 9 games across 4 levels');
  assert.equal(storedSteps.length, 27, 'Should seed 27 steps total (3 per game)');

  // Verify Level 1
  const level1 = storedLevels.find((l) => l.levelNumber === 1);
  assert.ok(level1);
  assert.equal(level1.title, 'Misi Level 1');
  assert.ok(level1.targetDescription.includes('Tantangan pada Level 1 ini merupakan tantangan misi'));

  // Verify Level 2 video mission
  const lonelinessGame = storedGames.find((g) => g.key === 'psikoedukasi-kesepian-and-stigma');
  assert.ok(lonelinessGame);
  assert.equal(lonelinessGame.pointsReward, 100);
  const lonelinessSteps = storedSteps.filter((s) => s.gameId === lonelinessGame.id);
  assert.equal(lonelinessSteps.length, 3);
  assert.equal(lonelinessSteps[0].layout, 'detail');
  assert.ok(lonelinessSteps[0].descriptionExtra);
  assert.equal(lonelinessSteps[1].layout, 'convident');
  assert.equal(lonelinessSteps[2].layout, 'post-with-video');
  assert.ok(lonelinessSteps[2].videoUrl.includes('youtube.com'));

  // Verify Level 4 reflective popup mission
  const kindnessGame = storedGames.find((g) => g.key === 'tindakan-kebaikan-spontan');
  assert.ok(kindnessGame);
  assert.equal(kindnessGame.pointsReward, 200);
  const kindnessSteps = storedSteps.filter((s) => s.gameId === kindnessGame.id);
  assert.equal(kindnessSteps[2].layout, 'post-with-popup');
  assert.equal(kindnessSteps[2].reflectiveTitle, 'Pertanyaan Reflektif');
  assert.ok(kindnessSteps[2].reflectiveQuestion.includes('Bagaimana perasaan Anda setelah melakukan kebaikan spontan?'));

  console.log('Initial Seeding verified successfully.');

  // Run 2: Idempotent re-run
  console.log('\nTesting Idempotency (re-running seed)...');
  await seedGames(mockDataSource);

  assert.equal(storedLevels.length, 4, 'Level count must not duplicate on re-run');
  assert.equal(storedGames.length, 9, 'Game count must not duplicate on re-run');
  assert.equal(storedSteps.length, 27, 'Step count must not duplicate on re-run');
  console.log('Idempotent re-run verified successfully.');

  console.log('\n--- ALL GAME SEED TESTS PASSED (100%) ---');
}

testGameSeed().catch((err) => {
  console.error('Game Seed Test Failed:', err);
  process.exit(1);
});

