import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import { CommentService } from './comment.service';
import { GetCommentsDto } from './dtos/get-comment.dto';
import { GlobalResponse } from 'src/interfaces/global.interface';
import { CommentCollectionResponse, CommentInterface } from './interfaces/comment.interface';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateCommentDto } from './dtos/create-comment.dto';
import { ActivityService } from 'src/activity/activity.service';
import { UpdateCommentDto } from './dtos/update-comment.dto';
import { QueueService } from 'src/queue/queue.service';
@Controller('comment')
@ApiTags('COMMENT')
@ApiBearerAuth('access-token')
export class CommentController {
    constructor(
        private readonly commentService: CommentService,
        private readonly activityService: ActivityService,
        private readonly queueService: QueueService
    ) {}

    @Get('list')
    @ApiOperation({ summary: 'Get list of comments' })
    @ApiResponse({ 
        status: 200, 
        description: 'Returns a list of comments with pagination',
        example:{
          "success": true,
          "alert": {
            "code": 200,
            "message": "Success get comments"
          },
          "data": {
            "totalData": 45,
            "hasNext": true,
            "page": 1,
            "limit": 15,
            "offset": 0,
            "after": "40ccdf80-4038-11f0-9059-85bb890b9001",
            "data": [
              {
                "id": 9176,
                "title": "This is a comment",
                "description": "This is a comment",
                "parent_id": "",
                "post_id": 1,
                "member": {
                  "id": 10245,
                  "name": "Abid Putra",
                  "profilePictureUrl": "https://ktb.otesuto.com/",
                  "userId": 1604791
                },
                "comments": [
                  {
                    "id": 9182,
                    "title": "keren juga lo",
                    "description": "keren juga lo",
                    "parent_id": "",
                    "post_id": 1,
                    "member": {
                      "id": 90828,
                      "name": "selly",
                      "profilePictureUrl": "https://ktb.otesuto.com/",
                      "userId": 1604597
                    },
                    "comments": [],
                    "published_at": "2025-06-03T04:07:02.000Z",
                    "published_at_title": "57 minutes ago",
                    "repliesCount": 0,
                    "reactions": {
                      "reaction": "+1",
                      "count": 0,
                      "reacted": false
                    }
                  },
                  {
                    "id": 9183,
                    "title": "keren juga lo bisa saja lo",
                    "description": "keren juga lo bisa saja lo",
                    "parent_id": "",
                    "post_id": 1,
                    "member": {
                      "id": 76824,
                      "name": "Muhammad Iqbal Aww",
                      "profilePictureUrl": "https://ktb.otesuto.com/storage/users/2024/Ej4iHNmNCunfiqyLZ9DSdFES2EJC8St23TI0ZmGe.jpeg",
                      "userId": 64852
                    },
                    "comments": [],
                    "published_at": "2025-06-03T04:07:21.000Z",
                    "published_at_title": "57 minutes ago",
                    "repliesCount": 0,
                    "reactions": {
                      "reaction": "+1",
                      "count": 0,
                      "reacted": false
                    }
                  }
                ],
                "published_at": "2025-05-29T06:45:02.000Z",
                "published_at_title": "4 days ago",
                "repliesCount": 2,
                "reactions": {
                  "reaction": "+1",
                  "count": 3,
                  "reacted": false
                }
              },
              {
                "id": 9175,
                "title": "This is a comment",
                "description": "This is a comment",
                "parent_id": "",
                "post_id": 1,
                "member": {
                  "id": 10245,
                  "name": "Abid Putra",
                  "profilePictureUrl": "https://ktb.otesuto.com/",
                  "userId": 1604791
                },
                "comments": [],
                "published_at": "2025-05-29T06:39:11.000Z",
                "published_at_title": "4 days ago",
                "repliesCount": 0,
                "reactions": {
                  "reaction": "+1",
                  "count": 0,
                  "reacted": false
                }
              },
              {
                "id": 9173,
                "title": "This is a comment",
                "description": "This is a comment",
                "parent_id": "",
                "post_id": 1,
                "member": {
                  "id": 10245,
                  "name": "Abid Putra",
                  "profilePictureUrl": "https://ktb.otesuto.com/",
                  "userId": 1604791
                },
                "comments": [],
                "published_at": "2025-05-29T05:44:19.000Z",
                "published_at_title": "4 days ago",
                "repliesCount": 0,
                "reactions": {
                  "reaction": "+1",
                  "count": 0,
                  "reacted": false
                }
              },
              {
                "id": 9172,
                "title": "This is a comment",
                "description": "This is a comment",
                "parent_id": "",
                "post_id": 1,
                "member": {
                  "id": 10245,
                  "name": "Abid Putra",
                  "profilePictureUrl": "https://ktb.otesuto.com/",
                  "userId": 1604791
                },
                "comments": [],
                "published_at": "2025-05-29T05:43:45.000Z",
                "published_at_title": "4 days ago",
                "repliesCount": 0,
                "reactions": {
                  "reaction": "+1",
                  "count": 0,
                  "reacted": false
                }
              },
              {
                "id": 9171,
                "title": "This is a comment",
                "description": "This is a comment",
                "parent_id": "",
                "post_id": 1,
                "member": {
                  "id": 10245,
                  "name": "Abid Putra",
                  "profilePictureUrl": "https://ktb.otesuto.com/",
                  "userId": 1604791
                },
                "comments": [],
                "published_at": "2025-05-29T02:09:03.000Z",
                "published_at_title": "5 days ago",
                "repliesCount": 0,
                "reactions": {
                  "reaction": "+1",
                  "count": 0,
                  "reacted": false
                }
              },
              {
                "id": 9170,
                "title": "This is a comment",
                "description": "This is a comment",
                "parent_id": "",
                "post_id": 1,
                "member": {
                  "id": 10245,
                  "name": "Abid Putra",
                  "profilePictureUrl": "https://ktb.otesuto.com/",
                  "userId": 1604791
                },
                "comments": [],
                "published_at": "2025-05-29T02:06:36.000Z",
                "published_at_title": "5 days ago",
                "repliesCount": 0,
                "reactions": {
                  "reaction": "+1",
                  "count": 0,
                  "reacted": false
                }
              },
              {
                "id": 9169,
                "title": "This is a comment",
                "description": "This is a comment",
                "parent_id": "",
                "post_id": 1,
                "member": {
                  "id": 10245,
                  "name": "Abid Putra",
                  "profilePictureUrl": "https://ktb.otesuto.com/",
                  "userId": 1604791
                },
                "comments": [],
                "published_at": "2025-05-29T01:29:19.000Z",
                "published_at_title": "5 days ago",
                "repliesCount": 0,
                "reactions": {
                  "reaction": "+1",
                  "count": 0,
                  "reacted": false
                }
              },
              {
                "id": 9168,
                "title": "This is a comment",
                "description": "This is a comment",
                "parent_id": "",
                "post_id": 1,
                "member": {
                  "id": 10245,
                  "name": "Abid Putra",
                  "profilePictureUrl": "https://ktb.otesuto.com/",
                  "userId": 1604791
                },
                "comments": [],
                "published_at": "2025-05-29T01:28:20.000Z",
                "published_at_title": "5 days ago",
                "repliesCount": 0,
                "reactions": {
                  "reaction": "+1",
                  "count": 0,
                  "reacted": false
                }
              },
              {
                "id": 9167,
                "title": "This is a comment",
                "description": "This is a comment",
                "parent_id": "",
                "post_id": 1,
                "member": {
                  "id": 10245,
                  "name": "Abid Putra",
                  "profilePictureUrl": "https://ktb.otesuto.com/",
                  "userId": 1604791
                },
                "comments": [],
                "published_at": "2025-05-29T01:12:46.000Z",
                "published_at_title": "5 days ago",
                "repliesCount": 0,
                "reactions": {
                  "reaction": "+1",
                  "count": 0,
                  "reacted": false
                }
              },
              {
                "id": 9166,
                "title": "This is a comment",
                "description": "This is a comment",
                "parent_id": "",
                "post_id": 1,
                "member": {
                  "id": 10245,
                  "name": "Abid Putra",
                  "profilePictureUrl": "https://ktb.otesuto.com/",
                  "userId": 1604791
                },
                "comments": [],
                "published_at": "2025-05-29T00:45:24.000Z",
                "published_at_title": "5 days ago",
                "repliesCount": 0,
                "reactions": {
                  "reaction": "+1",
                  "count": 0,
                  "reacted": false
                }
              },
              {
                "id": 9165,
                "title": "This is a comment",
                "description": "This is a comment",
                "parent_id": "",
                "post_id": 1,
                "member": {
                  "id": 10245,
                  "name": "Abid Putra",
                  "profilePictureUrl": "https://ktb.otesuto.com/",
                  "userId": 1604791
                },
                "comments": [],
                "published_at": "2025-05-29T00:43:44.000Z",
                "published_at_title": "5 days ago",
                "repliesCount": 0,
                "reactions": {
                  "reaction": "+1",
                  "count": 0,
                  "reacted": false
                }
              },
              {
                "id": 9164,
                "title": "This is a comment",
                "description": "This is a comment",
                "parent_id": "",
                "post_id": 1,
                "member": {
                  "id": 10245,
                  "name": "Abid Putra",
                  "profilePictureUrl": "https://ktb.otesuto.com/",
                  "userId": 1604791
                },
                "comments": [],
                "published_at": "2025-05-29T00:40:30.000Z",
                "published_at_title": "5 days ago",
                "repliesCount": 0,
                "reactions": {
                  "reaction": "+1",
                  "count": 0,
                  "reacted": false
                }
              },
              {
                "id": 9163,
                "title": "This is a comment",
                "description": "This is a comment",
                "parent_id": "",
                "post_id": 1,
                "member": {
                  "id": 10245,
                  "name": "Abid Putra",
                  "profilePictureUrl": "https://ktb.otesuto.com/",
                  "userId": 1604791
                },
                "comments": [],
                "published_at": "2025-05-29T00:39:17.000Z",
                "published_at_title": "5 days ago",
                "repliesCount": 0,
                "reactions": {
                  "reaction": "+1",
                  "count": 0,
                  "reacted": false
                }
              },
              {
                "id": 9162,
                "title": "This is a comment",
                "description": "This is a comment",
                "parent_id": "",
                "post_id": 1,
                "member": {
                  "id": 10245,
                  "name": "Abid Putra",
                  "profilePictureUrl": "https://ktb.otesuto.com/",
                  "userId": 1604791
                },
                "comments": [],
                "published_at": "2025-05-29T00:33:06.000Z",
                "published_at_title": "5 days ago",
                "repliesCount": 0,
                "reactions": {
                  "reaction": "+1",
                  "count": 0,
                  "reacted": false
                }
              },
              {
                "id": 9161,
                "title": "This is a comment",
                "description": "This is a comment",
                "parent_id": "",
                "post_id": 1,
                "member": {
                  "id": 10245,
                  "name": "Abid Putra",
                  "profilePictureUrl": "https://ktb.otesuto.com/",
                  "userId": 1604791
                },
                "comments": [],
                "published_at": "2025-05-29T00:32:06.000Z",
                "published_at_title": "5 days ago",
                "repliesCount": 0,
                "reactions": {
                  "reaction": "+1",
                  "count": 0,
                  "reacted": false
                }
              }
            ]
          }
        }
    })
    @ApiResponse({ status: 404, description: 'Sample error message', example : {
        "success": false,
        "alert": {
          "code": 404,
          "message": "Not Found"
        },
        "data": null
      }})
    async getComments(@Query() query: GetCommentsDto, @Req() request): Promise<GlobalResponse<CommentCollectionResponse>> {

        const {id:memberId} = request.userData
        const {post_id, limit, after} = query
        let response = await this.commentService.getComments(post_id, limit, after, memberId)

        return {
            message: 'Success get comments',
            data: response
        }
    }


