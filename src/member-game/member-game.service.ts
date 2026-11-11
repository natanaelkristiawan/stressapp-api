import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, MoreThan, Repository } from 'typeorm';
import { GameLevel } from '../entity/game-level.entity';
import { Game } from '../entity/game.entity';
import { GameStep } from '../entity/game-step.entity';
import {
  GameProgressStatus,
  MemberGameProgress,
} from '../entity/member-game-progress.entity';
import { MemberGameSubmission } from '../entity/member-game-submission.entity';
import { QuestPoint } from '../entity/quest-point.entity';
import {
  PointSource,
  QuestPointDetail,
} from '../entity/quest-point-detail.entity';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { SubmitGameMissionDto } from './dtos/member-game.dto';
import {
  MemberGameDetailResponse,
  MemberGameItem,
  MemberGameLevelItem,
  MemberGameOverviewResponse,
  MemberGameStepItem,
  MemberGameSubmitResponse,
  MemberLeaderboardItem,
  MemberLeaderboardResponse,
} from './interfaces/member-game.interface';

@Injectable()
export class MemberGameService {
  constructor(
    @InjectDataSource('mimate')
    private readonly dataSource: DataSource,

    @InjectRepository(GameLevel, 'mimate')
    private readonly levelRepository: Repository<GameLevel>,

    @InjectRepository(Game, 'mimate')
    private readonly gameRepository: Repository<Game>,

    @InjectRepository(GameStep, 'mimate')
    private readonly stepRepository: Repository<GameStep>,

    @InjectRepository(MemberGameProgress, 'mimate')
    private readonly progressRepository: Repository<MemberGameProgress>,

    @InjectRepository(MemberGameSubmission, 'mimate')
    private readonly submissionRepository: Repository<MemberGameSubmission>,

    @InjectRepository(QuestPoint, 'mimate')
    private readonly questPointRepository: Repository<QuestPoint>,

    @InjectRepository(QuestPointDetail, 'mimate')
    private readonly questPointDetailRepository: Repository<QuestPointDetail>,

    private readonly leaderboardService: LeaderboardService,
  ) {}

  /**
   * Mengambil daftar seluruh level aktif beserta status progress member.
   */
  async getLevels(memberId: number): Promise<MemberGameLevelItem[]> {
    const levels = await this.levelRepository.find({
      where: { isActive: true },
      relations: ['games'],
      order: { levelNumber: 'ASC' },
    });

    // Ambil seluruh progress member untuk evaluasi status unlock
    const memberProgresses = await this.progressRepository.find({
      where: { memberId },
    });
    const finishedGameIds = new Set(
      memberProgresses
        .filter((p) => p.status === 'finish')
        .map((p) => p.gameId),
    );

    const result: MemberGameLevelItem[] = [];
    let previousLevelFinished = true;

    for (const lvl of levels) {
      const publishedGames = (lvl.games || []).filter((g) => g.isPublished);
      const totalMissions = publishedGames.length;
      const completedMissions = publishedGames.filter((g) =>
        finishedGameIds.has(g.id),
      ).length;

      const isCurrentLevelFinished =
        totalMissions > 0 && completedMissions === totalMissions;

      // Level 1 selalu terbuka; Level N terbuka jika level N-1 sudah selesai
      // atau member sudah memiliki progress di level N tersebut.
      const isUnlocked =
        lvl.levelNumber === 1 ||
        previousLevelFinished ||
        completedMissions > 0;

      result.push({
        id: lvl.id,
        levelNumber: lvl.levelNumber,
        title: lvl.title,
        targetDescription: lvl.targetDescription,
        totalMissions,
        completedMissions,
        isUnlocked,
      });

      previousLevelFinished = isCurrentLevelFinished;
    }

    return result;
  }

