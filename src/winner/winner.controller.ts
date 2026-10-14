import { Controller, Get, Param, ParseIntPipe, Query, Req, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GlobalResponse } from 'src/interfaces/global.interface';
import { SettingEntity } from 'src/entity/setting.entity';
import { AdminSettingService } from 'src/admin-setting/admin-setting.service';
import { GetWinnerDto } from './dtos/get-winner.dto';
import { CheckWinnerCategoriesDto } from './dtos/check-winner-categories.dto';
import {
  WinnerListItemInterface,
  WinnerCategoryCheckInterface,
} from './interfaces/winner.interface';
import { WinnerService } from './winner.service';

@ApiTags('WINNER')
@Controller('winner')
export class WinnerController {
  constructor(
    private readonly winnerService: WinnerService,
    private readonly adminSettingService: AdminSettingService,
  ) { }

  @Get('/')
  @ApiOperation({ summary: 'Get public winner list' })
  @ApiResponse({
    status: 200,
    description: 'Winner list successfully retrieved',
    example: {
      message: 'Winner list retrieved successfully',
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
  async getWinnerList(
    @Query() dto: GetWinnerDto,
  ): Promise<GlobalResponse<WinnerListItemInterface[]>> {
    const data = await this.winnerService.getWinnerList(dto);
    return {
      message: 'Winner list retrieved successfully',
      data,
    };
  }

  @Get('list')
  @ApiOperation({ summary: 'Get public winner list (alias)' })
  @ApiResponse({
    status: 200,
    description: 'Winner list successfully retrieved',
  })
  async getWinnerListAlias(
    @Query() dto: GetWinnerDto,
  ): Promise<GlobalResponse<WinnerListItemInterface[]>> {
    const data = await this.winnerService.getWinnerList(dto);
    return {
      message: 'Winner list retrieved successfully',
      data,
    };
  }

  @Get('most-exist')
  @ApiOperation({ summary: 'Get top most exist winners (Paling Eksis)' })
  @ApiResponse({ status: 200, description: 'Success' })
  async getMostExistWinners(
    @Query() dto: GetWinnerDto,
  ): Promise<GlobalResponse<WinnerListItemInterface[]>> {
    const data = await this.winnerService.getWinnerList({
      ...dto,
      category: 'Paling Eksis',
    });
    return {
      message: 'Most exist winners retrieved successfully',
      data,
    };
  }

  @Get('best-newcomer')
  @ApiOperation({ summary: 'Get top best newcomer winners (Pendatang Terbaik)' })
  @ApiResponse({ status: 200, description: 'Success' })
  async getBestNewcomerWinners(
    @Query() dto: GetWinnerDto,
  ): Promise<GlobalResponse<WinnerListItemInterface[]>> {
    const data = await this.winnerService.getWinnerList({
      ...dto,
      category: 'Pendatang Terbaik',
    });
    return {
      message: 'Best newcomer winners retrieved successfully',
      data,
    };
  }

  @Get('tampil-kembali')
  @ApiOperation({ summary: 'Get top tampil kembali winners' })
  @ApiResponse({ status: 200, description: 'Success' })
  async getTampilKembaliWinners(
    @Query() dto: GetWinnerDto,
  ): Promise<GlobalResponse<WinnerListItemInterface[]>> {
    const data = await this.winnerService.getWinnerList({
      ...dto,
      category: 'Tampil kembali',
    });
    return {
      message: 'Tampil kembali winners retrieved successfully',
      data,
    };
  }

  @Get('cerita-terbaik')
  @ApiOperation({ summary: 'Get top cerita terbaik winners' })
  @ApiResponse({ status: 200, description: 'Success' })
  async getCeritaTerbaikWinners(
    @Query() dto: GetWinnerDto,
  ): Promise<GlobalResponse<WinnerListItemInterface[]>> {
    const data = await this.winnerService.getWinnerList({
      ...dto,
      category: 'Cerita Terbaik',
    });
    return {
      message: 'Cerita terbaik winners retrieved successfully',
      data,
    };
  }

  @Get('check-categories')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Check if logged-in user already won in 5 categories for all time' })
  @ApiQuery({ name: 'token', required: false, description: 'Bearer access token (optional alternative to Authorization header)' })
  @ApiResponse({
    status: 200,
    description: 'Winner category status successfully retrieved',
    example: {
      message: 'Winner category status retrieved successfully',
      data: {
        'paling-eksis': 1,
        'pendatang-terbaik': 0,
        'tampil-kembali': 0,
        'komen-terbaik': 0,
        'cerita-terbaik': 0,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async checkWinnerCategories(
    @Req() request: any,
    @Query() dto: CheckWinnerCategoriesDto,
  ): Promise<GlobalResponse<WinnerCategoryCheckInterface>> {
    let userId = request.userData?.id;
    if (!userId) {
      const rawToken = (dto?.token || request.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
      if (rawToken) {
        try {
          const payload = JSON.parse(Buffer.from(rawToken.split('.')[1], 'base64').toString('utf8'));
          userId = payload?.id;
        } catch (_) {}
      }
    }
    if (!userId) {
      throw new UnauthorizedException('Missing or invalid token');
    }
    const data = await this.winnerService.checkWinnerCategoriesByUserId(userId);
    return {
      message: 'Winner category status retrieved successfully',
      data,
    };
  }

  @Get('check-categories/:userId')
  @ApiOperation({ summary: 'Check if user already won in 5 categories by user ID for all time' })
  @ApiParam({ name: 'userId', type: Number, description: 'User / Member ID' })
  @ApiResponse({
    status: 200,
    description: 'Winner category status successfully retrieved',
    example: {
      message: 'Winner category status retrieved successfully',
      data: {
        'paling-eksis': 1,
        'pendatang-terbaik': 0,
        'tampil-kembali': 0,
        'komen-terbaik': 0,
        'cerita-terbaik': 0,
      },
    },
  })
  async checkWinnerCategoriesByUserId(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<GlobalResponse<WinnerCategoryCheckInterface>> {
    const data = await this.winnerService.checkWinnerCategoriesByUserId(userId);
    return {
      message: 'Winner category status retrieved successfully',
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
}