    @Post('create')
    @ApiOperation({ summary: 'Create comment' })
    @ApiResponse({ status: 201, description: 'Returns a message', example : {
        "success": true,
        "alert": {
          "code": 201,
          "message": "Success create comment"
        },
        "data": {
          "id": 9126,
          "title": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut orci urna, ornare et porttitor cursus, facilisis eu tellus. Donec in...",
          "description": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut orci urna, ornare et porttitor cursus, facilisis eu tellus. Donec in ornare arcu. Aenean nec gravida sapien. Mauris ut ligula vitae odio ultricies lobortis. Mauris sed mattis ligula. Proin id consectetur quam. Duis eget erat faucibus orci faucibus sodales. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus.",
          "parent_id": null,
          "post_id": 1,
          "member": {
            "id": 53909,
            "name": "Yudi Sugiharto",
            "profilePictureUrl": "https://tribe-s3-production.imgix.net/jJ6ndQ87A1PE55Zqcfq9W?auto=compress,format"
          },
          "comments": [],
          "created_at": "2025-04-23T10:49:40.000Z",
          "updated_at": "2025-04-23T10:49:40.000Z"
        }
      }})
    @ApiResponse({ status: 403, description: 'Sample error message', example : {
        "success": false,
        "alert": {
          "code": 404,
          "message": "Post not found"
        },  
        "data": null
    }})
    async createComment(@Body() body: CreateCommentDto, @Req() request): Promise<GlobalResponse<CommentInterface>> {
        const {id:memberId, userId} = request.userData

       


        let response = await this.commentService.createComment(body, memberId)

        // save activity
        await this.activityService.createActivity({
            userId: memberId,
            action: 'create',
            postId: response.post_id,
            commentId: response.id,
            targetType: 'comment'
        })

        // send notif for post owner (skip if commenter is the post owner)
        if (response.postOwnerUserId !== userId) {
            this.queueService.addJob('send-notification', {
                type: 'post-comment',
                send_to: [response.postOwnerUserId],
                actor_name: response.member.name,
                post_id: response.post_id,
            });
        }

        if (body.comment_id) {
            const [parentComment, post] = await Promise.all([
                this.commentService.getCommentDetail(body.comment_id),
                this.commentService.getPostDetail(response.post_id),
            ]);
            const commentOwnerId = parentComment?.member?.id;
            const commentOwnerUserId = parentComment?.member?.userId;
            const postOwnerId = post?.backup_member_id;
            const isSameOwner = commentOwnerId != null && postOwnerId != null && commentOwnerId === postOwnerId;

            if (!isSameOwner) {
                this.queueService.addJob('send-notification', {
                    type: 'post-comment-reply',
                    send_to: [commentOwnerUserId],
                    actor_name:  response.member.name,
                    post_id: response.post_id,
                    comment_id: body.comment_id,
                });
            }
        }
        


        return {
            message: 'Success create comment',
            data: response
        }
    }