  /**
   * Mengambil daftar misi dalam 1 level tertentu beserta status ketersediaan member.
   */
  async getLevelMissions(
    memberId: number,
    levelNumber: number,
  ): Promise<MemberGameItem[]> {
    const level = await this.levelRepository.findOne({
      where: { levelNumber, isActive: true },
    });

    if (!level) {
      throw new NotFoundException(`Level ${levelNumber} tidak ditemukan`);
    }

    const games = await this.gameRepository.find({
      where: { levelId: level.id, isPublished: true },
      order: { orderIndex: 'ASC' },
    });

    if (games.length === 0) {
      return [];
    }

    // Periksa apakah level ini terbuka untuk member
    const isLevelUnlocked = await this.checkIfLevelUnlocked(memberId, levelNumber);

    const gameIds = games.map((g) => g.id);
    const progresses = await this.progressRepository.find({
      where: { memberId, gameId: In(gameIds) },
    });
    const progressMap = new Map<number, MemberGameProgress>();
    for (const p of progresses) {
      progressMap.set(p.gameId, p);
    }

    const result: MemberGameItem[] = [];
    let previousMissionFinished = true;

    for (let i = 0; i < games.length; i++) {
      const game = games[i];
      const prog = progressMap.get(game.id);

      let status: GameProgressStatus = 'locked';
      let completedAt: Date | null = null;

      if (prog) {
        status = prog.status;
        completedAt = prog.completedAt;
      } else if (isLevelUnlocked) {
        if (i === 0) {
          // Misi pertama pada level yang terbuka langsung available
          status = 'available';
        } else if (previousMissionFinished) {
          status = 'available';
        } else {
          status = 'locked';
        }
      } else {
        status = 'locked';
      }

      previousMissionFinished = status === 'finish';

      result.push({
        id: game.id,
        levelId: level.id,
        levelNumber: level.levelNumber,
        key: game.key,
        name: game.name,
        orderIndex: game.orderIndex,
        pointsReward: game.pointsReward,
        haveNextLevel: game.haveNextLevel,
        status,
        completedAt,
      });
    }

    return result;
  }

  /**
   * Mengambil detail lengkap 1 game/misi beserta seluruh urutan step-nya.
   */
  async getGameDetail(
    memberId: number,
    gameKey: string,
  ): Promise<MemberGameDetailResponse> {
    const game = await this.gameRepository.findOne({
      where: { key: gameKey, isPublished: true },
      relations: ['level', 'steps'],
      order: {
        steps: {
          stepOrder: 'ASC',
        },
      },
    });

    if (!game) {
      throw new NotFoundException(`Game '${gameKey}' tidak ditemukan`);
    }

    // Ambil status progress member untuk game ini
    const prog = await this.progressRepository.findOne({
      where: { memberId, gameId: game.id },
    });

    let status: GameProgressStatus = 'available';
    if (prog) {
      status = prog.status;
    } else {
      const isUnlocked = await this.checkIfLevelUnlocked(
        memberId,
        game.level.levelNumber,
      );
      if (!isUnlocked) {
        status = 'locked';
      }
    }

    const steps: MemberGameStepItem[] = (game.steps || []).map((s) => ({
      id: s.id,
      stepOrder: s.stepOrder,
      layout: s.layout,
      title: s.title,
      description: s.description,
      descriptionExtra: s.descriptionExtra,
      instruction: s.instruction,
      videoUrl: s.videoUrl,
      reflectiveTitle: s.reflectiveTitle,
      reflectiveQuestion: s.reflectiveQuestion,
    }));

    return {
      id: game.id,
      key: game.key,
      name: game.name,
      levelId: game.levelId,
      levelNumber: game.level.levelNumber,
      orderIndex: game.orderIndex,
      successMessage: game.successMessage,
      haveNextLevel: game.haveNextLevel,
      pointsReward: game.pointsReward,
      status,
      steps,
    };
  }

