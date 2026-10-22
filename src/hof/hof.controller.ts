import { GetRealtimeHofDto } from './dtos/get-realtime-hof.dto';
import {
  Controller,
  Get,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GlobalResponse } from 'src/interfaces/global.interface';
import { GetHofDto } from './dtos/get-hof.dto';
import { GetWinnerPositionDto } from './dtos/get-winner-position.dto';
import {
  HofListItemInterface,
  HofWinnerPositionsInterface,
} from './interfaces/hof.interface';
import { HofService } from './hof.service';

@ApiTags('HOF')
@Controller('hof')
export class HofController {
  constructor(private readonly hofService: HofService) {}

  @Get('/')
  @ApiOperation({ summary: 'Get public HOF list' })
  @ApiResponse({
    status: 200,
    description: 'HOF list successfully retrieved',
    example: {
      message: 'HOF list retrieved successfully',
      data: [
        {
          fullname: 'Budi Santoso',
          photo: 'https://yes.sgp1.digitaloceanspaces.com/images/...',
          point: 2500,
          position: 1,
        },
      ],
    },
  })
  async getHofList(
    @Query() dto: GetHofDto,
  ): Promise<GlobalResponse<HofListItemInterface[]>> {
    const data = await this.hofService.getHofList(dto);
    return {
      message: 'HOF list retrieved successfully',
      data,
    };
  }

  @Get('list')
  @ApiOperation({ summary: 'Get public HOF list (alias)' })
  @ApiResponse({
    status: 200,
    description: 'HOF list successfully retrieved',
  })
  async getHofListAlias(
    @Query() dto: GetHofDto,
  ): Promise<GlobalResponse<HofListItemInterface[]>> {
    const data = await this.hofService.getHofList(dto);
    return {
      message: 'HOF list retrieved successfully',
      data,
    };
  }

  @Get('most-exist')
  @ApiOperation({ summary: 'Get top most exist HOF winners (Paling Eksis)' })
  @ApiResponse({ status: 200, description: 'Success' })
  async getMostExistWinners(
    @Query() dto: GetHofDto,
  ): Promise<GlobalResponse<HofListItemInterface[]>> {
    const data = await this.hofService.getHofList({
      ...dto,
      category: 'Paling Eksis',
    });
    return {
      message: 'Most exist HOF winners retrieved successfully',
      data,
    };
  }

  @Get('best-newcomer')
  @ApiOperation({
    summary: 'Get top best newcomer HOF winners (Pendatang Terbaik)',
  })
  @ApiResponse({ status: 200, description: 'Success' })
  async getBestNewcomerWinners(
    @Query() dto: GetHofDto,
  ): Promise<GlobalResponse<HofListItemInterface[]>> {
    const data = await this.hofService.getHofList({
      ...dto,
      category: 'Pendatang Terbaik',
    });
    return {
      message: 'Best newcomer HOF winners retrieved successfully',
      data,
    };
  }

  @Get('tampil-kembali')
  @ApiOperation({ summary: 'Get top tampil kembali HOF winners' })
  @ApiResponse({ status: 200, description: 'Success' })
  async getTampilKembaliWinners(
    @Query() dto: GetHofDto,
  ): Promise<GlobalResponse<HofListItemInterface[]>> {
    const data = await this.hofService.getHofList({
      ...dto,
      category: 'Tampil kembali',
    });
    return {
      message: 'Tampil kembali HOF winners retrieved successfully',
      data,
    };
  }

  @Get('realtime/public')
  @ApiOperation({ summary: 'Public current-month top 5; no personal ranking' })
  async getRealtimePublic(@Query() dto: GetRealtimeHofDto) {
    const data = await this.hofService.getRealtime(0, dto.category);
    return {
      message: 'Leaderboard retrieved successfully',
      data: { ...data, me: null },
    };
  }

  @Get('realtime')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Current UTC month: top 5 and logged-in member position',
  })
  async getRealtime(@Req() request: any, @Query() dto: GetRealtimeHofDto) {
    const userId = request.userData?.id;
    if (!userId) throw new UnauthorizedException('Missing or invalid token');
    return {
      message: 'Leaderboard retrieved successfully',
      data: await this.hofService.getRealtime(userId, dto.category),
    };
  }

  @Get('winner-position')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get winner position for each category for logged-in user',
  })
  @ApiQuery({
    name: 'token',
    required: false,
    description:
      'Bearer access token (optional alternative to Authorization header)',
  })
  @ApiResponse({
    status: 200,
    description: 'Winner position successfully retrieved',
    example: {
      message: 'Winner position retrieved successfully',
      data: {
        'pendatang-terbaik': 3,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getWinnerPosition(
    @Req() request: any,
    @Query() dto: GetWinnerPositionDto,
  ): Promise<GlobalResponse<HofWinnerPositionsInterface>> {
    const userId = request.userData?.id;
    if (!userId) {
      throw new UnauthorizedException('Missing or invalid token');
    }
    const data = await this.hofService.getWinnerPositionByUserId(userId, dto);
    return {
      message: 'Winner position retrieved successfully',
      data,
    };
  }
}
