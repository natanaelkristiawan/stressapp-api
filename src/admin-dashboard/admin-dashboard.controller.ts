import { BadRequestException, Controller, Get, Param, Query, Res } from '@nestjs/common';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminDashboardDto, DateRangeDto, HistoryByDaysDto, TopMemberDto, TopPostDto, TopSpacesDto } from './dtos/admin-dashboard.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { topMember } from './interfaces/admin-dashboard.interface';
import { ReportPostService } from './report-post.service';
import { CardRevisionService } from './card-revision.service';
import { ExportRevisionService } from './export-revision.service';
import { ExportPostService } from './export-post.service';

@Controller('admin/dashboard')
@ApiTags('ADMIN DASHBOARD')
@ApiBearerAuth('access-token')
export class AdminDashboardController {

    constructor(
        private readonly adminDashboardService: AdminDashboardService,
        private readonly reportPostService: ReportPostService,
        private readonly cardRevisionService: CardRevisionService,
        private readonly exportRevisionService: ExportRevisionService,
        private readonly exportPostService: ExportPostService
    ){}

    @Get('activity')
    @ApiOperation({ summary: 'Get activity' })
    @ApiResponse({ status: 200, description: 'Success' , example:{
        "success": true,
        "alert": {
          "code": 200,
          "message": "Request successful"
        },
        "data": {
          "new_member": {
            "text": "New Member",
            "total": 41,
            "percentage": 1950
          },
          "active_member": {
            "text": "Active Member",
            "total": 46,
            "percentage": 100
          },
          "page_view": {
            "text": "Page View",
            "total": 46,
            "percentage": 100
          },
          "online_member": {
            "text": "Online Member",
            "active": 46,
            "total": 90870
          },
          "new_activity": {
            "text": "New Activity",
            "post": 19,
            "comment": 2,
            "reaction": 0
          }
        }
      }})
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    async getActivity(@Query() adminDashboardDto: AdminDashboardDto){

        // get activity
        const {start_date, end_date} = adminDashboardDto;
        return this.cardRevisionService.getActivity(start_date, end_date  );
    }

