import { Body, Controller, Delete, Get, Param, Post, Put, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminUserService } from './admin-user.service';
import { AdminUserListDto, AdminUserExportDto, AdminUserAnalyticsDto, AdminUserSuspendDto, AdminUserUpdateDto, AdminUserAuditListDto, AdminUserUpdateQuizWinnerDto, AdminUserQuestDetailDto } from './dtos/admin-user.dto';
import { GlobalResponse } from 'src/interfaces/global.interface';
import { Datatable, DataUser } from './interfaces/datatable.interface';
import { AdminAuditListDto } from 'src/admin-post/dtos/admin-post.dto';
import { DeductPointDto } from './dtos/deduct-point.dto';
@Controller('admin-user')
@ApiTags('ADMIN USER')
@ApiBearerAuth('access-token')
export class AdminUserController {

  constructor(
    private readonly adminUserService: AdminUserService
  ) { }

  @Get('list')
  @ApiOperation({ summary: 'Get user list' })
  @ApiResponse({
    status: 200, description: 'Success', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success"
      },
      "data": {
        "items": [
          {
            "id": 1,
            "name": "okto Dian putra sirait",
            "email": "oktosirait2076@gmail.com",
            "createdAt": "2025-03-04T02:35:49.000Z",
            "updatedAt": "2025-03-04T02:35:49.000Z",
            "username": "okto Dian putra sirait",
            "status": "VERIFIED",
            "siteRole": "Member",
            "vehicleList": "",
            "dob": "",
            "gender": "",
            "mimatePoint": 0,
            "posts": 0,
            "comments": 0,
            "likes": 0,
            "shares": 0,
            "quizWinner": false
          },
          {
            "id": 2,
            "name": "Nurafni Panjaitan",
            "email": "nurafnie1987@gmail.com",
            "createdAt": "2025-03-04T02:27:48.000Z",
            "updatedAt": "2025-03-04T02:27:48.000Z",
            "username": "Nurafni Panjaitan",
            "status": "VERIFIED",
            "siteRole": "Member",
            "vehicleList": "",
            "dob": "",
            "gender": "",
            "mimatePoint": 0,
            "posts": 0,
            "comments": 0,
            "likes": 0,
            "shares": 0,
            "quizWinner": false
          },
          {
            "id": 3,
            "name": "achmad ichwan yasir",
            "email": "ichwan.achmad.yasir@gmail.com",
            "createdAt": "2025-03-04T02:18:42.000Z",
            "updatedAt": "2025-03-04T02:19:02.000Z",
            "username": "achmad ichwan yasir",
            "status": "VERIFIED",
            "siteRole": "Member",
            "vehicleList": "",
            "dob": "",
            "gender": "",
            "mimatePoint": 0,
            "posts": 0,
            "comments": 0,
            "likes": 0,
            "shares": 0,
            "quizWinner": false
          },
          {
            "id": 4,
            "name": "Hasanudin",
            "email": "hasanarang60@gmail.com",
            "createdAt": "2025-03-04T02:17:11.000Z",
            "updatedAt": "2025-03-04T02:17:33.000Z",
            "username": "Hasanudin",
            "status": "VERIFIED",
            "siteRole": "Member",
            "vehicleList": "",
            "dob": "",
            "gender": "",
            "mimatePoint": 0,
            "posts": 0,
            "comments": 0,
            "likes": 0,
            "shares": 0,
            "quizWinner": false
          },
          {
            "id": 5,
            "name": "johan chialis",
            "email": "johanchialis@yahoo.com",
            "createdAt": "2025-03-04T02:16:42.000Z",
            "updatedAt": "2025-03-04T02:16:42.000Z",
            "username": "johan chialis",
            "status": "VERIFIED",
            "siteRole": "Member",
            "vehicleList": "",
            "dob": "",
            "gender": "",
            "mimatePoint": 0,
            "posts": 0,
            "comments": 0,
            "likes": 0,
            "shares": 0,
            "quizWinner": false
          },
          {
            "id": 6,
            "name": "CV BATARA SUMBER MAKMUR",
            "email": "batarasumbermakmur@gmail.com",
            "createdAt": "2025-03-04T02:11:20.000Z",
            "updatedAt": "2025-03-04T02:11:25.000Z",
            "username": "CV BATARA SUMBER MAKMUR",
            "status": "VERIFIED",
            "siteRole": "Member",
            "vehicleList": "",
            "dob": "",
            "gender": "",
            "mimatePoint": 0,
            "posts": 0,
            "comments": 0,
            "likes": 0,
            "shares": 0,
            "quizWinner": false
          },
          {
            "id": 7,
            "name": "Linda Fatmawati",
            "email": "holili21222@gmail.com",
            "createdAt": "2025-03-04T02:03:49.000Z",
            "updatedAt": "2025-03-04T02:03:57.000Z",
            "username": "Linda Fatmawati",
            "status": "VERIFIED",
            "siteRole": "Member",
            "vehicleList": "",
            "dob": "",
            "gender": "",
            "mimatePoint": 0,
            "posts": 0,
            "comments": 0,
            "likes": 0,
            "shares": 0,
            "quizWinner": false
          },
          {
            "id": 8,
            "name": "Agung Prakoso",
            "email": "amprakoso@gmail.com",
            "createdAt": "2025-03-04T01:57:00.000Z",
            "updatedAt": "2025-03-04T01:57:10.000Z",
            "username": "Agung Prakoso",
            "status": "VERIFIED",
            "siteRole": "Member",
            "vehicleList": "",
            "dob": "",
            "gender": "",
            "mimatePoint": 0,
            "posts": 0,
            "comments": 0,
            "likes": 0,
            "shares": 0,
            "quizWinner": false
          },
          {
            "id": 9,
            "name": "Sri muliati",
            "email": "srimuliati47@gmail.com",
            "createdAt": "2025-03-04T01:54:20.000Z",
            "updatedAt": "2025-03-04T01:54:25.000Z",
            "username": "Sri muliati",
            "status": "VERIFIED",
            "siteRole": "Member",
            "vehicleList": "",
            "dob": "",
            "gender": "",
            "mimatePoint": 0,
            "posts": 0,
            "comments": 0,
            "likes": 0,
            "shares": 0,
            "quizWinner": false
          },
          {
            "id": 10,
            "name": "Ferry Surya",
            "email": "ferrysurya70@gmail.com",
            "createdAt": "2025-03-04T01:50:14.000Z",
            "updatedAt": "2025-03-04T01:50:14.000Z",
            "username": "Ferry Surya",
            "status": "VERIFIED",
            "siteRole": "Member",
            "vehicleList": "",
            "dob": "",
            "gender": "",
            "mimatePoint": 0,
            "posts": 0,
            "comments": 0,
            "likes": 0,
            "shares": 0,
            "quizWinner": false
          }
        ],
        "recordsTotal": 90870,
        "recordsFiltered": 90870
      }
    }
  })
  async getUserList(@Query() adminUserListDto: AdminUserListDto): Promise<GlobalResponse<Datatable>> {
    const data = await this.adminUserService.getUserList(adminUserListDto);
    return {
      message: 'Success',
      data: data
    };
  }


  @Get('export')
  @ApiOperation({ summary: 'Export user list as CSV' })
  @ApiResponse({ status: 200, description: 'Success - CSV file download' })
  async exportUserList(@Query() adminUserExportDto: AdminUserExportDto, @Res() res: Response): Promise<void> {
    const { buffer, filename } = await this.adminUserService.exportUserList(adminUserExportDto);

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Get('detail/:id')
  @ApiOperation({ summary: 'Get user detail' })
  @ApiResponse({
    status: 200, description: 'Success', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success"
      },
      "data": {
        "id": 1,
        "name": "okto Dian putra sirait",
        "email": "oktosirait2076@gmail.com",
        "createdAt": "2025-03-04T02:35:49.000Z",
        "updatedAt": "2025-03-04T02:35:49.000Z",
        "username": "okto Dian putra sirait",
        "status": "VERIFIED",
        "siteRole": "Member",
        "vehicleList": "",
        "dob": "",
        "gender": "",
        "mimatePoint": 0,
        "posts": 0,
        "comments": 0,
        "likes": 0,
        "shares": 0,
        "quizWinner": false
      }
    }
  })
  async getUserDetail(@Param('id') id: number): Promise<GlobalResponse<DataUser>> {
    const data = await this.adminUserService.getUserById(id);
    return { message: 'Success', data: data };
  }

  // update user
  @Post('update/:id')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({
    status: 200, description: 'Success', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success"
      },
      "data": {
        "id": 1,
        "name": "okto Dian putra sirait",
        "email": "oktosirait2076@gmail.com",
        "createdAt": "2025-03-04T02:35:49.000Z",
        "updatedAt": "2025-03-04T02:35:49.000Z",
        "username": "okto Dian putra sirait",
        "status": "VERIFIED",
        "siteRole": "Member",
        "vehicleList": "",
        "dob": "",
        "gender": "",
        "mimatePoint": 0,
        "posts": 0,
        "comments": 0,
        "likes": 0,
        "shares": 0,
        "quizWinner": false
      }
    }
  })
  async updateUser(@Param('id') id: number, @Body() adminUserUpdateDto: AdminUserUpdateDto): Promise<GlobalResponse<DataUser>> {
    const data = await this.adminUserService.updateUser(id, adminUserUpdateDto);
    return { message: 'Success', data: data };
  }

  @Get('analytics/:id')
  @ApiOperation({ summary: 'Get user analytics' })
  @ApiResponse({
    status: 200, description: 'Success', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success"
      },
      "data": {
        "pageView": {
          "text": "Page View",
          "total": 8,
          "progress": 8
        },
        "newPosts": {
          "text": "New Posts",
          "total": 1,
          "progress": 1
        },
        "mimatePoint": {
          "text": "Mimate Point",
          "total": 0
        },
        "activity": {
          "text": "Activity",
          "total": 4,
          "post": 2,
          "comment": 2,
          "reaction": 0
        }
      }
    }
  })
  async getUserAnalytics(@Param('id') id: number, @Query() adminUserAnalyticsDto: AdminUserAnalyticsDto): Promise<GlobalResponse<any>> {
    const data = await this.adminUserService.getUserAnalytics(id, adminUserAnalyticsDto);
    return { message: 'Success', data: data };
  }


  // delete user
  @Delete('delete/:id')
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({
    status: 200, description: 'Success', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success"
      }
    }
  })
  async deleteUser(@Param('id') id: number): Promise<GlobalResponse<{ message: string }>> {
    const data = await this.adminUserService.deleteUser(id);
    return { message: 'Success', data: data };
  }


  // suspend user
  @Post('suspend/:id')
  @ApiOperation({ summary: 'Suspend user' })
  @ApiResponse({
    status: 200, description: 'Success', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success"
      }
    }
  })
  async suspendUser(@Param('id') id: number, @Body() adminUserSuspendDto: AdminUserSuspendDto): Promise<GlobalResponse<{ message: string }>> {
    const data = await this.adminUserService.suspendUserOnOff(id, adminUserSuspendDto, true);
    return { message: 'Success', data: data };
  }


  // unsuspend user
  @Post('unsuspend/:id')
  @ApiOperation({ summary: 'Unsuspend user' })
  @ApiResponse({
    status: 200, description: 'Success', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success"
      }
    }
  })
  async unsuspendUser(@Param('id') id: number): Promise<GlobalResponse<{ message: string }>> {
    const data = await this.adminUserService.suspendUserOnOff(id, null, false);
    return { message: 'Success', data: data };
  }

  // set member verified
  @Post('set-verified/:id')
  @ApiOperation({ summary: 'Set member verified' })
  @ApiResponse({
    status: 200, description: 'Success', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success"
      }
    }
  })
  async setMemberVerified(@Param('id') id: number): Promise<GlobalResponse<{ message: string }>> {
    const data = await this.adminUserService.setUnsetMemberVerified(id, true);
    return { message: 'Success', data: data };
  }

  // unset member verified
  @Post('unset-verified/:id')
  @ApiOperation({ summary: 'Unset member verified' })
  @ApiResponse({
    status: 200, description: 'Success', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success"
      }
    }
  })
  async unsetMemberVerified(@Param('id') id: number): Promise<GlobalResponse<{ message: string }>> {
    const data = await this.adminUserService.setUnsetMemberVerified(id, false);
    return { message: 'Success', data: data };
  }

  /**
   * Get all audit/activity logs for a member by memberId (userId)
   */
  @Get('audit/:id')
  @ApiOperation({ summary: 'Get all audit/activity logs by memberId' })
  @ApiResponse({
    status: 200, description: 'Success', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success"
      },
      "data": {
        "items": [
          {
            "id": 1558,
            "status": "Abid Keren logged in with action login at 7/8/2025, 6:15:26 AM",
            "type": "login",
            "createdAt": "7/8/2025, 6:15:26 AM"
          },
          {
            "id": 1555,
            "status": "Abid Keren logged in with action login at 7/7/2025, 9:17:24 AM",
            "type": "login",
            "createdAt": "7/7/2025, 9:17:24 AM"
          },
          {
            "id": 1471,
            "status": "Abid Keren comment with action reaction-delete at  on 7/6/2025, 9:41:37 AM",
            "type": "comment",
            "createdAt": "7/6/2025, 9:41:37 AM"
          },
          {
            "id": 1469,
            "status": "Abid Keren comment with action reaction-update at post 1 on 7/6/2025, 9:37:16 AM",
            "type": "comment",
            "createdAt": "7/6/2025, 9:37:16 AM"
          },
          {
            "id": 1451,
            "status": "Abid Keren logged in with action login at 7/6/2025, 8:29:50 AM",
            "type": "login",
            "createdAt": "7/6/2025, 8:29:50 AM"
          },
          {
            "id": 1224,
            "status": "Abid Keren created a post with action create at 7/4/2025, 8:59:24 PM",
            "type": "post",
            "createdAt": "7/4/2025, 8:59:24 PM"
          },
          {
            "id": 1223,
            "status": "Abid Keren created a post with action create at 7/4/2025, 8:59:09 PM",
            "type": "post",
            "createdAt": "7/4/2025, 8:59:09 PM"
          },
          {
            "id": 1214,
            "status": "Abid Keren comment with action create at post 20895 on 7/4/2025, 7:57:51 AM",
            "type": "comment",
            "createdAt": "7/4/2025, 7:57:51 AM"
          },
          {
            "id": 1213,
            "status": "Abid Keren logged in with action login at 7/4/2025, 7:07:01 AM",
            "type": "login",
            "createdAt": "7/4/2025, 7:07:01 AM"
          },
          {
            "id": 1212,
            "status": "Abid Keren logged in with action login at 7/3/2025, 9:40:20 AM",
            "type": "login",
            "createdAt": "7/3/2025, 9:40:20 AM"
          }
        ],
        "recordsTotal": 219,
        "recordsFiltered": 219
      }
    }
  })
  async getAllAuditByMemberId(
    @Param('id') id: number,
    @Query() dto: AdminUserAuditListDto
  ): Promise<GlobalResponse<any>> {

    const data = await this.adminUserService.getAllUserActivity(id, dto.page, dto.limit);
    return { message: 'Success', data };
  }

  @Get('quest-detail/:id')
  @ApiOperation({ summary: 'Get quest detail' })
  @ApiResponse({
    status: 200, description: 'Success', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success"
      },
      "data": {
        "items": [],
        "recordsTotal": 0,
        "recordsFiltered": 0
      }
    }
  })
  async getQuestDetail(@Param('id') id: number, @Query() dto: AdminUserQuestDetailDto): Promise<GlobalResponse<Datatable<any>>> {
    const data = await this.adminUserService.getQuestDetail(id, dto);
    return { message: 'Success', data: data };
  }

  // create for export quest detail point
  @Get('export-quest/:id')
  async exportQuestDetail(@Param('id') id: number,  @Res() res: Response) {
    const { buffer, filename } = await this.adminUserService.exportQuestDetail(id);
        
    res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length,
    });
    
    res.end(buffer);
  }


  // get member id with duplicate email
  @Get('duplicate-email')
  async getMemberIdWithDuplicateEmail(): Promise<GlobalResponse<any>> {
    const data = await this.adminUserService.getMemberIdWithDuplicateEmail();
    return { message: 'Success', data: data };
  }

  // update quiz winner
  @Post('update-quiz-winner/:id')
  @ApiOperation({ summary: 'Update quiz winner' })
  @ApiResponse({
    status: 200, description: 'Success', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success"
      }
    }
  })
  async updateQuizWinner(@Param('id') id: number, @Body() dto: AdminUserUpdateQuizWinnerDto): Promise<GlobalResponse<{ message: string }>> {
    const data = await this.adminUserService.updateQuizWinner(id, dto);
    return { message: 'Success', data: data };
  }


  @Post('deduct-point/:id')
  @ApiOperation({ summary: 'Update quiz winner' })
  @ApiResponse({
    status: 200, description: 'Success', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success"
      }
    }
  })
  async deductPoint(@Param('id') id: number, @Body() dto: DeductPointDto): Promise<GlobalResponse<{ message: string }>> {
    const data = await this.adminUserService.deductPoint(id, dto);
    return { 
      message: data ? 'Success' : 'Failed to deduct points', 
      data: {
        message: data ? 'Points deducted successfully' : 'Failed to deduct points'
      } 
    };
  }


}