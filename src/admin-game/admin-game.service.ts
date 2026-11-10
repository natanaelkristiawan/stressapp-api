import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { GameLevel } from '../entity/game-level.entity';
import { Game } from '../entity/game.entity';
import { GameStep } from '../entity/game-step.entity';
import { MemberGameSubmission } from '../entity/member-game-submission.entity';
import {
  AdminGameListQueryDto,
  AdminGameSubmissionsQueryDto,
  CreateGameDto,
  UpdateGameDto,
  UpdateGameLevelDto,
} from './dtos/admin-game.dto';
import {
  AdminGameDetail,
  AdminGameLevelItem,
  AdminGameListItem,
  AdminGameListResponse,
  AdminGameSubmissionItem,
  AdminGameSubmissionsResponse,
} from './interfaces/admin-game.interface';

@Injectable()
export class AdminGameService {
  constructor(
    @InjectRepository(GameLevel, 'mimate')
    private readonly gameLevelRepo: Repository<GameLevel>,
    @InjectRepository(Game, 'mimate')
    private readonly gameRepo: Repository<Game>,
    @InjectRepository(GameStep, 'mimate')
    private readonly gameStepRepo: Repository<GameStep>,
    @InjectRepository(MemberGameSubmission, 'mimate')
    private readonly submissionRepo: Repository<MemberGameSubmission>,
    @InjectDataSource('mimate')
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Mengambil daftar seluruh level game beserta jumlah misi di dalamnya.
   */
  async getLevels(): Promise<AdminGameLevelItem[]> {
    const levels = await this.gameLevelRepo.find({
      order: { levelNumber: 'ASC' },
      relations: ['games'],
    });

    return levels.map((lvl) => {
      const activeGames = lvl.games || [];
      return {
        id: lvl.id,
        levelNumber: lvl.levelNumber,
        title: lvl.title,
        targetDescription: lvl.targetDescription,
        isActive: lvl.isActive,
        totalGames: activeGames.length,
        publishedGames: activeGames.filter((g) => g.isPublished).length,
        createdAt: lvl.createdAt,
        updatedAt: lvl.updatedAt,
      };
    });
  }

  /**
   * Memperbarui informasi judul, target misi (HTML), atau status aktif level.
   */
  async updateLevel(
    id: number,
    dto: UpdateGameLevelDto,
  ): Promise<AdminGameLevelItem> {
    const level = await this.gameLevelRepo.findOne({
      where: { id },
      relations: ['games'],
    });

    if (!level) {
      throw new NotFoundException(`Level dengan ID ${id} tidak ditemukan`);
    }

    if (dto.title !== undefined) {
      level.title = dto.title;
    }
    if (dto.targetDescription !== undefined) {
      level.targetDescription = dto.targetDescription;
    }
    if (dto.isActive !== undefined) {
      level.isActive = dto.isActive;
    }

    const saved = await this.gameLevelRepo.save(level);
    const activeGames = saved.games || [];

    return {
      id: saved.id,
      levelNumber: saved.levelNumber,
      title: saved.title,
      targetDescription: saved.targetDescription,
      isActive: saved.isActive,
      totalGames: activeGames.length,
      publishedGames: activeGames.filter((g) => g.isPublished).length,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  /**
   * Mengambil daftar game dengan filter level, status, dan pencarian.
   */
  async getGames(query: AdminGameListQueryDto): Promise<AdminGameListResponse> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? query.pageSize : 20;
    const skip = (page - 1) * pageSize;

    const qb = this.gameRepo
      .createQueryBuilder('game')
      .innerJoinAndSelect('game.level', 'level')
      .leftJoinAndSelect('game.steps', 'step');

    if (query.level) {
      qb.andWhere('level.levelNumber = :levelNumber', {
        levelNumber: query.level,
      });
    }

    if (query.status === 'published') {
      qb.andWhere('game.isPublished = :isPublished', { isPublished: true });
    } else if (query.status === 'draft') {
      qb.andWhere('game.isPublished = :isPublished', { isPublished: false });
    }

    if (query.search) {
      const searchPattern = `%${query.search}%`;
      qb.andWhere(
        '(game.name LIKE :search OR game.key LIKE :search)',
        { search: searchPattern },
      );
    }

    qb.orderBy('level.levelNumber', 'ASC')
      .addOrderBy('game.orderIndex', 'ASC')
      .skip(skip)
      .take(pageSize);

    const [games, total] = await qb.getManyAndCount();

    const items: AdminGameListItem[] = games.map((game) => ({
      id: game.id,
      key: game.key,
      name: game.name,
      levelId: game.levelId,
      levelNumber: game.level?.levelNumber ?? 0,
      levelTitle: game.level?.title ?? '',
      orderIndex: game.orderIndex,
      pointsReward: game.pointsReward,
      haveNextLevel: game.haveNextLevel,
      isPublished: game.isPublished,
      totalSteps: game.steps ? game.steps.length : 0,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
    }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Mengambil detail lengkap 1 game beserta relasi level dan ordered steps.
   */
  async getGameDetail(id: number): Promise<AdminGameDetail> {
    const game = await this.gameRepo.findOne({
      where: { id },
      relations: ['level', 'steps'],
    });

    if (!game) {
      throw new NotFoundException(`Game dengan ID ${id} tidak ditemukan`);
    }

    // Urutkan langkah-langkah berdasarkan stepOrder ASC
    const sortedSteps = (game.steps || []).sort(
      (a, b) => a.stepOrder - b.stepOrder,
    );

    return {
      id: game.id,
      key: game.key,
      name: game.name,
      levelId: game.levelId,
      levelNumber: game.level?.levelNumber ?? 0,
      levelTitle: game.level?.title ?? '',
      orderIndex: game.orderIndex,
      successMessage: game.successMessage,
      haveNextLevel: game.haveNextLevel,
      pointsReward: game.pointsReward,
      isPublished: game.isPublished,
      steps: sortedSteps.map((step) => ({
        id: step.id,
        stepOrder: step.stepOrder,
        layout: step.layout,
        title: step.title,
        description: step.description,
        descriptionExtra: step.descriptionExtra,
        instruction: step.instruction,
        videoUrl: step.videoUrl,
        reflectiveTitle: step.reflectiveTitle,
        reflectiveQuestion: step.reflectiveQuestion,
      })),
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
    };
  }

  /**
   * Menambah game baru dan seluruh langkahnya secara atomik dalam database transaction.
   */
  async createGame(dto: CreateGameDto): Promise<AdminGameDetail> {
    // Validasi level exists
    const level = await this.gameLevelRepo.findOne({
      where: { id: dto.levelId },
    });
    if (!level) {
      throw new BadRequestException(
        `Game level dengan ID ${dto.levelId} tidak valid`,
      );
    }

    // Validasi key uniqueness
    const existing = await this.gameRepo.findOne({
      where: { key: dto.key },
      withDeleted: true,
    });
    if (existing) {
      throw new ConflictException(
        `Slug key '${dto.key}' sudah digunakan oleh game lain`,
      );
    }

    if (!dto.steps || dto.steps.length === 0) {
      throw new BadRequestException('Misi harus memiliki minimal 1 langkah');
    }

    let createdGameId = 0;

    await this.dataSource.transaction(async (manager) => {
      const game = manager.create(Game, {
        levelId: dto.levelId,
        key: dto.key,
        name: dto.name,
        orderIndex: dto.orderIndex ?? 0,
        successMessage: dto.successMessage ?? null,
        haveNextLevel: dto.haveNextLevel ?? true,
        pointsReward: dto.pointsReward ?? 50,
        isPublished: dto.isPublished ?? true,
      });

      const savedGame = await manager.save(Game, game);
      createdGameId = savedGame.id;

      const stepsToInsert = dto.steps.map((s, index) =>
        manager.create(GameStep, {
          gameId: savedGame.id,
          stepOrder: s.stepOrder ?? index + 1,
          layout: s.layout,
          title: s.title,
          description: s.description,
          descriptionExtra: s.descriptionExtra ?? null,
          instruction: s.instruction ?? null,
          videoUrl: s.videoUrl ?? null,
          reflectiveTitle: s.reflectiveTitle ?? null,
          reflectiveQuestion: s.reflectiveQuestion ?? null,
        }),
      );

      await manager.save(GameStep, stepsToInsert);
    });

    return this.getGameDetail(createdGameId);
  }

  /**
   * Memperbarui game dan langkah-langkahnya secara atomik dalam database transaction.
   */
  async updateGame(id: number, dto: UpdateGameDto): Promise<AdminGameDetail> {
    const game = await this.gameRepo.findOne({ where: { id } });
    if (!game) {
      throw new NotFoundException(`Game dengan ID ${id} tidak ditemukan`);
    }

    if (dto.levelId && dto.levelId !== game.levelId) {
      const level = await this.gameLevelRepo.findOne({
        where: { id: dto.levelId },
      });
      if (!level) {
        throw new BadRequestException(
          `Game level dengan ID ${dto.levelId} tidak valid`,
        );
      }
      game.levelId = dto.levelId;
    }

    if (dto.key && dto.key !== game.key) {
      const existing = await this.gameRepo.findOne({
        where: { key: dto.key },
        withDeleted: true,
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Slug key '${dto.key}' sudah digunakan oleh game lain`,
        );
      }
      game.key = dto.key;
    }

    if (dto.name !== undefined) {
      game.name = dto.name;
    }
    if (dto.orderIndex !== undefined) {
      game.orderIndex = dto.orderIndex;
    }
    if (dto.successMessage !== undefined) {
      game.successMessage = dto.successMessage;
    }
    if (dto.haveNextLevel !== undefined) {
      game.haveNextLevel = dto.haveNextLevel;
    }
    if (dto.pointsReward !== undefined) {
      game.pointsReward = dto.pointsReward;
    }
    if (dto.isPublished !== undefined) {
      game.isPublished = dto.isPublished;
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.save(Game, game);

      if (dto.steps && dto.steps.length > 0) {
        // Hapus langkah lama untuk game ini
        await manager.delete(GameStep, { gameId: id });

        // Simpan langkah baru yang rapi
        const stepsToInsert = dto.steps.map((s, index) =>
          manager.create(GameStep, {
            gameId: id,
            stepOrder: s.stepOrder ?? index + 1,
            layout: s.layout,
            title: s.title,
            description: s.description,
            descriptionExtra: s.descriptionExtra ?? null,
            instruction: s.instruction ?? null,
            videoUrl: s.videoUrl ?? null,
            reflectiveTitle: s.reflectiveTitle ?? null,
            reflectiveQuestion: s.reflectiveQuestion ?? null,
          }),
        );

        await manager.save(GameStep, stepsToInsert);
      }
    });

    return this.getGameDetail(id);
  }

  /**
   * Menghapus game (soft delete).
   */
  async deleteGame(id: number): Promise<{ id: number; deleted: boolean }> {
    const game = await this.gameRepo.findOne({ where: { id } });
    if (!game) {
      throw new NotFoundException(`Game dengan ID ${id} tidak ditemukan`);
    }

    await this.gameRepo.softDelete(id);
    return { id, deleted: true };
  }

  /**
   * Mengambil riwayat pengiriman refleksi member (submissions) dengan pagination dan filter.
   */
  async getSubmissions(
    query: AdminGameSubmissionsQueryDto,
  ): Promise<AdminGameSubmissionsResponse> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? query.pageSize : 20;
    const skip = (page - 1) * pageSize;

    const qb = this.submissionRepo
      .createQueryBuilder('submission')
      .leftJoinAndSelect('submission.member', 'member')
      .leftJoinAndSelect('submission.game', 'game')
      .leftJoinAndSelect('game.level', 'level');

    if (query.gameId) {
      qb.andWhere('submission.gameId = :gameId', { gameId: query.gameId });
    }

    if (query.memberId) {
      qb.andWhere('submission.memberId = :memberId', {
        memberId: query.memberId,
      });
    }

    if (query.search) {
      const searchPattern = `%${query.search}%`;
      qb.andWhere(
        '(member.name LIKE :search OR member.email LIKE :search OR game.name LIKE :search)',
        { search: searchPattern },
      );
    }

    qb.orderBy('submission.createdAt', 'DESC')
      .skip(skip)
      .take(pageSize);

    const [submissions, total] = await qb.getManyAndCount();

    const items: AdminGameSubmissionItem[] = submissions.map((sub) => {
      const member = sub.member;
      const game = sub.game;
      const memberName =
        member?.name || member?.username || `Member #${sub.memberId}`;
      const memberAvatar =
        member?.profilePictureUrl || member?.image_path || null;

      return {
        id: sub.id,
        memberId: sub.memberId,
        memberName,
        memberEmail: member?.email || null,
        memberAvatar,
        gameId: sub.gameId,
        gameKey: game?.key || '',
        gameName: game?.name || `Game #${sub.gameId}`,
        levelNumber: game?.level?.levelNumber ?? 0,
        note: sub.note,
        attachments: sub.attachments,
        confidenceScore: sub.confidenceScore,
        listAnswers: sub.listAnswers,
        reflectiveAnswer: sub.reflectiveAnswer,
        createdAt: sub.createdAt,
      };
    });

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}

