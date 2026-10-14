import { Controller, Post, Body, Req, Get, Param, Query, Delete } from '@nestjs/common';
import { AdminQuestService } from './admin-quest.service';
import { HistoryService } from './history.service';
import { MemberPointService } from './member-point.service';
import { BackupService } from './backup.service';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { QuestInterface } from './interfaces/quest.interface';
import { GlobalResponse } from 'src/interfaces/global.interface';
import { CreatedQuestDto, OnOffStatusQuestDto } from './dtos/quest.dto';
import { HistoryUserDto } from './dtos/history-user.dto';
import { HistoryUserResponseInterface } from './interfaces/history-user.interface';
import { PointUserDto } from './dtos/point-user.dto';
import { PointUserResponseInterface } from './interfaces/point-user.interface';
import { BackupMode, BackupQuestPointDTO, CheckPeriodResetDTO } from './dtos/backup.dto';
import { BackupResultInterface } from './interfaces/backup.interface';
import { LogResetDto } from './dtos/log-reset.dto';
import { LogResetResponseInterface } from './interfaces/log-reset.interface';
import { QuestConfigService } from './quest-config.service';
import {
  QuestListFilterDto,
  CreateQuestConfigDto,
  UpdateQuestConfigDto,
  ToggleStatusQuestConfigDto,
} from './dtos/quest-config.dto';
import {
  QuestConfigItemInterface,
  QuestConfigListResponseInterface,
} from './interfaces/quest-config.interface';

import { WinnerSetService } from './winner-set.service';
import { CampaignWinnerService } from './campaign-winner.service';
import { GetMostExistUserDto } from './dtos/most-exist.dto';
import { GetBestNewcomerDto } from './dtos/best-newcomer.dto';
import { GetTampilKembaliDto } from './dtos/tampil-kembali.dto';
import { SaveManualWinnerDto } from './dtos/save-manual-winner.dto';
import { UpdateWinnerPositionDto } from './dtos/update-winner-position.dto';
import { DeleteWinnerDto } from './dtos/delete-winner.dto';
import { GetWinnerDto } from 'src/winner/dtos/get-winner.dto';
import { WinnerListItemInterface } from 'src/winner/interfaces/winner.interface';

@Controller('admin-quest')
@ApiTags('ADMIN-QUEST')
@ApiBearerAuth('access-token')
export class AdminQuestController {

  constructor(
    private readonly adminQuestService: AdminQuestService,
    private readonly historyService: HistoryService,
    private readonly memberPointService: MemberPointService,
    private readonly backupService: BackupService,
    private readonly questConfigService: QuestConfigService,
    private readonly winnerSetService: WinnerSetService,
    private readonly campaignWinnerService: CampaignWinnerService,
  ) { }

  // @Post('create')
  // @ApiOperation({ summary: 'Create quest' })
  // @ApiResponse({ status: 201, description: 'Quest created successfully'})
  // @ApiResponse({ status: 403, description: 'Sample error message', example : {
  //     "success": false,
  //     "alert": {
  //       "code": 404,
  //       "message": "Post not found"
  //     },  
  //     "data": null
  // }})
  // async createQuest(@Body() quest: CreatedQuestDto, @Req() request): Promise<GlobalResponse<QuestInterface>> {

  //     const {id:userId} = request.userData
  //     const result = await this.adminQuestService.createQuest(quest, userId);
  //     return {
  //         message: 'Quest created successfully',
  //         data: result
  //     }
  // }

