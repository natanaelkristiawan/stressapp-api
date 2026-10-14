import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminAuditListDto, AdminPostAnalyticsDto, AdminPostExportDto, AdminPostListDto, CreatePostHighlightDto, MovePostToSpaceDto } from './dtos/admin-post.dto';
import { GlobalResponse } from 'src/interfaces/global.interface';
import { DataPost, Datatable } from './interfaces/datatable.interface';
import { AdminPostService } from './admin-post.service';
import { Post as PostInterface } from '../post/interfaces/post.interface';
import { CreatePostDto } from 'src/post/dtos/create-post.dto';
import { PostService } from 'src/post/post.service';
import { QueueService } from 'src/queue/queue.service';
import { PostEntity } from 'src/entity/post.entity';
import { ActivityService } from 'src/activity/activity.service';
import { AdminPostActivityService } from './admin-post-activity.service';

@Controller('admin-post')
@ApiTags('ADMIN POST')
@ApiBearerAuth('access-token')
export class AdminPostController {

    constructor(
        private readonly adminPostService: AdminPostService,
        private readonly postService: PostService,
        // queue service
        private readonly queueService: QueueService,
        private readonly activityService: ActivityService,
        private readonly adminPostActivityService: AdminPostActivityService,
    ){}

    @Get('list')
    @ApiOperation({ summary: 'Get post list' })
    @ApiResponse({ status: 200, description: 'Success', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success"
      },
      "data": {
        "items": [
          {
            "id": 1,
            "title": "Xpander Cross Manual Jozz mantafff",
            "description": "",
            "thumbnail": "",
            "image": "https://tribe-s3-production.imgix.net/IdRJx7xlIg6wcepskB2yh?auto=compress,format",
            "status": "PUBLISHED",
            "type": "image",
            "created_at": "2025-02-24T14:19:55.000Z",
            "updated_at": "2025-06-03T16:13:42.000Z",
            "published_at": "2025-02-24T14:19:55.000Z"
          }
        ],
        "recordsTotal": 90870,
        "recordsFiltered": 90870
      }
    } })
    async getPostList(@Query() adminPostListDto: AdminPostListDto): Promise<GlobalResponse<Datatable>> {
        const data = await this.adminPostService.getPost(adminPostListDto);
        return {
            message: 'Success',
            data: data
        };
    }

    @Get('detail/:id')
    @ApiOperation({ summary: 'Get post detail' })
    @ApiResponse( {status: 200, description: 'Success', example: 
      {
        "success": true,
        "alert": {
          "code": 200,
          "message": "Success"
        },
        "data": {
          "id": 1,
          "backup_member_id": 1876,
          "backup_space_id": 7,
          "title": "Xpander Cross Manual Jozz mantafff",
          "description": "",
          "image": "https://tribe-s3-production.imgix.net/IdRJx7xlIg6wcepskB2yh?auto=compress,format",
          "status": "PUBLISHED",
          "type": "image",
          "reactionsCount": 7,
          "created_at": "2025-02-24T14:19:55.000Z",
          "updated_at": "2025-06-03T16:13:42.000Z",
          "published_at": "2025-02-24T14:19:55.000Z",
          "deleted_at": "",
          "space": {
            "id": 7,
            "name": "Warga MiMate",
            "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!"
          },
          "author": {
            "id": 1876,
            "name": "RUSLI DG NAI",
            "email": "dhaenknhai@gmail.com",
            "profilePictureUrl": "",
            "userId": 1980291
          }
        }
      }
    })
    async detail(@Param('id') id: number): Promise<GlobalResponse<DataPost>> {
        const data = await this.adminPostService.detail(id);
        return { message: 'Success', data: data };
    }

    @Get('export')
    @ApiOperation({ summary: 'Export post list' })
    @ApiResponse({ status: 200, description: 'Success - File download' })
    async export(@Query() adminPostListDto: AdminPostExportDto, @Res() res: Response): Promise<void> {
        const { buffer, filename } = await this.adminPostService.export(adminPostListDto);
        
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': buffer.length,
        });
        
        res.end(buffer);
    }

    // set post highlight
    @Post('set-post-highlight')
    @ApiOperation({ summary: 'Set post highlight' })
    @ApiResponse({ status: 200, description: 'Success', example: {
      "success": true,
      "alert": {
        "code": 201,
        "message": "Success"
      },
      "data": true
    }})
    @ApiResponse({ status: 400, description: 'Bad Request', example: {
        "success": false,
        "alert": {  
            "code": 400,
            "message": "Bad Request"
        },
        "data": {}
      }})
    async setPostHighlight(@Body() dto: CreatePostHighlightDto): Promise<GlobalResponse<boolean>> {
        let query = await this.adminPostService.createPostHighlight(dto);

        if(query.member !== null) {
        // send notification to post owner
          await this.queueService.addJob('send-notification', {
            post_id: dto.post_id,
            type: 'post-notification-highlight',
            send_to: [query.member.id],
            actor_name: 'Admin'
          });
        } else {
        }

        return { message: 'Success', data: true };
    } 

    // get post detail
    @Get('post-detail/:id')
    @ApiOperation({ summary: 'Get post detail' })
    @ApiResponse({ status: 200, description: 'Success', example:  {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success"
      },
      "data": {
        "id": 1,
        "title": "Xpander Cross Manual Jozz mantafff",
        "description": "",
        "textContent": "",
        "image": "https://mimate-api.otesuto.com/upload/files/IdRJx7xlIg6wcepskB2yh",
        "reaction": [
          {
            "reaction": "+1",
            "count": 5,
            "reacted": false
          },
          {
            "reaction": "heart",
            "count": 1,
            "reacted": false
          },
          {
            "reaction": "tada",
            "count": 1,
            "reacted": false
          }
        ],
        "tags": [
          {
            "slug": "mitsubishimotors",
            "id": 1,
            "title": "#mitsubishimotors"
          },
          {
            "slug": "introduction",
            "id": 2,
            "title": "Introduction"
          }
        ],
        "repliesCount": 47,
        "reactionCount": 7,
        "member": {
          "id": 1876,
          "name": "RUSLI DG NAI",
          "email": "dhaenknhai@gmail.com",
          "profilePictureUrl": "",
          "is_dealer": false
        },
        "space": {
          "id": 7,
          "name": "Warga MiMate",
          "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
          "postsCount": 18519,
          "membersCount": 90816
        },
        "medias": [
          {
            "id": 1,
            "url": "https://mimate-api.otesuto.com/upload/files/IdRJx7xlIg6wcepskB2yh",
            "width": 3072,
            "height": 4096,
            "type": "image",
            "thumbnail": {
              "url": "https://mimate-api.otesuto.com/upload/files/IdRJx7xlIg6wcepskB2yh",
              "width": 3072,
              "height": 4096,
              "type": "image"
            }
          }
        ],
        "mmidUserId": 1980291,
        "totalRepliesCount": 64,
        "created_at": "2025-02-24 22:19:55",
        "published_at": "2025-06-26 22:46:38",
        "published_at_title": "24 February 2025",
        "type": "image",
        "is_post_owner": false,
        "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=1"
      }
    }})
    @ApiResponse({ status: 404, description: 'Not Found', example: {
        "success": false,
        "alert": {
          "code": 404,
          "message": "Not Found"
        },
        "data": {}
      }})
    async getPostDetail(@Param('id') id: number, @Req() request): Promise<GlobalResponse<PostInterface>> {
        const { id:userId } = request.userData; // admin  
        const data = await this.postService.detailPost(id, userId);
        return { message: 'Success', data: data };
    }

    // update post
    @Post('update/:id')
    @ApiOperation({ summary: 'Update post' })
    @ApiResponse({ status: 200, description: 'Success', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success"
      },
      "data": true
    }}) 
    @ApiResponse({ status: 400, description: 'Bad Request', example: {
        "success": false,
        "alert": {  
            "code": 400,
            "message": "Bad Request"
        },
        "data": {}
      }}) 
    async updatePost(@Param('id') id: number, @Body() dto: CreatePostDto, @Req() request): Promise<GlobalResponse<PostInterface>> {
      const { id:userId } = request.userData; // admin
      const data = await this.postService.updatePost(id, dto, userId, userId);
      return { message: 'Success', data: data };
    }


    // hide post
    @Post('hide/:id')
    @ApiOperation({ summary: 'Hide post' })
    @ApiResponse({ status: 200, description: 'Success', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success"  
      },
      "data": true
    }})
    @ApiResponse({ status: 400, description: 'Bad Request', example: {
        "success": false,
        "alert": {    
            "code": 400,
            "message": "Bad Request"
        },
        "data": {}
      }})
    async hidePost(@Param('id') id: number, @Req() request): Promise<GlobalResponse<boolean>> {
      const { id:userId } = request.userData; // admin
      const data = await this.adminPostService.hideShowPost(id, true);

      await this.adminPostActivityService.createActivity({
        userId,
        postId: id,
        action: 'hide',
        targetType: 'admin-post',
        source: 'admin',
      });

      return { message: 'Success', data: data };
    }

    // show post

    // show post
    @Post('show/:id')
    @ApiOperation({ summary: 'Show post' })
    @ApiResponse({ status: 200, description: 'Success', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success"
      },
      "data": true
    }})
    @ApiResponse({ status: 400, description: 'Bad Request', example: {
        "success": false,
        "alert": {  
            "code": 400,
            "message": "Bad Request"
        },
        "data": {}
      }})
    async showPost(@Param('id') id: number, @Req() request): Promise<GlobalResponse<boolean>> {
      const { id:userId } = request.userData; // admin
      const data = await this.adminPostService.hideShowPost(id, false);

      await this.adminPostActivityService.createActivity({
        userId,
        postId: id,
        action: 'show',
        targetType: 'admin-post',
        source: 'admin',
      });

      return { message: 'Success', data: data };
    }

      // delete post
    @Delete('delete/:id')
    @ApiOperation({ summary: 'Delete post' })
    @ApiResponse({ status: 200, description: 'Success', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success"
      },
      "data": true
    }}) 
    @ApiResponse({ status: 400, description: 'Bad Request', example: {
        "success": false,
        "alert": {  
            "code": 400,
            "message": "Bad Request"
        },
        "data": {}
      }}) 
    async deletePost(@Param('id') id: number, @Req() request): Promise<GlobalResponse<boolean>> {
      const { id:userId } = request.userData; // admin
      const data = await this.postService.deletePost(id, userId);

      await this.adminPostActivityService.createActivity({
        userId,
        postId: id,
        action: 'delete',
        targetType: 'admin-post',
        source: 'admin',
      });

      return { message: 'Success', data: data === true };
    }

    // move post to space
    @Post('move-to-space/:id')
    @ApiOperation({ summary: 'Move post to space' })
    @ApiResponse({ status: 200, description: 'Success', example: {
      "success": true,
      "alert": {
        "code": 200,  
        "message": "Success"
      },
      "data": true
    }})
    @ApiResponse({ status: 400, description: 'Bad Request', example: {
        "success": false,
        "alert": {  
            "code": 400,  
            "message": "Bad Request"
        },
        "data": {}
      }})
    async movePostToSpace(@Param('id') id: number, @Body() dto: MovePostToSpaceDto, @Req() request): Promise<GlobalResponse<boolean>> {
      const { id:userId } = request.userData; // admin
      const data = await this.adminPostService.movePostToSpace(id, dto.space_id, userId);

      await this.adminPostActivityService.createActivity({
        userId,
        postId: id,
        action: 'move',
        targetType: 'admin-post',
        spaceId: dto.space_id,
        source: 'admin',
      });

      return { message: 'Success', data: data };
    }



    // analytics replies
    @Get('analytics/replies/:id')
    @ApiOperation({ summary: 'Get analytics replies' })
    @ApiResponse({ status: 200, description: 'Success', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success"
      },
      "data": {
        "count": 1,
        "countBefore": 0,
        "distance": 1,
        "date": "01/07/2025 - 31/07/2025",
        "detail": [
          {
            "date": "2025-07-01",
            "count": 0
          },
          {
            "date": "2025-07-02",
            "count": 0
          },
          {
            "date": "2025-07-03",
            "count": 0
          },
          {
            "date": "2025-07-04",
            "count": 0
          },
          {
            "date": "2025-07-05",
            "count": 0
          },
          {
            "date": "2025-07-06",
            "count": 0
          },
          {
            "date": "2025-07-07",
            "count": 0
          },
          {
            "date": "2025-07-08",
            "count": 0
          },
          {
            "date": "2025-07-09",
            "count": 0
          },
          {
            "date": "2025-07-10",
            "count": 0
          },
          {
            "date": "2025-07-11",
            "count": 0
          },
          {
            "date": "2025-07-12",
            "count": 0
          },
          {
            "date": "2025-07-13",
            "count": 0
          },
          {
            "date": "2025-07-14",
            "count": 0
          },
          {
            "date": "2025-07-15",
            "count": 0
          },
          {
            "date": "2025-07-16",
            "count": 0
          },
          {
            "date": "2025-07-17",
            "count": 0
          },
          {
            "date": "2025-07-18",
            "count": 0
          },
          {
            "date": "2025-07-19",
            "count": 0
          },
          {
            "date": "2025-07-20",
            "count": 0
          },
          {
            "date": "2025-07-21",
            "count": 0
          },
          {
            "date": "2025-07-22",
            "count": 0
          },
          {
            "date": "2025-07-23",
            "count": 0
          },
          {
            "date": "2025-07-24",
            "count": 0
          },
          {
            "date": "2025-07-25",
            "count": 0
          },
          {
            "date": "2025-07-26",
            "count": 0
          },
          {
            "date": "2025-07-27",
            "count": 0
          },
          {
            "date": "2025-07-28",
            "count": 0
          },
          {
            "date": "2025-07-29",
            "count": 0
          },
          {
            "date": "2025-07-30",
            "count": 0
          },
          {
            "date": "2025-07-31",
            "count": 1
          }
        ]
      }
    }})
    async getAnalytics(@Param('id') id: number, @Query() dto: AdminPostAnalyticsDto): Promise<GlobalResponse<any>> {
        const data = await this.activityService.getRepliesAnalytics(dto, id);
        return { message: 'Success', data: data };
    }

    // analytics reactions
    @Get('analytics/reactions/:id')
    @ApiOperation({ summary: 'Get analytics reactions' })
    @ApiResponse({ status: 200, description: 'Success', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success"
      },
      "data": {
        "count": 2,
        "countBefore": 0,
        "distance": 2,
        "date": "01/07/2025 - 31/07/2025",
        "detail": [
          {
            "date": "2025-07-01",
            "count": 0
          },
          {
            "date": "2025-07-02",
            "count": 0
          },
          {
            "date": "2025-07-03",
            "count": 0
          },
          {
            "date": "2025-07-04",
            "count": 0
          },
          {
            "date": "2025-07-05",
            "count": 0
          },
          {
            "date": "2025-07-06",
            "count": 0
          },
          {
            "date": "2025-07-07",
            "count": 0
          },
          {
            "date": "2025-07-08",
            "count": 0
          },
          {
            "date": "2025-07-09",
            "count": 0
          },
          {
            "date": "2025-07-10",
            "count": 0
          },
          {
            "date": "2025-07-11",
            "count": 0
          },
          {
            "date": "2025-07-12",
            "count": 0
          },
          {
            "date": "2025-07-13",
            "count": 0
          },
          {
            "date": "2025-07-14",
            "count": 0
          },
          {
            "date": "2025-07-15",
            "count": 0
          },
          {
            "date": "2025-07-16",
            "count": 0
          },
          {
            "date": "2025-07-17",
            "count": 0
          },
          {
            "date": "2025-07-18",
            "count": 0
          },
          {
            "date": "2025-07-19",
            "count": 0
          },
          {
            "date": "2025-07-20",
            "count": 0
          },
          {
            "date": "2025-07-21",
            "count": 0
          },
          {
            "date": "2025-07-22",
            "count": 0
          },
          {
            "date": "2025-07-23",
            "count": 0
          },
          {
            "date": "2025-07-24",
            "count": 0
          },
          {
            "date": "2025-07-25",
            "count": 0
          },
          {
            "date": "2025-07-26",
            "count": 0
          },
          {
            "date": "2025-07-27",
            "count": 0
          },
          {
            "date": "2025-07-28",
            "count": 0
          },
          {
            "date": "2025-07-29",
            "count": 0
          },
          {
            "date": "2025-07-30",
            "count": 0
          },
          {
            "date": "2025-07-31",
            "count": 2
          }
        ]
      }
    }})   
    async getReactionsAnalytics(@Param('id') id: number, @Query() dto: AdminPostAnalyticsDto): Promise<GlobalResponse<any>> {
        const data = await this.activityService.getReactionsAnalytics(dto, id);
        return { message: 'Success', data: data };
    }


    // analytics by role
    @Get('analytics/role/:id')
    @ApiOperation({ summary: 'Get analytics by role' })
    @ApiResponse({ status: 200, description: 'Success', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success"
      },
      "data": {
        "reaction": 2,
        "comment": 1,
        "share": 0
      }
    }})
    async getAnalyticsByRole(@Param('id') id: number, @Query() dto: AdminPostAnalyticsDto): Promise<GlobalResponse<any>> {
        const data = await this.activityService.getActivityByRole(dto, id);
        return { message: 'Success', data: data };
    }

    // page view in 7 days before from now
    @Get('analytics/page-view/:id')
    @ApiOperation({ summary: 'Get page view in 7 days before from now' })
    @ApiResponse({ status: 200, description: 'Success', example: {
      "success": true,
      "alert": {
        "code": 200,    
        "message": "Success"
      },
      "data": {
        "total": 10,
        "days": [
          {
            "day": "Sunday",
            "date": "02/02/2025",
            "count": 10
          }
        ]
      }
    }})
    async getPageViewIn7DaysBefore(@Param('id') id: number, @Query() dto: AdminPostAnalyticsDto): Promise<GlobalResponse<any>> {
        const data = await this.activityService.getPageViewIn7DaysBefore(dto, id);
        return { message: 'Success', data: data };
    }

    // activity over time
    @Get('analytics/activity-over-time/:id')
    @ApiOperation({ summary: 'Get activity over time' })
    @ApiResponse({ status: 200, description: 'Success', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success"
      },
      "data": {
        "total": 10,
        "comment": [
          {
            "day": "Sunday",
            "date": "02/02/2025",
            "count": 10
          }
        ],
        "reaction": [
          {
            "day": "Sunday",
            "date": "02/02/2025", 
            "count": 10
          }
        ]
      }
    }})
    async getActivityOverTime(@Param('id') id: number, @Query() dto: AdminPostAnalyticsDto): Promise<GlobalResponse<any>> {
        const data = await this.activityService.getActivityOverTime(dto,id);
        return { message: 'Success', data: data };
    }


    // popular days
    @Get('analytics/popular-days/:id')
    @ApiOperation({ summary: 'Get popular days' })
    @ApiResponse({ status: 200, description: 'Success', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success"  
      },
      "data": {
        "total": 10,
        "days": [
          {
            "day": "Sunday",
            "date": "02/02/2025",
            "count": 10
          }
        ]
      }
    }})
    async getPopularDays(@Param('id') id: number, @Query() dto: AdminPostAnalyticsDto): Promise<GlobalResponse<any>> {
        const data = await this.activityService.getPopularDays(dto,id);
        return { message: 'Success', data: data };
    } 


    // popular times
    @Get('analytics/popular-times/:id')
    @ApiOperation({ summary: 'Get popular times' })
    @ApiResponse({ status: 200, description: 'Success', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success"  
      },
      "data": {
        "total": 10,
        "days": [
          {
            "day": "Sunday",
            "date": "02/02/2025",
            "count": 10
          }
        ]
      }
    }})
    async getPopularTimes(@Param('id') id: number, @Query() dto: AdminPostAnalyticsDto): Promise<GlobalResponse<any>> {
        const data = await this.activityService.getPopularTimes(dto,id);
        return { message: 'Success', data: data };
    } 

    // admin audit logs by post id (source = admin)
    @Get('audit/admin/:id')
    @ApiOperation({ summary: 'Get admin audit logs by post id' })
    @ApiResponse({ status: 200, description: 'Success' })
    async getAdminAuditByPostId(
        @Param('id') id: number,
        @Query() dto: AdminAuditListDto,
    ): Promise<GlobalResponse<any>> {
        const data = await this.adminPostActivityService.getAdminLogsByPostId(id, dto.page, dto.limit);
        return { message: 'Success', data };
    }

    // get all audit by post id
    @Get('audit/:id')
    @ApiOperation({ summary: 'Get all audit by post id' })
    @ApiResponse({ status: 200, description: 'Success', example: {
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
    }})
    async getAllAuditByPostId(@Param('id') id: number, @Query() dto: AdminAuditListDto  ): Promise<GlobalResponse<any>> {
        const data = await this.activityService.getAllPostActivity(id, dto.page, dto.limit);
        return { message: 'Success', data: data };
    }



  
}