    // post update comment
    @Post('update/:commentId')
    @ApiOperation({ summary: 'Update comment' })
    @ApiResponse({ status: 200, description: 'Returns a message', example : {
      "success": true,
      "alert": {
        "code": 201,
        "message": "Success create comment"
      },
      "data": {
        "id": 9126,
        "title": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut orci urna, ornare et porttitor cursus, facilisis eu tellus. Donec in...",
        "description": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut orci urna, ornare et porttitor cursus, facilisis eu tellus. Donec in ornare arcu. Aenean nec gravida sapien. Mauris ut ligula vitae odio ultricies lobortis. Mauris sed mattis ligula. Proin id consectetur quam. Duis eget erat faucibus orci faucibus sodales. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus.",
        "parent_id": null,
        "post_id": 1,
        "member": {
          "id": 53909,
          "name": "Yudi Sugiharto",
          "profilePictureUrl": "https://tribe-s3-production.imgix.net/jJ6ndQ87A1PE55Zqcfq9W?auto=compress,format"
        },
        "comments": [],
        "created_at": "2025-04-23T10:49:40.000Z",
        "updated_at": "2025-04-23T10:49:40.000Z"
      }
    }})
    async updateComment(@Param('commentId') commentId: number, @Body() body: UpdateCommentDto, @Req() request): Promise<GlobalResponse<CommentInterface>> {
        const {id:memberId} = request.userData


        let response = await this.commentService.updateComment(commentId, body, memberId)

        // save activity
        await this.activityService.createActivity({
            userId: memberId,
            action: 'update',
            postId: response.post_id,
            
            commentId: response.id,
            targetType: 'comment'
        })

        return {
            message: 'Success update comment',
            data: response
        }
    }
    
