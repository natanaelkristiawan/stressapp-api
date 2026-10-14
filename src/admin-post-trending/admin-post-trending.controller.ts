import { Body, Controller, Get, Post } from '@nestjs/common';
import { AdminPostTrendingService } from './admin-post-trending.service';
import { AdminPostTrendingDto, AdminSetTrendingPostDto, AdminUnsetTrendingPostDto, PostTrendingUpdateOrderDto } from './dtos/admin-post-trending.dto';
import { GlobalResponse } from 'src/interfaces/global.interface';
import { AdminPostTrendingInterface } from './interfaces/admin-post-trending.interface';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { QueueService } from 'src/queue/queue.service';

@Controller('admin-post-trending')
@ApiTags('ADMIN POST TRENDING')
@ApiBearerAuth('access-token')
export class AdminPostTrendingController {
    constructor(private readonly adminPostTrendingService: AdminPostTrendingService, private readonly queueService: QueueService) {}

    @Get('list')
    @ApiOperation({ summary: 'List trending post' })
    @ApiResponse({ status: 200, description: 'Success', example:{
        "success": true,
        "alert": {
            "code": 200,
            "message": "Success"
        },
        "data": [
            {
                "id": 1,
                "title": "Post 1",
                "createdAt": "2021-01-01",
                "order": 1
            }
        ]
    } })
    async listTrendingPost():Promise<GlobalResponse<AdminPostTrendingInterface[]>> {
        let data = await this.adminPostTrendingService.listTrendingPost();
        return {
            message: 'success list trending post',
            data: data
        }
    }

    @Post('search')
    @ApiOperation({ summary: 'Search post' })
    @ApiResponse({ status: 200, description: 'Success', example:{
        "success": true,
        "alert": {
            "code": 200,
            "message": "Success"
        },
        "data": [
            {
                "id": 1,
                "title": "Post 1",
                "createdAt": "2021-01-01"
            }
        ]
    } })
    async searchPost(@Body() searchDto: AdminPostTrendingDto):Promise<GlobalResponse<AdminPostTrendingInterface[]>> {
        let data = await this.adminPostTrendingService.searchPost(searchDto);     
        return {
            message: 'Success',
            data: data
        }
    }



    @Post('set-trending')
    @ApiOperation({ summary: 'Set trending post' })
    @ApiResponse({ status: 200, description: 'Success', example:{
        "success": true,
        "alert": {
            "code": 200,
            "message": "Success"
        }
    } })
    async setTrendingPost(@Body() setTrendingPostDto: AdminSetTrendingPostDto):Promise<GlobalResponse<AdminPostTrendingInterface>> {
        let data = await this.adminPostTrendingService.setTrendingPost(setTrendingPostDto.postId, setTrendingPostDto.order);

        return {
            message: 'success set trending post',
            data: data
        }
    }


    @Post('unset-trending')
    @ApiOperation({ summary: 'Unset trending post' })
    @ApiResponse({ status: 200, description: 'Success', example:{
        "success": true,
        "alert": {
            "code": 200,
            "message": "Success"
        }
    } })    
    async unsetTrendingPost(@Body() unsetTrendingPostDto: AdminUnsetTrendingPostDto):Promise<GlobalResponse<{}>> {
        await this.adminPostTrendingService.unsetTrendingPost(unsetTrendingPostDto.postId);
        return {
            message: 'success unset trending post',
            data: {}
        }
    }


    @Post('update-order')
    @ApiOperation({ summary: 'Update order of trending post' })
    @ApiResponse({ status: 200, description: 'Success', example:{
        "success": true,
        "alert": {
            "code": 200,
            "message": "Success"
        }
    } })
    async updateOrder(@Body() updateOrderDto: PostTrendingUpdateOrderDto):Promise<GlobalResponse<AdminPostTrendingInterface[]>> {
        let data = await this.adminPostTrendingService.updateOrder(updateOrderDto);
        return {
            message: 'success update order of trending post',
            data: data
        }
    }




}
