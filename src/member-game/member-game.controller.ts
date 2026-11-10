import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GlobalResponse } from '../interfaces/global.interface';
import {
  MemberAuthGuard,
  MemberRequest,
} from '../member-auth/member-auth.guard';
import {
  GameKeyParamDto,
  LevelNumberParamDto,
  SubmitGameMissionDto,
} from './dtos/member-game.dto';
import {
  MemberGameDetailResponse,
  MemberGameItem,
  MemberGameLevelItem,
  MemberGameSubmitResponse,
} from './interfaces/member-game.interface';
import { MemberGameService } from './member-game.service';

@ApiTags('Member Games')
@ApiBearerAuth('access-token')
@UseGuards(MemberAuthGuard)
@Controller('me/games')
export class MemberGameController {
  constructor(private readonly memberGameService: MemberGameService) {}

  @Get('levels')
  @Header('Cache-Control', 'private, no-cache')
  @ApiOperation({
    summary: 'Daftar semua level game dan status penyelesaian member',
  })
  @ApiResponse({ status: 200, description: 'Berhasil memuat daftar level game' })
  async getLevels(
    @Req() req: MemberRequest,
  ): Promise<GlobalResponse<MemberGameLevelItem[]>> {
    const data = await this.memberGameService.getLevels(req.member.id);
    return {
      message: 'Berhasil memuat daftar level game',
      data,
    };
  }

  @Get('levels/:level/missions')
  @Header('Cache-Control', 'private, no-cache')
  @ApiOperation({
    summary: 'Daftar misi dalam 1 level tertentu beserta status unlock member',
  })
  @ApiResponse({ status: 200, description: 'Berhasil memuat daftar misi level' })
  async getLevelMissions(
    @Req() req: MemberRequest,
    @Param() param: LevelNumberParamDto,
  ): Promise<GlobalResponse<MemberGameItem[]>> {
    const data = await this.memberGameService.getLevelMissions(
      req.member.id,
      param.level,
    );
    return {
      message: `Berhasil memuat daftar misi Level ${param.level}`,
      data,
    };
  }

  @Get('detail/:gameKey')
  @Header('Cache-Control', 'private, no-cache')
  @ApiOperation({
    summary: 'Detail lengkap 1 game/misi beserta seluruh urutan step-nya',
  })
  @ApiResponse({ status: 200, description: 'Berhasil memuat detail game' })
  async getGameDetail(
    @Req() req: MemberRequest,
    @Param() param: GameKeyParamDto,
  ): Promise<GlobalResponse<MemberGameDetailResponse>> {
    const data = await this.memberGameService.getGameDetail(
      req.member.id,
      param.gameKey,
    );
    return {
      message: 'Berhasil memuat detail game',
      data,
    };
  }

  @Post(':gameKey/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mengirimkan hasil refleksi misi, mendapatkan reward poin XP, dan membuka misi berikutnya',
  })
  @ApiResponse({ status: 200, description: 'Misi berhasil diselesaikan' })
  async submitMission(
    @Req() req: MemberRequest,
    @Param() param: GameKeyParamDto,
    @Body() body: SubmitGameMissionDto,
  ): Promise<GlobalResponse<MemberGameSubmitResponse>> {
    const data = await this.memberGameService.submitMission(
      req.member.id,
      param.gameKey,
      body,
    );
    return {
      message: 'Misi berhasil diselesaikan',
      data,
    };
  }
}