  /**
   * Menyimpan pengiriman misi, memberikan poin XP ke QuestPoint & Leaderboard,
   * dan membuka misi berikutnya dalam level atau level selanjutnya.
   */
  async submitMission(
    memberId: number,
    gameKey: string,
    body: SubmitGameMissionDto,
  ): Promise<MemberGameSubmitResponse> {
    const game = await this.gameRepository.findOne({
      where: { key: gameKey, isPublished: true },
      relations: ['level'],
    });

    if (!game) {
      throw new NotFoundException(`Game '${gameKey}' tidak ditemukan`);
    }

    const now = new Date();
    let earnedPoints = 0;
    let nextMissionKey: string | null = null;

    await this.dataSource.transaction(async (manager) => {
      // 1. Simpan riwayat pengiriman refleksi / jawaban member
      const submission = manager.create(MemberGameSubmission, {
        memberId,
        gameId: game.id,
        note: body.note || null,
        attachments: body.attachments && body.attachments.length ? body.attachments : null,
        confidenceScore: typeof body.confidenceScore === 'number' ? body.confidenceScore : null,
        listAnswers: body.listAnswers && body.listAnswers.length ? body.listAnswers : null,
        reflectiveAnswer: body.reflectiveAnswer || null,
      });
      await manager.save(MemberGameSubmission, submission);

      // 2. Periksa status progress sebelumnya untuk menghindari duplikasi poin
      const existingProgress = await manager.findOne(MemberGameProgress, {
        where: { memberId, gameId: game.id },
      });

      const isFirstTimeCompletion = !existingProgress || existingProgress.status !== 'finish';

      if (isFirstTimeCompletion) {
        earnedPoints = game.pointsReward || 0;

        if (earnedPoints > 0) {
          // Tambah total points di tabel quest_points
          const qpRepo = manager.getRepository(QuestPoint);
          const existingQp = await qpRepo.findOne({ where: { memberId } });

          if (existingQp) {
            await qpRepo.increment({ id: existingQp.id }, 'totalPoints', earnedPoints);
          } else {
            await qpRepo.save({
              memberId,
              totalPoints: earnedPoints,
              updatedAt: now,
            });
          }

          // Catat riwayat penambahan poin di quest_point_detail
          const qpd = await manager.getRepository(QuestPointDetail).save({
            member_id: memberId,
            quest_id: null,
            points: earnedPoints,
            source: PointSource.QUEST,
            note: `Menyelesaikan Misi Game: ${game.name}`,
            created_at: now,
          });

          // Perbarui skor di Redis Leaderboard melalui LeaderboardService
          if (
            this.leaderboardService &&
            typeof this.leaderboardService.record === 'function'
          ) {
            await this.leaderboardService.record(manager, qpd);
          }
        }
      }

      // 3. Perbarui atau buat progress misi ini menjadi 'finish'
      if (existingProgress) {
        existingProgress.status = 'finish';
        existingProgress.completedAt = existingProgress.completedAt || now;
        await manager.save(MemberGameProgress, existingProgress);
      } else {
        const newProgress = manager.create(MemberGameProgress, {
          memberId,
          gameId: game.id,
          status: 'finish',
          completedAt: now,
        });
        await manager.save(MemberGameProgress, newProgress);
      }

      // 4. Buka misi berikutnya dalam level yang sama
      const nextGameInLevel = await manager.findOne(Game, {
        where: {
          levelId: game.levelId,
          isPublished: true,
        },
        order: { orderIndex: 'ASC' },
      });

      const allGamesInLevel = await manager.find(Game, {
        where: { levelId: game.levelId, isPublished: true },
        order: { orderIndex: 'ASC' },
      });

      const currentIndex = allGamesInLevel.findIndex((g) => g.id === game.id);
      if (currentIndex >= 0 && currentIndex + 1 < allGamesInLevel.length) {
        const nextGame = allGamesInLevel[currentIndex + 1];
        nextMissionKey = nextGame.key;

        const nextProg = await manager.findOne(MemberGameProgress, {
          where: { memberId, gameId: nextGame.id },
        });

        if (!nextProg) {
          const created = manager.create(MemberGameProgress, {
            memberId,
            gameId: nextGame.id,
            status: 'available',
          });
          await manager.save(MemberGameProgress, created);
        } else if (nextProg.status === 'locked') {
          nextProg.status = 'available';
          await manager.save(MemberGameProgress, nextProg);
        }
      } else if (game.haveNextLevel) {
        // Ini misi terakhir di level saat ini, buka level selanjutnya
        const nextLevel = await manager.findOne(GameLevel, {
          where: {
            levelNumber: game.level.levelNumber + 1,
            isActive: true,
          },
        });

        if (nextLevel) {
          const firstGameNextLevel = await manager.findOne(Game, {
            where: { levelId: nextLevel.id, isPublished: true },
            order: { orderIndex: 'ASC' },
          });

          if (firstGameNextLevel) {
            nextMissionKey = firstGameNextLevel.key;

            const nextLevelProg = await manager.findOne(MemberGameProgress, {
              where: { memberId, gameId: firstGameNextLevel.id },
            });

            if (!nextLevelProg) {
              const created = manager.create(MemberGameProgress, {
                memberId,
                gameId: firstGameNextLevel.id,
                status: 'available',
              });
              await manager.save(MemberGameProgress, created);
            } else if (nextLevelProg.status === 'locked') {
              nextLevelProg.status = 'available';
              await manager.save(MemberGameProgress, nextLevelProg);
            }
          }
        }
      }
    });

    return {
      success: true,
      earnedPoints,
      haveNextLevel: game.haveNextLevel,
      successMessage:
        game.successMessage ||
        'Selamat Anda telah berhasil menyelesaikan tantangan ini!',
      nextMissionKey,
    };
  }

