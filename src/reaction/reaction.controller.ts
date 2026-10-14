import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ReactionService } from './reaction.service';
import {  CreateReactionPostDto } from './dtos/create-reaction-post.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GlobalResponse } from 'src/interfaces/global.interface';
import { Reaction } from './interfaces/reaction.interface';
import { DeleteReactionDto } from './dtos/delete-reaction.dto';
import { GetReactionDto } from './dtos/get-reaction.dto';
import { ActivityService } from 'src/activity/activity.service';
import { QueueService } from 'src/queue/queue.service';

@ApiTags('REACTION')
@ApiBearerAuth('access-token')
@Controller('reaction')
export class ReactionController {
    constructor(private readonly reactionService: ReactionService,
        private readonly activityService: ActivityService,
        private readonly queueService: QueueService
    ) {}
     // clean all reaction
     @Get('clean-all-reaction')
     async cleanAllReaction():Promise<GlobalResponse<Boolean>> {
       const data = await this.reactionService.cleanAllReaction();
       return { message: 'Success', data: data };
     }

    // get reaction by post id
    @Get('list')
    @ApiOperation({ summary: 'Get reaction by post id' })
    @ApiResponse({ status: 200, description: 'The reaction has been successfully retrieved.', example: {
        "success": true,
        "alert": {
            "code": 200,
            "message": "Reaction retrieved successfully"
        },
        "data": [
            {
            "id": 5,
            "reaction": "heart",
            "member": {
                "id": 53909,
                "name": "Yudi Sugiharto",
                "profilePictureUrl": "https://tribe-s3-production.imgix.net/jJ6ndQ87A1PE55Zqcfq9W?auto=compress,format"
            },
            "post_id": 1
            }
        ]
        }})
    @ApiResponse({ status: 404, description: 'Not Found', example: {    
        "success": false,
        "alert": {
            "code": 404,
            "message": "Not Found"
        },
        "data": null
    }})
    async getReactionByPostId(@Query() query: GetReactionDto, @Req() request): Promise<GlobalResponse<Reaction[]>> {


        let {reaction, post_id} = query
        const { id: memberId } = request.userData;
        const response = await this.reactionService.getReactionByPostId(post_id, reaction, memberId)
        return {
            message: 'Reaction retrieved successfully',
            data: response
        }
    }

    // create documentation
    @Post('create')
    @ApiOperation({ summary: 'Create a new reaction' })
    @ApiResponse({ status: 201, description: 'The reaction has been successfully created.', example: {
        "success": true,
        "alert": {
          "code": 201,
           "message": "Reaction created successfully"
        },
        "data": {
            "id": 1,
            "reaction": "like",
            "member": {
                "id": 53909,
                "name": "Yudi Sugiharto",
                "profilePictureUrl": "https://tribe-s3-production.imgix.net/jJ6ndQ87A1PE55Zqcfq9W?auto=compress,format"
            },
            "post_id": 1
        }
    }})
    @ApiResponse({ status: 400, description: 'Bad Request', example: {
        "success": false,
        "alert": {
          "code": 400,
          "message": "Bad Request"
        },
        "data": null
    }})
    @ApiResponse({ status: 404, description: 'Not Found', example: {
        "success": false,
        "alert": {
          "code": 404,
          "message": "Not Found"
        },
        "data": null
    }})
    async createReaction(@Body() body: CreateReactionPostDto, @Req() request):Promise<GlobalResponse<Reaction>> {
        
        const {id:memberId} = request.userData

        const {post_id, reaction} = body

        const response = await this.reactionService.createReaction(post_id, reaction, memberId)

        if(response.post_member_id !== memberId) {
             // save activity
            await this.activityService.createActivity({
                userId: memberId,
                action: reaction ? 'update' : 'create',
                postId: post_id,
                reactionId: response.id,
                targetType: 'reaction'
            })

            this.queueService.addJob('send-notification', {
                type: 'post-reaction',
                send_to: [response.post_member],
                actor_name:  response?.member?.name,
                post_id: post_id
            });
        }
       


      

        return {
            message: 'Reaction created successfully',
            data: response
        };
    }

    // delete reaction
    @Delete(':postId')
    @ApiOperation({ summary: 'Delete a reaction' })
    @ApiResponse({ status: 200, description: 'The reaction has been successfully deleted.',example: {
        "success": true,
        "alert": {
          "code": 200,
          "message": "Reaction deleted successfully"
        },
        "data": {}
      } })
    @ApiResponse({ status: 404, description: 'Not Found', example: {
        "success": false,
        "alert": {
          "code": 404,
          "message": "Reaction not found"
        },
        "data": null
      } })
    async deleteReaction(@Param() params: DeleteReactionDto, @Req() request): Promise<GlobalResponse<{}>> {

        const {id:memberId} = request.userData
        const {postId} = params
        await this.reactionService.deleteReaction( memberId, postId)

        return {
            message: 'Reaction deleted successfully',
            data: {}
        }
    }

    // sync all reaction
    @Post('sync-all-reaction')
    @ApiOperation({ summary: 'Sync all reaction' })
    @ApiResponse({ status: 200, description: 'Returns a message', example : {
        "success": true,
        "alert": {
            "code": 200,
            "message": "Success sync all reaction"
        },
        "data": {}
    }})
    async syncAllReaction(): Promise<GlobalResponse<{}>> {
        let response = await this.reactionService.syncAllReaction()
        return {
            message: 'Success sync all reaction',
            data: response
        }
    }


      // clean all comment
      @Get('inject-point-reaction')
      async injectPointComment():Promise<GlobalResponse<Boolean>> {
        const data = await this.reactionService.injectReaction();
        return { message: 'Success', data: data };
      }
   
}
