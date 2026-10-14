import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { QuestService } from './quest.service';
import { QuestDetailInterface, QuestInterface, QuestList } from './interfaces/quest.interface';
import { GlobalResponse } from 'src/interfaces/global.interface';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LeaderboardDTO, SendQuestSharePostDTO, DecreasePointDTO } from './dtos/leaderboard.dto';
import { LeaderboardInterface } from './interfaces/leaderboard.interface';
import { BackupService } from 'src/admin-quest/backup.service';
import { BackupMode, BackupQuestPointDTO, CheckPeriodResetDTO } from 'src/admin-quest/dtos/backup.dto';
import { BackupResultInterface } from 'src/admin-quest/interfaces/backup.interface';

@ApiTags('QUEST')
@ApiBearerAuth('access-token')
@Controller('quest')
export class QuestController {

  // constructor
  constructor(
    private questService: QuestService,
    private backupService: BackupService,
  ) { }

  // get available quest list
  @ApiOperation({ summary: 'Get available quest list' })
  @ApiResponse({
    status: 200, description: 'Available quest list', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Available quest list"
      },
      "data": {
        "total": 12,
        "list": [
          {
            "id": 7,
            "title": "Create your first post",
            "description": "Encourages users to create their first post.",
            "image": "https://yes.sgp1.digitaloceanspaces.com/images/1747880846330-6d142904-aea9-4cf4-97c1-294a5e909568-1624605135-4-cropjpg-optimized.webp",
            "dateStart": "2025-05-01",
            "dateEnd": "2025-06-01"
          },
          {
            "id": 8,
            "title": "Receive a like",
            "description": "Get a like from another user.",
            "image": "https://yes.sgp1.digitaloceanspaces.com/images/1747880846330-6d142904-aea9-4cf4-97c1-294a5e909568-1624605135-4-cropjpg-optimized.webp",
            "dateStart": "2025-05-05",
            "dateEnd": "2025-06-05"
          },
          {
            "id": 9,
            "title": "Send 5 likes",
            "description": "Engage with others by liking their posts.",
            "image": "https://yes.sgp1.digitaloceanspaces.com/images/1747880846330-6d142904-aea9-4cf4-97c1-294a5e909568-1624605135-4-cropjpg-optimized.webp",
            "dateStart": "2025-05-02",
            "dateEnd": "2025-05-30"
          }
        ]
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @Get('available')
  async getAvailableQuestList(): Promise<GlobalResponse<QuestInterface>> {

    // get data
    const data = await this.questService.getAvailableQuestList();

    // return response
    return {
      message: 'Available quest list',
      data: data,
    };
  }

  // get all available quest
  @ApiOperation({ summary: 'Get all available quest' })
  @ApiResponse({
    status: 200, description: 'All available quest', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "All available quest"
      },
      "data": [
        {
          "id": 23,
          "title": "Join 3 Spaces",
          "description": "Be part of different groups.",
          "image": "https://yes.sgp1.digitaloceanspaces.com/images/1747880846330-6d142904-aea9-4cf4-97c1-294a5e909568-1624605135-4-cropjpg-optimized.webp",
          "dateStart": "2025-05-07",
          "dateEnd": "2025-06-07"
        },
        {
          "id": 8,
          "title": "Receive a like",
          "description": "Get a like from another user.",
          "image": "https://yes.sgp1.digitaloceanspaces.com/images/1747880846330-6d142904-aea9-4cf4-97c1-294a5e909568-1624605135-4-cropjpg-optimized.webp",
          "dateStart": "2025-05-05",
          "dateEnd": "2025-06-05"
        },
        {
          "id": 18,
          "title": "Like 10 posts",
          "description": "Support content by liking.",
          "image": "https://yes.sgp1.digitaloceanspaces.com/images/1747880846330-6d142904-aea9-4cf4-97c1-294a5e909568-1624605135-4-cropjpg-optimized.webp",
          "dateStart": "2025-05-04",
          "dateEnd": "2025-06-04"
        },
        {
          "id": 11,
          "title": "Share a post",
          "description": "Try out the share feature.",
          "image": "https://yes.sgp1.digitaloceanspaces.com/images/1747880846330-6d142904-aea9-4cf4-97c1-294a5e909568-1624605135-4-cropjpg-optimized.webp",
          "dateStart": "2025-05-03",
          "dateEnd": "2025-06-03"
        },
        {
          "id": 21,
          "title": "Share 3 posts",
          "description": "Use the share button.",
          "image": "https://yes.sgp1.digitaloceanspaces.com/images/1747880846330-6d142904-aea9-4cf4-97c1-294a5e909568-1624605135-4-cropjpg-optimized.webp",
          "dateStart": "2025-05-03",
          "dateEnd": "2025-06-03"
        },
        {
          "id": 26,
          "title": "Post 3 videos",
          "description": "Use video in your posts.",
          "image": "https://yes.sgp1.digitaloceanspaces.com/images/1747880846330-6d142904-aea9-4cf4-97c1-294a5e909568-1624605135-4-cropjpg-optimized.webp",
          "dateStart": "2025-05-03",
          "dateEnd": "2025-06-03"
        },
        {
          "id": 7,
          "title": "Create your first post",
          "description": "Encourages users to create their first post.",
          "image": "https://yes.sgp1.digitaloceanspaces.com/images/1747880846330-6d142904-aea9-4cf4-97c1-294a5e909568-1624605135-4-cropjpg-optimized.webp",
          "dateStart": "2025-05-01",
          "dateEnd": "2025-06-01"
        },
        {
          "id": 13,
          "title": "Complete your profile",
          "description": "Fill in your profile information.",
          "image": "https://yes.sgp1.digitaloceanspaces.com/images/1747880846330-6d142904-aea9-4cf4-97c1-294a5e909568-1624605135-4-cropjpg-optimized.webp",
          "dateStart": "2025-05-01",
          "dateEnd": "2025-06-01"
        },
        {
          "id": 16,
          "title": "React to a post",
          "description": "Try reacting to posts.",
          "image": "https://yes.sgp1.digitaloceanspaces.com/images/1747880846330-6d142904-aea9-4cf4-97c1-294a5e909568-1624605135-4-cropjpg-optimized.webp",
          "dateStart": "2025-05-01",
          "dateEnd": "2025-06-01"
        },
        {
          "id": 9,
          "title": "Send 5 likes",
          "description": "Engage with others by liking their posts.",
          "image": "https://yes.sgp1.digitaloceanspaces.com/images/1747880846330-6d142904-aea9-4cf4-97c1-294a5e909568-1624605135-4-cropjpg-optimized.webp",
          "dateStart": "2025-05-02",
          "dateEnd": "2025-05-30"
        },
        {
          "id": 19,
          "title": "Receive 3 likes",
          "description": "Your post should attract likes.",
          "image": "https://yes.sgp1.digitaloceanspaces.com/images/1747880846330-6d142904-aea9-4cf4-97c1-294a5e909568-1624605135-4-cropjpg-optimized.webp",
          "dateStart": "2025-05-01",
          "dateEnd": "2025-05-30"
        },
        {
          "id": 24,
          "title": "View 50 posts",
          "description": "Spend time on the feed.",
          "image": "https://yes.sgp1.digitaloceanspaces.com/images/1747880846330-6d142904-aea9-4cf4-97c1-294a5e909568-1624605135-4-cropjpg-optimized.webp",
          "dateStart": "2025-05-01",
          "dateEnd": "2025-05-25"
        }
      ]
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @Get('available-all')
  async getAllAvailableQuest(): Promise<GlobalResponse<QuestInterface>> {

    // get data
    const data = await this.questService.getAllAvailableQuest();

    // return response
    return {
      message: 'All available quest',
      data: {
        total: data.length,
        list: data,
      }
    };
  }

  // detail quest
  @ApiOperation({ summary: 'Get detail quest' })
  @ApiResponse({ status: 200, description: 'Detail quest' })
  @Get('detail/:id')
  async getDetailQuest(@Param('id') id: number): Promise<GlobalResponse<QuestDetailInterface>> {
    // get data
    const data = await this.questService.getQuestById(id);

    // return response
    return {
      message: 'Detail quest',
      data: data,
    };
  }


  // leaderboard
  @ApiOperation({ summary: 'Get leaderboard' })
  @ApiResponse({
    status: 200, description: 'Leaderboard', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Leaderboard"
      },
      "data": {
        "data": [
          {
            "id": 1,
            "name": "RUSLI DG NAI",
            "point": 20,
            "is_owner": false
          },
          {
            "id": 2,
            "name": "Yudi Sugiharto",
            "point": 20,
            "is_owner": false
          },
          {
            "id": 3,
            "name": "Abid Putra",
            "point": 4,
            "is_owner": true
          }
        ],
        "total": 3,
        "page": 1,
        "limit": 10
      }
    }
  })
  @Get('leaderboard')
  async getLeaderboard(@Query() dto: LeaderboardDTO, @Req() req): Promise<GlobalResponse<LeaderboardInterface>> {
    // get data
    let { id: user_id } = req['userData']
    const data = await this.questService.getLeaderboard(dto, user_id);

    // return response
    return {
      message: 'Leaderboard',
      data: data,
    };
  }


  // point member
  @ApiOperation({ summary: 'Get point member' })
  @ApiResponse({
    status: 200, description: 'Point member', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Point member"
      },
      "data": {
        "rank": 1,
        "point": 100,
        "finish": 10
      }
    }
  })
  @Get('point-member')
  async getPointMember(@Req() req): Promise<GlobalResponse<{ name: string, rank: number, point: number, finish: number }>> {
    // get data
    let user = req['userData']
    const data = await this.questService.pointMember(user.id, user.name);

    // return response
    return {
      message: 'Point member',
      data: data,
    };
  }

  // send quest share post
  @Post('share-post')
  @ApiOperation({ summary: 'Send quest share post' })
  @ApiResponse({
    status: 200, description: 'Send quest share post', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Send quest share post"
      },
      "data": true
    }
  })
  async sendQuestSharePost(@Req() req, @Body() dto: SendQuestSharePostDTO): Promise<GlobalResponse<boolean>> {
    // get data
    let user = req['userData']
    const data = await this.questService.sendQuestSharePost(user.id, dto.postId);

    // return response
    return {
      message: 'Send quest share post',
      data: data,
    };
  }

  @Post('complete-profile')
  @ApiOperation({ summary: 'Send quest complete profile' })
  @ApiResponse({ status: 200, description: 'Send quest complete profile' })
  async sendQuestCompleteProfile(@Req() req): Promise<GlobalResponse<boolean>> {

    // get user IDs with complete profile
    const members = await this.questService.collectUsers(); // number[]

    for (const userId of members) {
      await this.questService.sendQuestCompleteProfile(userId);
    }

    return {
      message: 'Send quest complete profile',
      data: true,
    };
  }

  // decrease point
  @Post('decrease-point')
  @ApiOperation({ summary: 'Decrease point for member' })
  @ApiResponse({
    status: 200, description: 'Point decreased successfully', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Point decreased successfully"
      },
      "data": true
    }
  })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async decreasePoint(@Body() dto: DecreasePointDTO): Promise<GlobalResponse<boolean>> {
    // decrease point
    const data = await this.questService.decreasePoint(dto.email, dto.points, dto.reason);

    // return response
    return {
      message: 'Point decreased successfully',
      data: data,
    };
  }



}