    @Delete(':commentId')
    @ApiOperation({ summary: 'Delete comment' })
    @ApiResponse({ status: 200, description: 'Returns a message', example : {
        "success": true,
        "alert": {
          "code": 200,
          "message": "Success delete comment"
        },
        "data": {}
      }})
    @ApiResponse({ status: 404, description: 'Sample error message', example : {
        "success": false,
        "alert": {
          "code": 403,
          "message": "You are not allowed to delete this comment"
        },
        "data": null
    }})
    async deleteComment(@Param('commentId') commentId: number, @Req() request): Promise<GlobalResponse<{}>> {
        
        const {id:memberId} = request.userData

        let comment = await this.commentService.getCommentById(commentId)

        // save activity
        await this.activityService.createActivity({
            userId: memberId,
            action: 'delete',
            postId: comment.post.id,
            commentId: comment.id,
            targetType: 'comment'
        })

        await this.commentService.deleteComment(memberId, comment)

        return {
            message: 'Success delete comment',
            data: {}
        }
    }

    @Post('sync-all-comment')
    @ApiOperation({ summary: 'Sync all comment' })
    @ApiResponse({ status: 200, description: 'Returns a message', example : {
        "success": true,
        "alert": {
            "code": 200,
            "message": "Success sync all comment"
        },
        "data": {}
    }})
    async syncAllComment(): Promise<GlobalResponse<{}>> {
        await this.commentService.syncAllComment()

        return {
            message: 'Success sync all comment',
            data: {}
        }
    }


    @Post('sync-comment-admin')
    @ApiOperation({ summary: 'Sync comment admin' })
    @ApiResponse({ status: 200, description: 'Returns a message', example : {
        "success": true,
        "alert": {
            "code": 200,
            "message": "Success sync comment admin"
        },
        "data": {}
    }})
    async syncCommentAdmin(): Promise<GlobalResponse<{}>> {
        await this.commentService.syncCommentAdmin()

        return {
            message: 'Success sync comment admin',
            data: {}
        }
    }

    // clean all comment
    @Get('clean-all-comment')
    async cleanAllComment():Promise<GlobalResponse<Boolean>> {
      const data = await this.commentService.cleanAllComment();
      return { message: 'Success', data: data };
    }


     // clean all comment
     @Get('inject-point-comment')
     async injectPointComment():Promise<GlobalResponse<Boolean>> {
       const data = await this.commentService.injectPointComment();
       return { message: 'Success', data: data };
     }
}
