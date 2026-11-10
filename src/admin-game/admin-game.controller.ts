import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CmsMembersGuard } from '../cms-members/cms-members.guard';
import { GlobalResponse } from '../interfaces/global.interface';
import { AdminGameService } from './admin-game.service';
import {
  AdminGameListQueryDto,
  AdminGameSubmissionsQueryDto,
  CreateGameDto,
  GameIdParamDto,
  LevelIdParamDto,
  UpdateGameDto,
  UpdateGameLevelDto,
} from './dtos/admin-game.dto';
import {
  AdminGameDetail,
  AdminGameLevelItem,
  AdminGameListResponse,
  AdminGameSubmissionsResponse,
} from './interfaces/admin-game.interface';

@ApiTags('CMS Games')
@ApiBearerAuth('access-token')
@UseGuards(CmsMembersGuard)
@Controller('admin-games')
export class AdminGameController {
  constructor(private readonly adminGameService: AdminGameService) {}

  @Get('levels')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary: 'Daftar semua level game beserta ringkasan misi',
  })
  @ApiResponse({ status: 200, description: 'Berhasil memuat level' })
  async getLevels(): Promise<GlobalResponse<AdminGameLevelItem[]>> {
    const data = await this.adminGameService.getLevels();
    return {
      message: 'Berhasil memuat daftar level game',
      data,
    };
  }

  @Patch('levels/:id')
  @ApiOperation({
    summary: 'Memperbarui judul, deskripsi target HTML, atau status level',
  })
  @ApiResponse({ status: 200, description: 'Level berhasil diperbarui' })
  async updateLevel(
    @Param() param: LevelIdParamDto,
    @Body() body: UpdateGameLevelDto,
  ): Promise<GlobalResponse<AdminGameLevelItem>> {
    const data = await this.adminGameService.updateLevel(param.id, body);
    return {
      message: 'Level berhasil diperbarui',
      data,
    };
  }

  @Get('list')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary: 'Daftar game/misi dengan filter level, status, dan pencarian',
  })
  @ApiResponse({ status: 200, description: 'Berhasil memuat daftar game' })
  async getGames(
    @Query() query: AdminGameListQueryDto,
  ): Promise<GlobalResponse<AdminGameListResponse>> {
    const data = await this.adminGameService.getGames(query);
    return {
      message: 'Berhasil memuat daftar game',
      data,
    };
  }

  @Get('detail/:id')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary: 'Detail lengkap satu game beserta daftar langkah-langkahnya',
  })
  @ApiResponse({ status: 200, description: 'Berhasil memuat detail game' })
  async getGameDetail(
    @Param() param: GameIdParamDto,
  ): Promise<GlobalResponse<AdminGameDetail>> {
    const data = await this.adminGameService.getGameDetail(param.id);
    return {
      message: 'Berhasil memuat detail game',
      data,
    };
  }

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Menambahkan game baru beserta langkah-langkahnya secara atomik',
  })
  @ApiResponse({ status: 201, description: 'Game berhasil dibuat' })
  async createGame(
    @Body() body: CreateGameDto,
  ): Promise<GlobalResponse<AdminGameDetail>> {
    const data = await this.adminGameService.createGame(body);
    return {
      message: 'Game berhasil dibuat',
      data,
    };
  }

  @Patch('update/:id')
  @ApiOperation({
    summary: 'Memperbarui data game dan susunan langkah-langkahnya',
  })
  @ApiResponse({ status: 200, description: 'Game berhasil diperbarui' })
  async updateGame(
    @Param() param: GameIdParamDto,
    @Body() body: UpdateGameDto,
  ): Promise<GlobalResponse<AdminGameDetail>> {
    const data = await this.adminGameService.updateGame(param.id, body);
    return {
      message: 'Game berhasil diperbarui',
      data,
    };
  }

  @Delete('delete/:id')
  @ApiOperation({
    summary: 'Menghapus game secara lunak (soft delete)',
  })
  @ApiResponse({ status: 200, description: 'Game berhasil dihapus' })
  async deleteGame(
    @Param() param: GameIdParamDto,
  ): Promise<GlobalResponse<{ id: number; deleted: boolean }>> {
    const data = await this.adminGameService.deleteGame(param.id);
    return {
      message: 'Game berhasil dihapus',
      data,
    };
  }

  @Get('submissions')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary: 'Daftar pengiriman refleksi member (foto, audio, catatan)',
  })
  @ApiResponse({ status: 200, description: 'Berhasil memuat riwayat pengiriman' })
  async getSubmissions(
    @Query() query: AdminGameSubmissionsQueryDto,
  ): Promise<GlobalResponse<AdminGameSubmissionsResponse>> {
    const data = await this.adminGameService.getSubmissions(query);
    return {
      message: 'Berhasil memuat riwayat pengiriman game',
      data,
    };
  }
}