  // get all quest
  @Get('list')
  @ApiOperation({ summary: 'Get all quest' })
  @ApiResponse({
    status: 200, description: 'Success', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success"
      },
      "data": [
        {
          "id": 1,
          "title": "Create Post",
          "point": 20,
          "status": 1
        },
        {
          "id": 2,
          "title": "Like",
          "point": 2,
          "status": 1
        },
        {
          "id": 3,
          "title": "Comment",
          "point": 4,
          "status": 1
        },
        {
          "id": 4,
          "title": "Share Post",
          "point": 5,
          "status": 1
        },
        {
          "id": 5,
          "title": "Receiver Follower",
          "point": 0,
          "status": 0
        },
        {
          "id": 6,
          "title": "Send Following",
          "point": 0,
          "status": 0
        },
        {
          "id": 7,
          "title": "Complete Mimate Profile",
          "point": 0,
          "status": 0
        },
        {
          "id": 10,
          "title": "Quest 3",
          "point": 12,
          "status": 0
        },
        {
          "id": 17,
          "title": "Quest 10",
          "point": 14,
          "status": 1
        }
      ]
    }
  })
  @ApiResponse({
    status: 400, description: 'Bad Request', example: {
      "success": false,
      "alert": {
        "code": 400,
        "message": "Bad Request"
      },
      "data": {}
    }
  })
  async getAllQuest(): Promise<GlobalResponse<QuestInterface[]>> {
    const data = await this.adminQuestService.getAllQuest();
    return {
      message: 'Success',
      data: data,
    }
  }

  // on off status quest
  @Post('on-off-status')
  @ApiOperation({ summary: 'On off status quest' })
  @ApiResponse({ status: 200, description: 'Success', example: {} })
  @ApiResponse({
    status: 400, description: 'Bad Request', example: {
      "success": false,
      "alert": {
        "code": 400,
        "message": "Bad Request"
      },
      "data": {}
    }
  })
  async onOffStatusQuest(@Body() dto: OnOffStatusQuestDto): Promise<GlobalResponse<boolean>> {
    const data = await this.adminQuestService.onOffStatusQuest(dto.id, dto.status);
    return {
      message: 'Success',
      data: data,
    }
  }


  @Post('history-user')
  @ApiOperation({ summary: 'Point member campaign history' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({
    status: 400, description: 'Bad Request', example: {
      "success": false,
      "alert": {
        "code": 400,
        "message": "Bad Request"
      },
      "data": {}
    }
  })
  async HistoryUser(@Body() dto: HistoryUserDto): Promise<GlobalResponse<HistoryUserResponseInterface>> {
    const data = await this.historyService.getHistoryUser(dto);
    return {
      message: 'Success',
      data: data,
    };
  }


  @Post('point-user')
  @ApiOperation({ summary: 'Point member datatable list' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({
    status: 400, description: 'Bad Request', example: {
      "success": false,
      "alert": {
        "code": 400,
        "message": "Bad Request"
      },
      "data": {}
    }
  })
  async PointUser(@Body() dto: PointUserDto): Promise<GlobalResponse<PointUserResponseInterface>> {
    const data = await this.memberPointService.getPointUser(dto);
    return {
      message: 'Success',
      data: data,
    };
  }

  @Post('backup-points')
  @ApiOperation({ summary: 'Backup all quest points to quest_backup table' })
  @ApiResponse({
    status: 200,
    description: 'Quest points backed up successfully',
  })
  async backupQuestPoints(@Body() dto?: BackupQuestPointDTO): Promise<GlobalResponse<BackupResultInterface>> {
    const { year, month } = dto || {};
    const data = await this.backupService.backupDataAllMemberDetailed(year, month, BackupMode.BACKUP);
    return {
      message: 'Quest points backed up successfully',
      data,
    };
  }

  @Post('reset-points')
  @ApiOperation({ summary: 'Reset all member quest points to 0' })
  @ApiResponse({
    status: 200,
    description: 'All member quest points reset successfully',
  })
  async resetAllPoint(@Body() dto?: CheckPeriodResetDTO): Promise<GlobalResponse<boolean>> {
    const { year, month } = dto || {};
    const data = await this.backupService.resetAllPoint(year, month);
    return {
      message: 'All member quest points reset successfully',
      data,
    };
  }

  @Post('reset-point')
  @ApiOperation({ summary: 'Reset all member quest points to 0 (alias)' })
  @ApiResponse({
    status: 200,
    description: 'All member quest points reset successfully',
  })
  async resetPointAlias(@Body() dto?: CheckPeriodResetDTO): Promise<GlobalResponse<boolean>> {
    return this.resetAllPoint(dto);
  }

  @Get('log-reset/:memberId')
  @ApiOperation({ summary: 'Get log reset history by member id' })
  @ApiResponse({ status: 200, description: 'Success' })
  async getLogReset(
    @Param('memberId') memberId: number,
    @Query() dto?: LogResetDto,
  ): Promise<GlobalResponse<LogResetResponseInterface>> {
    const data = await this.backupService.getLogResetHistory(Number(memberId), dto);
    return {
      message: 'Success',
      data,
    };
  }

  @Post('log-reset/:memberId')
  @ApiOperation({ summary: 'Get log reset history by member id (POST)' })
  @ApiResponse({ status: 200, description: 'Success' })
  async postLogReset(
    @Param('memberId') memberId: number,
    @Body() dto?: LogResetDto,
  ): Promise<GlobalResponse<LogResetResponseInterface>> {
    const data = await this.backupService.getLogResetHistory(Number(memberId), dto);
    return {
      message: 'Success',
      data,
    };
  }

  // ==========================================
  // Quest Configuration CRUD Endpoints
  // ==========================================

  @Post('config/list')
  @ApiOperation({ summary: 'Get quest list with datatable pagination, filters, and sorting' })
  @ApiResponse({ status: 200, description: 'Success' })
  async getQuestConfigList(
    @Body() dto: QuestListFilterDto,
  ): Promise<GlobalResponse<QuestConfigListResponseInterface>> {
    const data = await this.questConfigService.getQuestList(dto);
    return {
      message: 'Success',
      data,
    };
  }

  @Get('config/:id')
  @ApiOperation({ summary: 'Get quest details by ID' })
  @ApiResponse({ status: 200, description: 'Success' })
  async getQuestConfigById(
    @Param('id') id: number,
  ): Promise<GlobalResponse<QuestConfigItemInterface>> {
    const data = await this.questConfigService.getQuestById(Number(id));
    return {
      message: 'Success',
      data,
    };
  }

  @Post('config/create')
  @ApiOperation({ summary: 'Create new quest configuration' })
  @ApiResponse({ status: 201, description: 'Quest created successfully' })
  async createQuestConfig(
    @Body() dto: CreateQuestConfigDto,
  ): Promise<GlobalResponse<QuestConfigItemInterface>> {
    const data = await this.questConfigService.createQuest(dto);
    return {
      message: 'Quest created successfully',
      data,
    };
  }

  @Post('config/update/:id')
  @ApiOperation({ summary: 'Update quest configuration by ID' })
  @ApiResponse({ status: 200, description: 'Quest updated successfully' })
  async updateQuestConfig(
    @Param('id') id: number,
    @Body() dto: UpdateQuestConfigDto,
  ): Promise<GlobalResponse<QuestConfigItemInterface>> {
    const data = await this.questConfigService.updateQuest(Number(id), dto);
    return {
      message: 'Quest updated successfully',
      data,
    };
  }

  @Post('config/delete/:id')
  @ApiOperation({ summary: 'Delete quest configuration by ID' })
  @ApiResponse({ status: 200, description: 'Quest deleted successfully' })
  async deleteQuestConfig(
    @Param('id') id: number,
  ): Promise<GlobalResponse<boolean>> {
    const data = await this.questConfigService.deleteQuest(Number(id));
    return {
      message: 'Quest deleted successfully',
      data,
    };
  }

  @Post('config/toggle-status')
  @ApiOperation({ summary: 'Toggle quest active/inactive status' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  async toggleStatusQuestConfig(
    @Body() dto: ToggleStatusQuestConfigDto,
  ): Promise<GlobalResponse<boolean>> {
    const data = await this.questConfigService.toggleStatus(dto.id, dto.status);
    return {
      message: 'Status updated successfully',
      data,
    };
  }

  @Post('winner/most-exist')
  @ApiOperation({ summary: 'Get and save top most exist users into HOF list' })
  @ApiResponse({ status: 200, description: 'Success' })
  async getMostExistUsers(
    @Query() queryDto?: GetMostExistUserDto,
    @Body() bodyDto?: GetMostExistUserDto,
  ): Promise<GlobalResponse<boolean>> {
    const dto = { ...queryDto, ...bodyDto };
    const data = await this.winnerSetService.getMostExistUsers(dto);
    return {
      message: data ? 'Successfully saved most exist users to HOF list' : 'Failed to save most exist users',
      data,
    };
  }

  @Post('winner/best-newcomer')
  @ApiOperation({ summary: 'Get and save top best newcomer users into HOF list' })
  @ApiResponse({ status: 200, description: 'Success' })
  async getBestNewcomerUsers(
    @Query() queryDto?: GetBestNewcomerDto,
    @Body() bodyDto?: GetBestNewcomerDto,
  ): Promise<GlobalResponse<boolean>> {
    const dto = { ...queryDto, ...bodyDto };
    const data = await this.winnerSetService.getBestNewcomerUsers(dto);
    return {
      message: data ? 'Successfully saved best newcomer users to HOF list' : 'Failed to save best newcomer users',
      data,
    };
  }

  @Post('winner/tampil-kembali')
  @ApiOperation({ summary: 'Get and save top tampil kembali users into HOF list' })
  @ApiResponse({ status: 200, description: 'Success' })
  async getTampilKembaliUsers(
    @Query() queryDto?: GetTampilKembaliDto,
    @Body() bodyDto?: GetTampilKembaliDto,
  ): Promise<GlobalResponse<boolean>> {
    const dto = { ...queryDto, ...bodyDto };
    const data = await this.winnerSetService.getTampilKembaliUsers(dto);
    return {
      message: data ? 'Successfully saved tampil kembali users to HOF list' : 'Failed to save tampil kembali users',
      data,
    };
  }

  @Post('winner/save-manual')
  @ApiOperation({ summary: 'Manually save a winner into campaign winner list' })
  @ApiResponse({ status: 200, description: 'Success' })
  async saveManual(
    @Body() dto: SaveManualWinnerDto,
  ): Promise<GlobalResponse<boolean>> {
    const data = await this.campaignWinnerService.saveManual(dto);
    return {
      message: data ? 'Winner successfully saved into campaign winner list' : 'Failed to save winner into campaign winner list',
      data,
    };
  }

  @Post('winner/update-position')
  @ApiOperation({ summary: 'Update position/rank of a winner in campaign winner list' })
  @ApiResponse({ status: 200, description: 'Position updated successfully' })
  async updateWinnerPosition(
    @Body() dto: UpdateWinnerPositionDto,
  ): Promise<GlobalResponse<boolean>> {
    const data = await this.campaignWinnerService.updateWinnerPosition(dto.id, dto.position);
    return {
      message: data ? 'Winner position updated successfully' : 'Failed to update winner position',
      data,
    };
  }

  @Delete('winner/:id')
  @ApiOperation({ summary: 'Delete a winner from campaign winner list by ID' })
  @ApiResponse({ status: 200, description: 'Winner deleted successfully' })
  async deleteWinner(
    @Param('id') id: number,
  ): Promise<GlobalResponse<boolean>> {
    const data = await this.campaignWinnerService.deleteWinner(Number(id));
    return {
      message: data ? 'Winner deleted successfully' : 'Failed to delete winner',
      data,
    };
  }

  @Get('winner/list')
  @ApiOperation({ summary: 'Get campaign winner list' })
  @ApiResponse({ status: 200, description: 'Success' })
  async getWinnerList(
    @Query() dto: GetWinnerDto,
  ): Promise<GlobalResponse<WinnerListItemInterface[]>> {
    const data = await this.campaignWinnerService.getWinnerList(dto);
    return {
      message: 'Campaign winner list retrieved successfully',
      data,
    };
  }

  @Get('winner')
  @ApiOperation({ summary: 'Get campaign winner list (alias)' })
  @ApiResponse({ status: 200, description: 'Success' })
  async getWinnerListAlias(
    @Query() dto: GetWinnerDto,
  ): Promise<GlobalResponse<WinnerListItemInterface[]>> {
    const data = await this.campaignWinnerService.getWinnerList(dto);
    return {
      message: 'Campaign winner list retrieved successfully',
      data,
    };
  }

}