import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { GameLevel } from '../entity/game-level.entity';
import { Game } from '../entity/game.entity';
import { GameStep } from '../entity/game-step.entity';
import { MemberGameProgress } from '../entity/member-game-progress.entity';
import { MemberGameSubmission } from '../entity/member-game-submission.entity';
import { QuestPoint } from '../entity/quest-point.entity';
import { QuestPointDetail } from '../entity/quest-point-detail.entity';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { MemberGameService } from './member-game.service';

describe('MemberGameService - Overview and Leaderboard', () => {
  let service: MemberGameService;
  let questPointRepo: Partial<Record<keyof Repository<QuestPoint>, jest.Mock>>;
  let levelRepo: Partial<Record<keyof Repository<GameLevel>, jest.Mock>>;
  let progressRepo: Partial<Record<keyof Repository<MemberGameProgress>, jest.Mock>>;

  beforeEach(async () => {
    questPointRepo = {
      findOne: jest.fn(),
      count: jest.fn(),
      find: jest.fn(),
    };

    levelRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 1,
          levelNumber: 1,
          title: 'Level 1: Dasar',
          isActive: true,
          games: [{ id: 10, isPublished: true }],
        },
        {
          id: 2,
          levelNumber: 2,
          title: 'Level 2: Lanjutan',
          isActive: true,
          games: [{ id: 20, isPublished: true }],
        },
      ]),
      findOne: jest.fn(),
    };

    progressRepo = {
      find: jest.fn().mockResolvedValue([
        { memberId: 1, gameId: 10, status: 'finish' },
      ]),
      count: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemberGameService,
        { provide: getDataSourceToken('mimate'), useValue: {} as DataSource },
        { provide: getRepositoryToken(GameLevel, 'mimate'), useValue: levelRepo },
        { provide: getRepositoryToken(Game, 'mimate'), useValue: { find: jest.fn() } },
        { provide: getRepositoryToken(GameStep, 'mimate'), useValue: { find: jest.fn() } },
        { provide: getRepositoryToken(MemberGameProgress, 'mimate'), useValue: progressRepo },
        { provide: getRepositoryToken(MemberGameSubmission, 'mimate'), useValue: {} },
        { provide: getRepositoryToken(QuestPoint, 'mimate'), useValue: questPointRepo },
        { provide: getRepositoryToken(QuestPointDetail, 'mimate'), useValue: {} },
        { provide: LeaderboardService, useValue: { record: jest.fn() } },
      ],
    }).compile();

    service = module.get<MemberGameService>(MemberGameService);
  });

  it('should return member overview with active level and points', async () => {
    questPointRepo.findOne?.mockResolvedValue({ memberId: 1, totalPoints: 150 });
    questPointRepo.count?.mockResolvedValue(2); // 2 users ahead -> rank 3

    const overview = await service.getOverview(1);

    expect(overview.currentLevel).toBe(2);
    expect(overview.totalPoints).toBe(150);
    expect(overview.rank).toBe(3);
  });

  it('should return leaderboard entries with topPlayer and myStats', async () => {
    questPointRepo.findOne?.mockResolvedValue({ memberId: 1, totalPoints: 150 });
    questPointRepo.count?.mockResolvedValue(0); // rank 1
    questPointRepo.find?.mockResolvedValue([
      {
        memberId: 1,
        totalPoints: 150,
        member: { id: 1, name: 'Alice', profilePictureUrl: 'https://example.com/alice.jpg' },
      },
      {
        memberId: 2,
        totalPoints: 100,
        member: { id: 2, name: 'Bob', profilePictureUrl: null },
      },
    ]);

    const result = await service.getLeaderboard(1, 10);

    expect(result.topPlayer).toBeDefined();
    expect(result.topPlayer?.name).toBe('Alice');
    expect(result.leaderboard).toHaveLength(2);
    expect(result.leaderboard[0].isOwner).toBe(true);
    expect(result.leaderboard[1].isOwner).toBe(false);
    expect(result.myStats.points).toBe(150);
  });

  it('should reject submission if note or listAnswers are completely blank', async () => {
    const gameRepo = (service as any).gameRepository;
    gameRepo.findOne = jest.fn().mockResolvedValue({
      id: 1,
      key: 'test-mission',
      name: 'Test',
      isPublished: true,
      level: { levelNumber: 1 },
    });

    await expect(
      service.submitMission(1, 'test-mission', {
        note: '   ',
        listAnswers: ['   ', ''],
      })
    ).rejects.toThrow('Kolom input jawaban tidak boleh kosong.');

    await expect(
      service.submitMission(1, 'test-mission', {
        note: '   ',
      })
    ).rejects.toThrow('Pengiriman refleksi atau jawaban misi tidak boleh kosong.');
  });
});