  /**
   * Helper internal: Mengecek apakah level tertentu sudah berstatus terbuka untuk member.
   */
  private async checkIfLevelUnlocked(
    memberId: number,
    levelNumber: number,
  ): Promise<boolean> {
    if (levelNumber <= 1) {
      return true;
    }

    // Level N terbuka jika seluruh misi pada level N - 1 sudah 'finish'
    const prevLevel = await this.levelRepository.findOne({
      where: { levelNumber: levelNumber - 1 },
      relations: ['games'],
    });

    if (!prevLevel) {
      return false;
    }

    const prevGames = (prevLevel.games || []).filter((g) => g.isPublished);
    if (prevGames.length === 0) {
      return true;
    }

    const prevGameIds = prevGames.map((g) => g.id);
    const finishes = await this.progressRepository.count({
      where: {
        memberId,
        gameId: In(prevGameIds),
        status: 'finish',
      },
    });

    return finishes === prevGames.length;
  }

  /**
   * Mengambil ringkasan status level dan poin member saat ini.
   */
  async getOverview(memberId: number): Promise<MemberGameOverviewResponse> {
    const levels = await this.getLevels(memberId);
    let currentLevel = 1;
    for (const lvl of levels) {
      if (lvl.isUnlocked) {
        currentLevel = lvl.levelNumber;
      }
    }

    const questPoint = await this.questPointRepository.findOne({
      where: { memberId },
    });
    const totalPoints = questPoint?.totalPoints ?? 0;

    let rank = 0;
    if (totalPoints > 0) {
      const higherCount = await this.questPointRepository.count({
        where: { totalPoints: MoreThan(totalPoints) },
      });
      rank = higherCount + 1;
    }

    return {
      currentLevel,
      totalPoints,
      rank,
    };
  }

  /**
   * Mengambil leaderboard member beserta info top player dan ranking member yang memanggil.
   */
  async getLeaderboard(
    memberId: number,
    limit: number = 10,
  ): Promise<MemberLeaderboardResponse> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);

    const pointEntries = await this.questPointRepository.find({
      where: { totalPoints: MoreThan(0) },
      order: { totalPoints: 'DESC' },
      take: safeLimit,
      relations: ['member'],
    });

    const leaderboard: MemberLeaderboardItem[] = pointEntries.map(
      (entry, idx) => ({
        rank: idx + 1,
        memberId: entry.memberId || 0,
        name: entry.member?.name || 'Player',
        points: entry.totalPoints,
        avatarUrl:
          entry.member?.profilePictureUrl ||
          entry.member?.image_path ||
          null,
        isOwner: entry.memberId === memberId,
      }),
    );

    const topPlayer = leaderboard.length > 0 ? leaderboard[0] : null;
    const overview = await this.getOverview(memberId);

    return {
      topPlayer,
      leaderboard,
      myStats: {
        rank: overview.rank,
        points: overview.totalPoints,
        currentLevel: overview.currentLevel,
      },
    };
  }
}


