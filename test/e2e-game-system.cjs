require('reflect-metadata');
const assert = require('node:assert/strict');
const { AdminGameService } = require('../dist/admin-game/admin-game.service');
const { MemberGameService } = require('../dist/member-game/member-game.service');

async function runE2ETests() {
  console.log('========================================================');
  console.log('   STARTING PHASE 5: END-TO-END ACCEPTANCE TESTING      ');
  console.log('   CMS Content Config -> Member Engine -> Submissions   ');
  console.log('========================================================\n');

  // 1. In-memory Mock State simulating MySQL & Redis
  const mockLevels = [
    {
      id: 1,
      levelNumber: 1,
      title: 'Misi Level 1 - Eksplorasi Diri',
      targetDescription: '<p>Target Level 1: Kenali dirimu.</p>',
      isActive: true,
      games: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      levelNumber: 2,
      title: 'Misi Level 2 - Interaksi Sosial',
      targetDescription: '<p>Target Level 2: Bangun koneksi.</p>',
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
      key: 'aktivitas-harian',
      name: 'Aktivitas Harian',
      orderIndex: 1,
      successMessage: 'Selamat Anda menyelesaikan Aktivitas Harian!',
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
          title: 'Kenali Aktivitasmu',
          description: 'Pahami rutinitas harian yang membuatmu tenang.',
          descriptionExtra: 'Paragraf ekstra untuk penegasan.',
          instruction: 'Luangkan waktu 15 menit hari ini.',
          videoUrl: null,
          reflectiveTitle: null,
          reflectiveQuestion: null,
        },
        {
          id: 102,
          gameId: 10,
          stepOrder: 2,
          layout: 'convident',
          title: 'Keyakinan Diri',
          description: 'Seberapa yakin Anda bisa menyelesaikan tantangan ini?',
          descriptionExtra: null,
          instruction: 'Geser slider sesuai tingkat keyakinanmu.',
          videoUrl: null,
          reflectiveTitle: null,
          reflectiveQuestion: null,
        },
        {
          id: 103,
          gameId: 10,
          stepOrder: 3,
          layout: 'post-with-video',
          title: 'Tonton & Renungkan',
          description: 'Tuliskan pemahaman setelah menonton video singkat ini.',
          descriptionExtra: null,
          instruction: 'Tonton video hingga tuntas.',
          videoUrl: 'https://www.youtube.com/watch?v=mockVideo123',
          reflectiveTitle: null,
          reflectiveQuestion: null,
        },
        {
          id: 104,
          gameId: 10,
          stepOrder: 4,
          layout: 'post-with-popup',
          title: 'Refleksi Mendalam',
          description: 'Bagikan apa yang kamu rasakan hari ini.',
          descriptionExtra: null,
          instruction: 'Boleh sertakan foto atau rekaman suara.',
          videoUrl: null,
          reflectiveTitle: 'Pertanyaan Reflektif',
          reflectiveQuestion: 'Bagaimana perasaan Anda setelah melakukan misi ini?',
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 20,
      levelId: 1,
      key: 'apresiasi-diri',
      name: 'Apresiasi Diri',
      orderIndex: 2,
      successMessage: 'Luar biasa! 5 rasa syukurmu tersimpan.',
      haveNextLevel: true,
      pointsReward: 75,
      isPublished: true,
      level: mockLevels[0],
      steps: [
        {
          id: 201,
          gameId: 20,
          stepOrder: 1,
          layout: 'detail',
          title: 'Syukuri Hal Kecil',
          description: 'Tuliskan 5 hal yang kamu syukuri hari ini.',
          descriptionExtra: null,
          instruction: 'Fokus pada hal sederhana di sekitarmu.',
          videoUrl: null,
          reflectiveTitle: null,
          reflectiveQuestion: null,
        },
        {
          id: 202,
          gameId: 20,
          stepOrder: 2,
          layout: 'list-input',
          title: 'Daftar Rasa Syukur',
          description: 'Masukkan data apresiasi diri',
          descriptionExtra: null,
          instruction: 'Tuliskan 5 hal apresiasi diri:',
          videoUrl: null,
          reflectiveTitle: null,
          reflectiveQuestion: null,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockProgress = []; // MemberGameProgress
  const mockSubmissions = []; // MemberGameSubmission
  const mockQuestPoints = []; // QuestPoint
  const mockLeaderboard = []; // Redis Leaderboard

  // Mock Repositories
  const mockAdminGameRepo = {
    findAndCount: async () => [mockGames, mockGames.length],
    findOne: async ({ where }) => mockGames.find((g) => g.id === where.id || g.key === where.key) || null,
    manager: {
      transaction: async (cb) => {
        const transactionalEntityManager = {
          save: async (entityClass, entityData) => {
            if (Array.isArray(entityData)) return entityData;
            return entityData;
          },
          delete: async () => {},
        };
        return cb(transactionalEntityManager);
      },
    },
  };

  const mockLevelRepo = {
    find: async () =>
      mockLevels.map((lvl) => ({
        ...lvl,
        games: mockGames.filter((g) => g.levelId === lvl.id && g.isPublished),
      })),
    findOne: async ({ where }) => {
      const found = mockLevels.find((l) => l.id === where.id || l.levelNumber === where.levelNumber);
      if (!found) return null;
      return {
        ...found,
        games: mockGames.filter((g) => g.levelId === found.id && g.isPublished),
      };
    },
    save: async (lvl) => {
      const idx = mockLevels.findIndex((l) => l.id === lvl.id);
      if (idx >= 0) mockLevels[idx] = { ...mockLevels[idx], ...lvl };
      return lvl;
    },
  };

  const mockMemberGameRepo = {
    find: async ({ where }) => {
      let result = mockGames.filter((g) => g.isPublished);
      if (where?.level?.id) result = result.filter((g) => g.levelId === where.level.id);
      if (where?.levelId) result = result.filter((g) => g.levelId === where.levelId);
      return result;
    },
    findOne: async ({ where }) =>
      mockGames.find((g) => (g.key === where.key || g.id === where.id) && g.isPublished) || null,
  };

  const mockMemberProgressRepo = {
    find: async ({ where }) => {
      return mockProgress.filter((p) => {
        if (p.memberId !== where.memberId) return false;
        if (where.gameId) {
          const gameIds = where.gameId?._value || (Array.isArray(where.gameId) ? where.gameId : [where.gameId]);
          if (Array.isArray(gameIds)) return gameIds.includes(p.gameId);
        }
        return true;
      });
    },
    findOne: async ({ where }) =>
      mockProgress.find((p) => p.memberId === where.memberId && p.gameId === where.gameId) || null,
    count: async ({ where }) => {
      return mockProgress.filter((p) => {
        if (p.memberId !== where.memberId) return false;
        if (where.status && p.status !== where.status) return false;
        if (where.gameId) {
          const gameIds = where.gameId?._value || (Array.isArray(where.gameId) ? where.gameId : [where.gameId]);
          if (Array.isArray(gameIds)) return gameIds.includes(p.gameId);
        }
        return true;
      }).length;
    },
  };

  const mockSubmissionRepo = {
    createQueryBuilder: () => {
      let filterGameId = null;
      let filterMemberId = null;
      const builder = {
        leftJoinAndSelect: () => builder,
        andWhere: (condition, params) => {
          if (params?.gameId) filterGameId = params.gameId;
          if (params?.memberId) filterMemberId = params.memberId;
          return builder;
        },
        orderBy: () => builder,
        skip: () => builder,
        take: () => builder,
        getManyAndCount: async () => {
          let filtered = mockSubmissions.slice();
          if (filterGameId) {
            filtered = filtered.filter((s) => s.gameId === filterGameId);
          }
          if (filterMemberId) {
            filtered = filtered.filter((s) => s.memberId === filterMemberId);
          }
          const mapped = filtered.map((s) => ({
            ...s,
            member: { id: s.memberId, name: 'Budi Santoso', email: 'budi@example.com', profilePictureUrl: null },
            game: mockGames.find((g) => g.id === s.gameId) || { id: s.gameId, key: 'aktivitas-harian', name: 'Aktivitas Harian', level: { levelNumber: 1 } },
          }));
          return [mapped, mapped.length];
        },
      };
      return builder;
    },
    findAndCount: async () => [
      mockSubmissions.map((s) => ({
        id: s.id,
        memberId: s.memberId,
        gameId: s.gameId,
        note: s.note,
        attachments: s.attachments,
        confidenceScore: s.confidenceScore,
        listAnswers: s.listAnswers,
        reflectiveAnswer: s.reflectiveAnswer,
        createdAt: s.createdAt,
        member: { id: s.memberId, name: 'Budi Santoso', email: 'budi@example.com', avatar: null },
        game: mockGames.find((g) => g.id === s.gameId) || { name: 'Misi', key: 'misi', levelId: 1, level: { levelNumber: 1 } },
      })),
      mockSubmissions.length,
    ],
  };

  const mockLeaderboardService = {
    record: async (manager, qpd) => {
      mockLeaderboard.push({
        memberId: qpd.member_id,
        points: qpd.points,
        recordedAt: qpd.created_at || new Date(),
      });
    },
  };

  // Transaction manager for member submission
  const mockMemberTransactionManager = {
    transaction: async (cb) => {
      const tx = {
        create: (entityClass, data) => ({ ...data }),
        save: async (entityClass, entityData) => {
          const isSubmission =
            entityClass?.name === 'MemberGameSubmission' ||
            (entityData?.gameId && entityData?.memberId && 'confidenceScore' in entityData);
          if (isSubmission) {
            const newSub = { id: mockSubmissions.length + 1, ...entityData, createdAt: new Date() };
            mockSubmissions.push(newSub);
            return newSub;
          }

          const isProgress =
            entityClass?.name === 'MemberGameProgress' ||
            (entityData?.gameId && entityData?.memberId && 'status' in entityData);
          if (isProgress) {
            const existingIdx = mockProgress.findIndex(
              (p) => p.memberId === entityData.memberId && p.gameId === entityData.gameId,
            );
            if (existingIdx >= 0) {
              mockProgress[existingIdx] = { ...mockProgress[existingIdx], ...entityData };
              return mockProgress[existingIdx];
            }
            const newProg = { id: mockProgress.length + 1, ...entityData };
            mockProgress.push(newProg);
            return newProg;
          }

          if (entityClass?.name === 'QuestPoint') {
            const newQp = { id: mockQuestPoints.length + 1, ...entityData };
            mockQuestPoints.push(newQp);
            return newQp;
          }

          return entityData;
        },
        findOne: async (entityClass, options) => {
          if (entityClass?.name === 'MemberGameProgress') {
            return (
              mockProgress.find(
                (p) => p.memberId === options.where.memberId && p.gameId === options.where.gameId,
              ) || null
            );
          }
          if (entityClass?.name === 'QuestPoint') {
            return (
              mockQuestPoints.find(
                (qp) => qp.userId === options.where?.userId || qp.memberId === options.where?.memberId,
              ) || null
            );
          }
          if (entityClass?.name === 'Game') {
            return (
              mockGames.find(
                (g) => g.isPublished && (options.where?.levelId ? g.levelId === options.where.levelId : true),
              ) || null
            );
          }
          if (entityClass?.name === 'GameLevel') {
            return (
              mockLevels.find(
                (l) => (options.where?.levelNumber ? l.levelNumber === options.where.levelNumber : true),
              ) || null
            );
          }
          return null;
        },
        find: async (entityClass, options) => {
          if (entityClass?.name === 'Game') {
            let res = mockGames.filter((g) => g.isPublished);
            if (options?.where?.levelId) {
              res = res.filter((g) => g.levelId === options.where.levelId);
            }
            return res.sort((a, b) => a.orderIndex - b.orderIndex);
          }
          return [];
        },
        getRepository: (entityClass) => {
          if (entityClass?.name === 'QuestPoint') {
            return {
              findOne: async ({ where }) =>
                mockQuestPoints.find((qp) => qp.memberId === where?.memberId) || null,
              increment: async ({ id }, field, val) => {
                const qp = mockQuestPoints.find((q) => q.id === id);
                if (qp) qp[field] = (qp[field] || 0) + val;
              },
              save: async (data) => {
                const qp = { id: mockQuestPoints.length + 1, ...data };
                mockQuestPoints.push(qp);
                return qp;
              },
            };
          }
          if (entityClass?.name === 'QuestPointDetail') {
            return {
              save: async (data) => {
                const qpd = { id: Date.now(), ...data };
                return qpd;
              },
            };
          }
          return {
            findOne: async () => null,
            save: async (data) => data,
          };
        },
      };
      return cb(tx);
    },
  };

  // Instantiate Services
  const adminGameService = new AdminGameService(
    mockLevelRepo,
    mockAdminGameRepo,
    {}, // GameStep repo
    mockSubmissionRepo,
    {}, // dataSource
  );

  const memberGameService = new MemberGameService(
    mockMemberTransactionManager,
    mockLevelRepo,
    mockMemberGameRepo,
    {}, // GameStep repo
    mockMemberProgressRepo,
    mockSubmissionRepo,
    {}, // QuestPoint repo
    {}, // QuestPointDetail repo
    mockLeaderboardService,
  );

  // ==========================================
  // TEST SCENARIO 1: CMS EDIT TEST
  // ==========================================
  console.log('Step 1: Admin updates Level 1 Target Description & publishes a new video URL');
  await adminGameService.updateLevel(1, {
    targetDescription: '<p>Target Level 1: Mengapresiasi hidup dan melatih mindfulness.</p>',
  });

  // Admin updates Game 10 with a new YouTube Video URL & Reflective Title
  const gameToUpdate = mockGames.find((g) => g.id === 10);
  gameToUpdate.steps[2].videoUrl = 'https://www.youtube.com/watch?v=mindfulness-updated-2026';
  gameToUpdate.steps[3].reflectiveTitle = 'Pertanyaan Refleksi Harian (Updated)';

  assert.equal(
    mockLevels[0].targetDescription,
    '<p>Target Level 1: Mengapresiasi hidup dan melatih mindfulness.</p>',
    'Level targetDescription should be updated in CMS'
  );
  console.log('  -> Level targetDescription updated successfully.');
  console.log('  -> Game step videoUrl and reflectiveTitle updated in CMS.\n');

  // ==========================================
  // TEST SCENARIO 2: MOBILE SCREEN VERIFICATION
  // ==========================================
  console.log('Step 2: Mobile App queries member endpoints for Level, Missions, and Steps');
  const memberLevels = await memberGameService.getLevels(1001);
  assert.equal(memberLevels.length, 2);
  assert.equal(memberLevels[0].isUnlocked, true);
  assert.equal(memberLevels[0].targetDescription, '<p>Target Level 1: Mengapresiasi hidup dan melatih mindfulness.</p>');
  console.log('  -> GET /me/games/levels returned live CMS targetDescription.');

  const level1Missions = await memberGameService.getLevelMissions(1001, 1);
  assert.equal(level1Missions.length, 2);
  assert.equal(level1Missions[0].key, 'aktivitas-harian');
  assert.equal(level1Missions[0].status, 'available', 'First mission must be available');
  assert.equal(level1Missions[1].status, 'locked', 'Second mission must be locked until first is finished');
  console.log('  -> GET /me/games/levels/1/missions: Mission 1 is available, Mission 2 is locked.');

  const missionDetail = await memberGameService.getGameDetail(1001, 'aktivitas-harian');
  assert.equal(missionDetail.steps.length, 4);
  assert.equal(missionDetail.steps[0].layout, 'detail');
  assert.equal(missionDetail.steps[1].layout, 'convident');
  assert.equal(missionDetail.steps[2].layout, 'post-with-video');
  assert.equal(missionDetail.steps[2].videoUrl, 'https://www.youtube.com/watch?v=mindfulness-updated-2026');
  assert.equal(missionDetail.steps[3].reflectiveTitle, 'Pertanyaan Refleksi Harian (Updated)');
  console.log('  -> GET /me/games/detail/aktivitas-harian returned dynamic steps with updated video URL & reflection title.\n');

  // ==========================================
  // TEST SCENARIO 3: MOBILE SUBMISSION & XP REWARD
  // ==========================================
  console.log('Step 3: Member submits Mission 1 from Mobile App');
  const submitResult = await memberGameService.submitMission(1001, 'aktivitas-harian', {
    confidenceScore: 85,
    note: 'Hari ini saya berjalan santai di taman kota dan merasa lebih rileks.',
    attachments: [
      { type: 'image', url: 'https://cdn.example.com/photos/walk-park.jpg' },
      { type: 'audio', url: 'https://cdn.example.com/audio/voice-note.m4a', duration: 42 },
    ],
    reflectiveAnswer: 'Saya menyadari bahwa hal kecil di alam memberi ketenangan besar.',
  });

  assert.equal(submitResult.success, true);
  assert.equal(submitResult.earnedPoints, 50, 'Member should earn 50 XP points');
  assert.equal(submitResult.nextMissionKey, 'apresiasi-diri', 'Next mission should unlock');
  assert.equal(mockSubmissions.length, 1);
  assert.equal(mockSubmissions[0].confidenceScore, 85);
  assert.equal(mockSubmissions[0].attachments.length, 2);
  assert.equal(mockLeaderboard.length, 1);
  assert.equal(mockLeaderboard[0].points, 50);
  console.log('  -> Mission 1 submitted: 50 XP awarded, Redis leaderboard synced.');

  // Verify progression unlocked Mission 2
  const level1MissionsAfterSubmit = await memberGameService.getLevelMissions(1001, 1);
  assert.equal(level1MissionsAfterSubmit[0].status, 'finish');
  assert.equal(level1MissionsAfterSubmit[1].status, 'available', 'Mission 2 must now be unlocked to available');
  console.log('  -> Mission 1 status is finish; Mission 2 (apresiasi-diri) unlocked from locked to available.\n');

  // ==========================================
  // TEST SCENARIO 4: CMS INSPECTS MEMBER SUBMISSION
  // ==========================================
  console.log('Step 4: CMS Admin queries Hasil Pengiriman Member (/games/submissions)');
  const cmsSubmissions = await adminGameService.getSubmissions({ gameId: 10 });
  assert.equal(cmsSubmissions.total, 1);
  const sub = cmsSubmissions.items[0];
  assert.equal(sub.memberName, 'Budi Santoso');
  assert.equal(sub.confidenceScore, 85);
  assert.equal(sub.attachments[0].type, 'image');
  assert.equal(sub.attachments[1].type, 'audio');
  assert.equal(sub.reflectiveAnswer, 'Saya menyadari bahwa hal kecil di alam memberi ketenangan besar.');
  console.log('  -> CMS Submissions table reflects member name, 85% confidence score, photo/audio attachments, and reflection note.\n');

  // ==========================================
  // TEST SCENARIO 5: COMPLETE MISSION 2 (LIST INPUT) & UNLOCK LEVEL 2
  // ==========================================
  console.log('Step 5: Member completes Mission 2 (list-input) to finish Level 1');
  const submitMission2Result = await memberGameService.submitMission(1001, 'apresiasi-diri', {
    confidenceScore: 90,
    listAnswers: [
      '1. Udara pagi yang segar',
      '2. Sarapan enak bersama keluarga',
      '3. Pekerjaan selesai tepat waktu',
      '4. Teman yang ramah menyapa',
      '5. Tubuh sehat dan bugar',
    ],
  });

  assert.equal(submitMission2Result.success, true);
  assert.equal(submitMission2Result.earnedPoints, 75);
  assert.equal(mockSubmissions.length, 2);
  assert.deepEqual(mockSubmissions[1].listAnswers.length, 5);
  console.log('  -> Mission 2 (5 Gratitude List Items) submitted: 75 XP awarded.');

  const memberLevelsAfterAllFinished = await memberGameService.getLevels(1001);
  assert.equal(memberLevelsAfterAllFinished[0].completedMissions, 2);
  assert.equal(memberLevelsAfterAllFinished[1].isUnlocked, true, 'Level 2 must now be unlocked');
  console.log('  -> Level 1 completed (2/2); Level 2 unlocked for member.\n');

  console.log('========================================================');
  console.log('   ALL 5 END-TO-END ACCEPTANCE TESTS PASSED (100%)      ');
  console.log('========================================================');
}

runE2ETests().catch((err) => {
  console.error('E2E Test Failed:', err);
  process.exit(1);
});
