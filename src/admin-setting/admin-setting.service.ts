import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettingEntity } from 'src/entity/setting.entity';
import { LogLastActiveManual } from 'src/entity/log-last-active-manual.entity';
import { AdminSettingListDto, CreateSettingDto, UpdateSettingDto } from './dtos/admin-setting.dto';
import { DatatableSetting } from './interfaces/setting.interface';
import { SyncLogLastActiveDto } from './dtos/log-last-active.dto';
import { SyncLogLastActiveResponseInterface } from './interfaces/log-last-active.interface';

@Injectable()
export class AdminSettingService {
  private readonly logger = new Logger(AdminSettingService.name);

  constructor(
    @InjectRepository(SettingEntity, 'mimate')
    private readonly settingRepository: Repository<SettingEntity>,

    @InjectRepository(LogLastActiveManual, 'mimate')
    private readonly logLastActiveManualRepo: Repository<LogLastActiveManual>,
  ) { }

  async getAllSetting(dto: AdminSettingListDto): Promise<DatatableSetting> {
    const { page = 1, limit = 10, search } = dto;

    const query = this.settingRepository.createQueryBuilder('setting');

    const recordsTotal = await this.settingRepository.count();

    if (search) {
      query.where('setting.key LIKE :search OR setting.description LIKE :search', {
        search: `%${search}%`,
      });
    }

    const recordsFiltered = await query.getCount();

    query
      .orderBy('setting.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const items = await query.getMany();

    return {
      items,
      recordsTotal,
      recordsFiltered,
    };
  }

  async getDetailSetting(id: number): Promise<SettingEntity> {
    const setting = await this.settingRepository.findOne({ where: { id } });
    if (!setting) {
      throw new NotFoundException(`Setting with ID ${id} not found`);
    }
    return setting;
  }

  async getSettingByKey(key: string): Promise<SettingEntity> {
    const setting = await this.settingRepository.findOne({ where: { key } });
    if (!setting) {
      throw new NotFoundException(`Setting with key '${key}' not found`);
    }
    return setting;
  }

  async createSetting(dto: CreateSettingDto): Promise<SettingEntity> {
    const existing = await this.settingRepository.findOne({ where: { key: dto.key } });
    if (existing) {
      throw new BadRequestException(`Setting with key '${dto.key}' already exists`);
    }

    const setting = this.settingRepository.create({
      key: dto.key,
      value: dto.value,
      description: dto.description,
    });

    return await this.settingRepository.save(setting);
  }

  async upsertSetting(dto: CreateSettingDto): Promise<SettingEntity> {
    let setting = await this.settingRepository.findOne({ where: { key: dto.key } });
    if (setting) {
      if (dto.value !== undefined) setting.value = dto.value;
      if (dto.description !== undefined) setting.description = dto.description;
    } else {
      setting = this.settingRepository.create({
        key: dto.key,
        value: dto.value,
        description: dto.description,
      });
    }
    return await this.settingRepository.save(setting);
  }

  async updateSetting(id: number, dto: UpdateSettingDto): Promise<SettingEntity> {
    const setting = await this.getDetailSetting(id);

    if (dto.key && dto.key !== setting.key) {
      const existing = await this.settingRepository.findOne({ where: { key: dto.key } });
      if (existing && existing.id !== id) {
        throw new BadRequestException(`Setting with key '${dto.key}' already exists`);
      }
      setting.key = dto.key;
    }

    if (dto.value !== undefined) {
      setting.value = dto.value;
    }

    if (dto.description !== undefined) {
      setting.description = dto.description;
    }

    return await this.settingRepository.save(setting);
  }

  async deleteSetting(id: number): Promise<{ deleted: boolean }> {
    const setting = await this.getDetailSetting(id);
    await this.settingRepository.remove(setting);
    return { deleted: true };
  }

  /**
   * Get latest user data access:
   * Mengambil semua user (members), join dengan activity_logs (mengambil 1 data terbaru berdasarkan waktu / createdAt),
   * lalu menginjeksi nilai member_id, last_active, dan created_at ke tabel log_last_active_manual.
   */
  async syncLatestUserDataAccess(
    dto?: SyncLogLastActiveDto,
  ): Promise<SyncLogLastActiveResponseInterface> {
    const startTime = Date.now();
    const shouldTruncate = dto?.truncate !== false;

    this.logger.log(`Starting syncLatestUserDataAccess (truncate: ${shouldTruncate})...`);

    if (shouldTruncate) {
      await this.logLastActiveManualRepo.query('TRUNCATE TABLE log_last_active_manual');
    }

    // Mengambil semua user, di-join dengan activity_logs (ambil 1 data terbaru berdasarkan MAX(createdAt)),
    // kemudian inject nilai member_id, last_active, dan created_at ke tabel log_last_active_manual.
    await this.logLastActiveManualRepo.query(`
      INSERT INTO log_last_active_manual (member_id, last_active, created_at)
      SELECT 
        m.id AS member_id,
        latest_activity.last_active,
        NOW() AS created_at
      FROM members m
      LEFT JOIN (
        SELECT 
          al.userId,
          MAX(al.createdAt) AS last_active
        FROM activity_logs al
        WHERE al.userId IS NOT NULL
        GROUP BY al.userId
      ) latest_activity ON latest_activity.userId = m.id
    `);

    // Ambil statistik hasil sinkronisasi
    const statsResult: Array<{
      total: number;
      with_activity: number;
      without_activity: number;
    }> = await this.logLastActiveManualRepo.query(`
      SELECT 
        COUNT(*) AS total,
        COUNT(last_active) AS with_activity,
        SUM(CASE WHEN last_active IS NULL THEN 1 ELSE 0 END) AS without_activity
      FROM log_last_active_manual
    `);

    const stats = statsResult[0];
    const totalProcessed = Number(stats?.total || 0);
    const totalWithActivity = Number(stats?.with_activity || 0);
    const totalWithoutActivity = Number(stats?.without_activity || 0);
    const executionTimeMs = Date.now() - startTime;

    this.logger.log(
      `syncLatestUserDataAccess completed in ${executionTimeMs}ms. Total: ${totalProcessed}, With Activity: ${totalWithActivity}, Without: ${totalWithoutActivity}`,
    );

    return {
      totalProcessed,
      totalWithActivity,
      totalWithoutActivity,
      executionTimeMs,
      message: `Successfully injected ${totalProcessed} user last active records into log_last_active_manual`,
    };
  }
}
