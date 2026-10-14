import { Controller, Get, Post, Query, Body, Req, Delete, Param } from '@nestjs/common';
import { CommentReactionService } from './comment-reaction.service';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiOperation } from '@nestjs/swagger';
import { GetReactionDto } from './dtos/get-reaction.dto';
import { GlobalResponse } from 'src/interfaces/global.interface';
import { Reaction } from './interfaces/reaction.interface';
import { CreateReactionDto } from './dtos/create-reaction.dto';
import { DeleteReactionDto } from './dtos/delete-reaction.dto';
import { QueueService } from 'src/queue/queue.service';


@ApiTags('Comment Reaction')
@ApiBearerAuth('access-token')
@Controller('comment-reaction')
export class CommentReactionController {

    constructor(
        private readonly commentReactionService: CommentReactionService,
        private readonly queueService: QueueService
    
    ) {}
    // get reaction by comment_id   
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
            "comment_id": 1
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
    async getReactionByCommentId(@Query() query: GetReactionDto): Promise<GlobalResponse<Reaction[]>> {
        
        let { comment_id} = query
        const response = await this.commentReactionService.getReactionByCommentId(comment_id, '+1')
        return {
            message: 'Reaction retrieved successfully',
            data: response
        }
    }

    // create reaction
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
    async createReaction(@Body() body: CreateReactionDto, @Req() request):Promise<GlobalResponse<Reaction>> {
        
        const {id:memberId} = request.userData
        const{userId} = request.userData

        const {comment_id} = body

  

        const response = await this.commentReactionService.createReaction(comment_id, '+1', memberId)

        if(response.comment_owner != userId) {
             // send notif for post owner
            this.queueService.addJob('send-notification', {
                type: 'post-reaction-comment',
                send_to: [response.comment_owner],
                actor_name: request.userData.name,
                post_id: response.post_id,
            })
        }

        

        return {
            message: 'Reaction created successfully',
            data: response
        }
    }


    // delete reaction
    @Delete(':commentId')
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
        const {commentId} = params
        const response = await this.commentReactionService.deleteReaction( memberId, commentId)

        return {
            message: 'Reaction deleted successfully',
            data: {}
        }
    }

}
