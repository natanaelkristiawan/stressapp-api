import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GlobalResponse } from 'src/interfaces/global.interface';
import { SettingEntity } from 'src/entity/setting.entity';
import { AdminSettingService } from './admin-setting.service';
import { AdminSettingListDto, CreateSettingDto, UpdateSettingDto } from './dtos/admin-setting.dto';
import { DatatableSetting } from './interfaces/setting.interface';
import { SyncLogLastActiveDto } from './dtos/log-last-active.dto';
import { SyncLogLastActiveResponseInterface } from './interfaces/log-last-active.interface';

@Controller('admin-setting')
@ApiTags('ADMIN SETTING')
@ApiBearerAuth('access-token')
export class AdminSettingController {
  constructor(private readonly adminSettingService: AdminSettingService) { }

  @Get('list')
  @ApiOperation({ summary: 'Get list of settings with pagination and search' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async getAllSetting(
    @Query() dto: AdminSettingListDto,
  ): Promise<GlobalResponse<DatatableSetting>> {
    const data = await this.adminSettingService.getAllSetting(dto);
    return {
      message: 'Success',
      data,
    };
  }

  @Get('detail/:id')
  @ApiOperation({ summary: 'Get detail setting by ID' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 404, description: 'Setting not found' })
  async getDetailSetting(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<GlobalResponse<SettingEntity>> {
    const data = await this.adminSettingService.getDetailSetting(id);
    return {
      message: 'Success',
      data,
    };
  }

  @Get('key/:key')
  @ApiOperation({ summary: 'Get detail setting by key' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 404, description: 'Setting not found' })
  async getSettingByKey(
    @Param('key') key: string,
  ): Promise<GlobalResponse<SettingEntity>> {
    const data = await this.adminSettingService.getSettingByKey(key);
    return {
      message: 'Success',
      data,
    };
  }

  @Post('create')
  @ApiOperation({ summary: 'Create new setting' })
  @ApiResponse({ status: 201, description: 'Setting created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request / Key already exists' })
  async createSetting(
    @Body() dto: CreateSettingDto,
  ): Promise<GlobalResponse<SettingEntity>> {
    const data = await this.adminSettingService.createSetting(dto);
    return {
      message: 'Success',
      data,
    };
  }

  @Post('save')
  @ApiOperation({ summary: 'Save or update setting by key' })
  @ApiResponse({ status: 200, description: 'Setting saved successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async saveSetting(
    @Body() dto: CreateSettingDto,
  ): Promise<GlobalResponse<SettingEntity>> {
    const data = await this.adminSettingService.upsertSetting(dto);
    return {
      message: 'Success',
      data,
    };
  }

  @Put('update/:id')
  @ApiOperation({ summary: 'Update existing setting by ID (PUT)' })
  @ApiResponse({ status: 200, description: 'Setting updated successfully' })
  @ApiResponse({ status: 404, description: 'Setting not found' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async updateSetting(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSettingDto,
  ): Promise<GlobalResponse<SettingEntity>> {
    const data = await this.adminSettingService.updateSetting(id, dto);
    return {
      message: 'Success',
      data,
    };
  }

  @Post('update/:id')
  @ApiOperation({ summary: 'Update existing setting by ID (POST)' })
  @ApiResponse({ status: 200, description: 'Setting updated successfully' })
  @ApiResponse({ status: 404, description: 'Setting not found' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async updateSettingPost(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSettingDto,
  ): Promise<GlobalResponse<SettingEntity>> {
    const data = await this.adminSettingService.updateSetting(id, dto);
    return {
      message: 'Success',
      data,
    };
  }

  @Delete('delete/:id')
  @ApiOperation({ summary: 'Delete setting by ID' })
  @ApiResponse({ status: 200, description: 'Setting deleted successfully' })
  @ApiResponse({ status: 404, description: 'Setting not found' })
  async deleteSetting(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<GlobalResponse<{ deleted: boolean }>> {
    const data = await this.adminSettingService.deleteSetting(id);
    return {
      message: 'Success',
      data,
    };
  }

  @Post('sync-last-active-manual')
  @ApiOperation({
    summary: 'Get latest user data access from activity_logs and inject into log_last_active_manual',
  })
  @ApiResponse({ status: 200, description: 'Success' })
  async syncLatestUserDataAccess(
    @Body() dto?: SyncLogLastActiveDto,
  ): Promise<GlobalResponse<SyncLogLastActiveResponseInterface>> {
    const data = await this.adminSettingService.syncLatestUserDataAccess(dto);
    return {
      message: 'Success',
      data,
    };
  }
}