    @Get('export/new-member')
    @ApiOperation({ summary: 'Export new member data to Excel' })
    @ApiResponse({ 
        status: 200, 
        description: 'Excel file download',
        schema: {
            type: 'string',
            format: 'binary'
        }
    })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    async exportNewMember(@Query() adminDashboardDto: AdminDashboardDto, @Res() res: Response) {
        const { start_date, end_date } = adminDashboardDto;
        
        if (!start_date || !end_date) {
            throw new BadRequestException('Start date and end date are required');
        }

        const { buffer, filename } = await this.exportRevisionService.exportDataToExcelNewMember(start_date, end_date);
        
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': buffer.length,
        });
        
        res.end(buffer);
    }

    @Get('export/active-member')
    @ApiOperation({ summary: 'Export active member data to Excel' })
    @ApiResponse({ 
        status: 200, 
        description: 'Excel file download',
        schema: {
            type: 'string',
            format: 'binary'
        }
    })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    async exportActiveMember(@Query() adminDashboardDto: AdminDashboardDto, @Res() res: Response) {
        const { start_date, end_date } = adminDashboardDto;
        
        if (!start_date || !end_date) {
            throw new BadRequestException('Start date and end date are required');
        }

        const { buffer, filename } = await this.exportRevisionService.exportDataToExcelActiveMember(start_date, end_date);
        
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': buffer.length,
        });
        
        res.end(buffer);
    }

    @Get('export/page-view')
    @ApiOperation({ summary: 'Export page view data to Excel' })
    @ApiResponse({ 
        status: 200, 
        description: 'Excel file download',
        schema: {
            type: 'string',
            format: 'binary'
        }
    })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    async exportPageView(@Query() adminDashboardDto: AdminDashboardDto, @Res() res: Response) {
        const { start_date, end_date } = adminDashboardDto;
        
        if (!start_date || !end_date) {
            throw new BadRequestException('Start date and end date are required');
        }

        const { buffer, filename } = await this.exportRevisionService.exportDataToExcelPageView(start_date, end_date);
        
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': buffer.length,
        });
        
        res.end(buffer);
    }

    @Get('export/history-by-days')
    @ApiOperation({ summary: 'Export history by days data to Excel with daily and monthly tabs' })
    @ApiResponse({ 
        status: 200, 
        description: 'Excel file download with two tabs: Daily History and Monthly History',
        schema: {
            type: 'string',
            format: 'binary'
        }
    })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    async exportHistoryByDays(@Res() res: Response, @Query() adminDashboardDto: AdminDashboardDto) {
        const { start_date, end_date } = adminDashboardDto;
        const { buffer, filename } = await this.exportRevisionService.exportDataToExcelHistoryByDays(start_date, end_date);
        
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': buffer.length,
        });
        
        res.end(buffer);
    }

    @Get('export/top-member')
    @ApiOperation({ summary: 'Export top member data to Excel with post, comment, and reaction tabs' })
    @ApiResponse({ 
        status: 200, 
        description: 'Excel file download with three tabs: Top Post Members, Top Comment Members, and Top Reaction Members',
        schema: {
            type: 'string',
            format: 'binary'
        }
    })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    async exportTopMember(@Res() res: Response, @Query() adminDashboardDto: AdminDashboardDto) {
      const { start_date, end_date } = adminDashboardDto;
        const { buffer, filename } = await this.exportRevisionService.exportDataToExcelTopMember(start_date, end_date);
        
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': buffer.length,
        });
        
        res.end(buffer);
    }

    @Get('export/top-spaces')
    @ApiOperation({ summary: 'Export top spaces data to Excel with post and member tabs' })
    @ApiResponse({ 
        status: 200, 
        description: 'Excel file download with two tabs: Top Spaces by Posts and Top Spaces by Members',
        schema: {
            type: 'string',
            format: 'binary'
        }
    })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    async exportTopSpaces(@Res() res: Response, @Query() adminDashboardDto: AdminDashboardDto) {
        const { start_date, end_date } = adminDashboardDto;
        const { buffer, filename } = await this.exportRevisionService.exportDataToExcelTopSpaces(start_date, end_date);
        
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': buffer.length,
        });
        
        res.end(buffer);
    }

    @Get('export/top-post')
    @ApiOperation({ summary: 'Export top post data to Excel with view, comment, and reaction tabs' })
    @ApiResponse({ 
        status: 200, 
        description: 'Excel file download with three tabs: Top Posts by Views, Top Posts by Comments, and Top Posts by Reactions',
        schema: {
            type: 'string',
            format: 'binary'
        }
    })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    async exportTopPost(@Res() res: Response, @Query() adminDashboardDto: AdminDashboardDto) {
        const { start_date, end_date } = adminDashboardDto;
        const { buffer, filename } = await this.exportRevisionService.exportDataToExcelTopPost(start_date, end_date);
        
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': buffer.length,
        });
        
        res.end(buffer);
    }

    @Get('export/online-member')
    @ApiOperation({ summary: 'Export online member statistics to Excel' })
    @ApiResponse({ 
        status: 200, 
        description: 'Excel file download with online member statistics',
        schema: {
            type: 'string',
            format: 'binary'
        }
    })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    async exportOnlineMember(@Res() res: Response) {
        const { buffer, filename } = await this.exportRevisionService.exportDataToExcelOnlineMember();
        
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': buffer.length,
        });
        
        res.end(buffer);
    }

    @Get('history-by/:type')
    @ApiOperation({ summary: 'Get history by days' })
    @ApiResponse({ status: 200, description: 'Success', example:{
        "success": true,
        "alert": {
          "code": 200,
          "message": "Request successful"
        },
        "data": [
          {
            "date": "2025-05-17",
            "activity": 1
          },
          {
            "date": "2025-05-16",
            "activity": 2
          },
          {
            "date": "2025-05-15",
            "activity": 6
          },
          {
            "date": "2025-05-14",
            "activity": 26
          },
          {
            "date": "2025-05-13",
            "activity": 25
          },
          {
            "date": "2025-05-12",
            "activity": 0
          },
          {
            "date": "2025-05-11",
            "activity": 0
          }
        ]
      } })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    async getHistoryByDays( @Query() adminDashboardDto: AdminDashboardDto){
        // default type is daily
        const {start_date, end_date} = adminDashboardDto;

        const { data, totalActivity, ids } = await this.cardRevisionService.historyByDays( start_date, end_date)
        return {
           message: 'Request successful',
           data: {
            data: data,
            ids: ids,
            totalActivity: totalActivity
           }
        }
    }


    @Get('top-member/:type')
    @ApiOperation({ summary: 'Get top member' })
    @ApiResponse({ status: 200, description: 'Success', example:{
        "success": true,
        "alert": {
          "code": 200,
          "message": "Request successful"
        },
        "data": [
          {
            "userId": 90829,
            "name": "",
            "email": "",
            "profilePicture": "",
            "count": "17"
          },
          {
            "userId": 10245,
            "name": "Abid Putra",
            "email": "abidramadhan0698@gmail.com",
            "profilePicture": "storage/users/zfJfKDn8c5EaItxBcwFXHbp6cMhIEt2X0oevcpih.jpeg",
            "count": "2"
          }
        ]
      } })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    async getTopMember(@Param() params: TopMemberDto, @Query() adminDashboardDto: AdminDashboardDto): Promise<topMember[]>{
        const {type} = params;  
        const {start_date, end_date} = adminDashboardDto;
        return this.cardRevisionService.topMember(type, start_date, end_date)
    }


    // get top spaces
    @Get('top-spaces/:type')
    @ApiOperation({ summary: 'Get top spaces' })
    @ApiResponse({ status: 200, description: 'Success', example:{
      "success": true,
      "alert": {
        "code": 200,
        "message": "Request successful"
      },
      "data": [
        {
          "id": 7,
          "spaceId": "pvPCTr3JWhCB",
          "name": "Warga MiMate",
          "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
          "slug": "mimate-n44p4xaa",
          "image": "https://yes.sgp1.digitaloceanspaces.com/images/1745898503259-5f650392-5db5-4729-a0d6-75636c6e8449-icon%20warga.png",
          "banner": "https://yes.sgp1.digitaloceanspaces.com/images/1745898452537-6c75d0f2-8a6d-4cf4-adc7-2efc8d2f3cf6-warga%20mimate.jpeg",
          "membersCount": 90786,
          "postsCount": 18473,
          "hidden": 0,
          "inviteOnly": 0,
          "backup_space_id": 15,
          "is_dealer": false
        },
        {
          "id": 5,
          "spaceId": "RBOsp0xiW8sz",
          "name": "Dealers Corner",
          "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
          "slug": "dealers-space-kb25s0n6",
          "image": "https://yes.sgp1.digitaloceanspaces.com/images/1745898969793-9eaddcd6-39c8-414a-84a9-2ae54dfb8ae7-xforce.png",
          "banner": "https://yes.sgp1.digitaloceanspaces.com/images/1745898452537-6c75d0f2-8a6d-4cf4-adc7-2efc8d2f3cf6-warga%20mimate.jpeg",
          "membersCount": 52,
          "postsCount": 1065,
          "hidden": 0,
          "inviteOnly": 0,
          "backup_space_id": 15,
          "is_dealer": true
        },
        {
          "id": 4,
          "spaceId": "c5OK1h5fFipg",
          "name": "Mitsubishi Xforce",
          "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
          "slug": "space-proposal-7n8pm5lv",
          "image": "https://yes.sgp1.digitaloceanspaces.com/images/1745898969793-9eaddcd6-39c8-414a-84a9-2ae54dfb8ae7-xforce.png",
          "banner": "https://yes.sgp1.digitaloceanspaces.com/images/1745898452537-6c75d0f2-8a6d-4cf4-adc7-2efc8d2f3cf6-warga%20mimate.jpeg",
          "membersCount": 79843,
          "postsCount": 304,
          "hidden": 0,
          "inviteOnly": 0,
          "backup_space_id": 15,
          "is_dealer": false
        }
      ]
    }})
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    async getTopSpaces(@Param() params: TopSpacesDto, @Query() adminDashboardDto: AdminDashboardDto){
        const {type} = params;
        const {start_date, end_date} = adminDashboardDto;
        return this.cardRevisionService.topSpaces(type, start_date, end_date)
    }


    // top post 
    @Get('top-post/:type')  
    @ApiOperation({ summary: 'Get top post by view, comment, reaction' })
    @ApiResponse({ status: 200, description: 'Success', example:{}})
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    async getTopPost(@Param() params: TopPostDto, @Query() adminDashboardDto: AdminDashboardDto){
        const {type} = params;
        const {start_date, end_date} = adminDashboardDto;
        return this.cardRevisionService.topPost(type, start_date, end_date)
    }



    // post activity
    @Get('post-activity')
    @ApiOperation({ summary: 'Get post activity' })
    @ApiResponse({ status: 200, description: 'Success', example:{
      "success": true,
      "alert": {
        "code": 200,
        "message": "Request successful"
      },
      "data": {
        "new_posts": {
          "total": 49,
          "percentage": 100
        },
        "new_replies": {
          "total": 188,
          "percentage": 80
        },
        "new_reactions": {
          "total": 0,
          "percentage": 0
        }
      }
    }})
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    async getPostActivity(@Query() adminDashboardDto: AdminDashboardDto){
        const {start_date, end_date} = adminDashboardDto; 
        return this.cardRevisionService.getPostActivity(start_date, end_date)
    }

    // new posts daily
    @Get('new-posts-daily')
    @ApiOperation({ summary: 'Get new posts daily' })
    @ApiResponse({ status: 200, description: 'Success', example:{
      "success": true,
      "alert": {
        "code": 200,
        "message": "Request successful"
      },
      "data": [
        {
          "date": "2025-07-15",
          "activity": "0"
        },
        {
          "date": "2025-07-16",
          "activity": "4"
        },
        {
          "date": "2025-07-17",
          "activity": "0"
        },
        {
          "date": "2025-07-18",
          "activity": "19"
        },
        {
          "date": "2025-07-19",
          "activity": "20"
        },
        {
          "date": "2025-07-20",
          "activity": "6"
        },
        {
          "date": "2025-07-21",
          "activity": "0"
        },
        {
          "date": "2025-07-22",
          "activity": "0"
        }
      ]
    }})
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    async getNewPostsDaily(@Query() adminDashboardDto: AdminDashboardDto){
        const {start_date, end_date} = adminDashboardDto;   
        return this.cardRevisionService.getDailyPostCounts(start_date, end_date)
    }



    // export new posts
    @Get('export/new-posts')
    @ApiOperation({ summary: 'Export new posts' })
    @ApiResponse({ status: 200, description: 'Success', example:{}})
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    async exportNewPosts(@Query() adminDashboardDto: AdminDashboardDto, @Res() res: Response){
        const {start_date, end_date} = adminDashboardDto;
        const { buffer, filename } = await this.exportPostService.exportNewPosts(start_date, end_date);
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': buffer.length,
        });
        res.end(buffer);
    }

    // export new replies
    @Get('export/new-replies')
    @ApiOperation({ summary: 'Export new replies' })
    @ApiResponse({ status: 200, description: 'Success', example:{}})
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 500, description: 'Internal Server Error' })
    async exportNewReplies(@Query() adminDashboardDto: AdminDashboardDto, @Res() res: Response){
        const {start_date, end_date} = adminDashboardDto; 
        const { buffer, filename } = await this.exportPostService.exportNewReplies(start_date, end_date);
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': buffer.length,
        });
        res.end(buffer);
    }


     // export new replies
     @Get('export/new-reactions')
     @ApiOperation({ summary: 'Export new reactions' })
     @ApiResponse({ status: 200, description: 'Success', example:{}})
     @ApiResponse({ status: 400, description: 'Bad Request' })
     @ApiResponse({ status: 500, description: 'Internal Server Error' })
     async exportNewReactions(@Query() adminDashboardDto: AdminDashboardDto, @Res() res: Response){
         const {start_date, end_date} = adminDashboardDto; 
         const { buffer, filename } = await this.exportPostService.exportNewReactions(start_date, end_date);
         res.set({
             'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
             'Content-Disposition': `attachment; filename="${filename}"`,
             'Content-Length': buffer.length,
         });
         res.end(buffer);
     }

      // Distinct users grouped by weekday (Mon..Sun)
      @Get('distinct-users/weekday')
      @ApiOperation({ summary: 'Distinct users grouped by weekday (local Z)' })
      @ApiResponse({ status: 200, description: 'Success', example: {
        "success": true,
        "alert": {
          "code": 200,
          "message": "Request successful"
        },
        "data": [
          {
            "day": "monday",
            "total": 462
          },
          {
            "day": "tuesday",
            "total": 844
          },
          {
            "day": "wednesday",
            "total": 946
          },
          {
            "day": "thursday",
            "total": 761
          },
          {
            "day": "friday",
            "total": 1510
          },
          {
            "day": "saturday",
            "total": 868
          },
          {
            "day": "sunday",
            "total": 823
          }
        ]
      }})
      @ApiResponse({ status: 400, description: 'Bad Request' })
      @ApiResponse({ status: 500, description: 'Internal Server Error' })
      async distinctUsersByWeekday(@Query() { start_date, end_date }: DateRangeDto) {
        return this.cardRevisionService.countDistinctUsersByWeekday(start_date, end_date);
      }

      // Distinct users grouped by hour-of-day (00..23)
      @Get('distinct-users/hourly')
      @ApiOperation({ summary: 'Distinct users grouped by hour-of-day 00–23 (local Z)' })
      @ApiResponse({ status: 200, description: 'Success', example: {
        "success": true,
        "alert": {
          "code": 200,
          "message": "Request successful"
        },
        "data": [
          {
            "hour": "00",
            "count": 781
          },
          {
            "hour": "01",
            "count": 501
          },
          {
            "hour": "02",
            "count": 562
          },
          {
            "hour": "03",
            "count": 329
          },
          {
            "hour": "04",
            "count": 253
          },
          {
            "hour": "05",
            "count": 206
          },
          {
            "hour": "06",
            "count": 182
          },
          {
            "hour": "07",
            "count": 149
          },
          {
            "hour": "08",
            "count": 88
          },
          {
            "hour": "09",
            "count": 60
          },
          {
            "hour": "10",
            "count": 41
          },
          {
            "hour": "11",
            "count": 33
          },
          {
            "hour": "12",
            "count": 31
          },
          {
            "hour": "13",
            "count": 46
          },
          {
            "hour": "14",
            "count": 105
          },
          {
            "hour": "15",
            "count": 142
          },
          {
            "hour": "16",
            "count": 175
          },
          {
            "hour": "17",
            "count": 241
          },
          {
            "hour": "18",
            "count": 431
          },
          {
            "hour": "19",
            "count": 340
          },
          {
            "hour": "20",
            "count": 346
          },
          {
            "hour": "21",
            "count": 282
          },
          {
            "hour": "22",
            "count": 753
          },
          {
            "hour": "23",
            "count": 789
          }
        ]
      }})
      @ApiResponse({ status: 400, description: 'Bad Request' })
      @ApiResponse({ status: 500, description: 'Internal Server Error' })
      async distinctUsersByHour(@Query() { start_date, end_date }: DateRangeDto) {
        return this.cardRevisionService.countDistinctUsersByHour(start_date, end_date);
      }


      // clear member
      @Get('clear-member')
      @ApiOperation({ summary: 'Clear member data with optional Excel export' })
      @ApiResponse({ 
        status: 200, 
        description: 'Success - Returns data summary or Excel file download',
        schema: {
          oneOf: [
            {
              type: 'object',
              properties: {
                message: { type: 'string' },
                totalFilteredMembers: { type: 'number' },
                exportCreated: { type: 'boolean' }
              }
            },
            {
              type: 'string',
              format: 'binary'
            }
          ]
        }
      })
      @ApiResponse({ status: 400, description: 'Bad Request' })
      @ApiResponse({ status: 500, description: 'Internal Server Error' })
      async clearMember(@Query('canExport') canExport: boolean, @Res() res: Response) {
        const result = await this.cardRevisionService.clearMember(canExport);

        // If export was requested and file was created
        if (canExport && result.buffer && result.filename) {
          res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${result.filename}"`,
            'Content-Length': result.buffer.length,
          });
          res.end(result.buffer);
        } else {
          // Return regular JSON response
          res.json(result);
        }
      }

      @Get('post-votes')
      @ApiOperation({ summary: 'Get post votes report for dashboard' })
      @ApiResponse({ status: 200, description: 'Success' })
      @ApiResponse({ status: 400, description: 'Bad Request' })
      @ApiResponse({ status: 500, description: 'Internal Server Error' })
      async getPostVotesReport() {
          const data = await this.cardRevisionService.getPostVotesReport();
          return {
              message: 'Request successful',
              data,
          };
      }

      @Get('export/post-votes')
      @ApiOperation({ summary: 'Export post votes report to Excel' })
      @ApiResponse({ 
          status: 200, 
          description: 'Excel file download',
          schema: {
              type: 'string',
              format: 'binary'
          }
      })
      @ApiResponse({ status: 400, description: 'Bad Request' })
      @ApiResponse({ status: 500, description: 'Internal Server Error' })
      async exportPostVotesReport(@Res() res: Response) {
          const { buffer, filename } = await this.cardRevisionService.exportPostVotesReportToExcel();
          
          res.set({
              'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'Content-Disposition': `attachment; filename="${filename}"`,
              'Content-Length': buffer.length,
          });
          
          res.end(buffer);
      }
}

