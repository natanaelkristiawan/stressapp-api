import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { AdminHighlightService } from './admin-highlight.service';
import { HighlightCreateDto, HighlightUpdateOrderDto } from './dtos/admin-highlight.dto';
import { HighlightInterface } from './interfaces/admin-highlight.interface';
import { GlobalResponse } from 'src/interfaces/global.interface';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@Controller('admin-highlight')
@ApiTags('Admin Highlight')
@ApiBearerAuth('access-token')
export class AdminHighlightController {
    constructor(private readonly adminHighlightService: AdminHighlightService) {}

    @Get('list')
    @ApiOperation({ summary: 'List highlight' })
    @ApiResponse({ status: 200, description: 'Highlight list', example:{
        "success": true,
        "alert": {
          "code": 200,
          "message": "Highlight list"
        },
        "data": [
          {
            "id": 1,
            "name": "QUIZ MIMATE",
            "image": "https://yes.sgp1.digitaloceanspaces.com/images/1748402341784-6ce46c4a-ea5c-45e3-a9bc-803237503b6c-mimatequiz.png",
            "order": 0,
            "link": "mmksi://mimate?page=",
            "need_token": 0,
            "createdAt": "2025-05-28T03:09:41.000Z",
            "updatedAt": "2025-05-28T03:09:41.000Z",
            "deletedAt": ""
          },
          {
            "id": 2,
            "name": "IIMS 2025",
            "image": "https://yes.sgp1.digitaloceanspaces.com/images/1748402363559-0b3683f5-6506-4b46-98d6-cd3f6a5027d3-imms.png",
            "order": 0,
            "link": "mmksi://mimate?page=",
            "need_token": 0,
            "createdAt": "2025-05-28T03:09:41.000Z",
            "updatedAt": "2025-05-28T03:09:41.000Z",
            "deletedAt": ""
          },
          {
            "id": 3,
            "name": "MITSHUBISHI MOTOR",
            "image": "https://yes.sgp1.digitaloceanspaces.com/images/1748402383048-92a438a5-4c81-4981-8ee0-d821c26d7abd-mitshu.png",
            "order": 0,
            "link": "mmksi://mimate?page=",
            "need_token": 0,
            "createdAt": "2025-05-28T03:10:41.000Z",
            "updatedAt": "2025-05-28T03:10:41.000Z",
            "deletedAt": ""
          },
          {
            "id": 4,
            "name": "MITSHUBISHI RALLY MOTOR",
            "image": "https://yes.sgp1.digitaloceanspaces.com/images/1748402400166-01fea245-19c5-4af5-ba4f-50f97da06d27-rally.png",
            "order": 0,
            "link": "mmksi://mimate?page=",
            "need_token": 0,
            "createdAt": "2025-05-28T03:10:41.000Z",
            "updatedAt": "2025-05-28T03:10:41.000Z",
            "deletedAt": ""
          }
        ]
      } })
    async listHighlight(): Promise<GlobalResponse<HighlightInterface[]>> {
        let data = await this.adminHighlightService.listHighlight()
        return {
            message: 'Highlight list',
            data: data
        }
    }

    @Post('create')
    @ApiOperation({ summary: 'Create highlight' })
    @ApiResponse({ status: 201, description: 'Highlight created successfully', example:{
        message: 'Highlight created successfully',
        data: {
            id: 1,
            name: 'Highlight 1',
            image: 'https://yes.sgp1.digitaloceanspaces.com/images/1748402400166-01fea245-19c5-4af5-ba4f-50f97da06d27-rally.png',
            order: 0,
            link: 'mmksi://mimate?page=',
            need_token: 0,
        }
    } })
    async createHighlight(@Body() highlightCreateDto: HighlightCreateDto): Promise<GlobalResponse<HighlightInterface>> {

        let data = await this.adminHighlightService.createHighlight(highlightCreateDto)
        return {
            message: 'Highlight created successfully',
            data: data
        }
    }

    @Post('update/:id')
    @ApiOperation({ summary: 'Update highlight' })
    @ApiResponse({ status: 200, description: 'Highlight updated successfully', example:{
        message: 'Highlight updated successfully',
        data: {
            id: 1,
            name: 'Highlight 1',
            image: 'https://yes.sgp1.digitaloceanspaces.com/images/1748402400166-01fea245-19c5-4af5-ba4f-50f97da06d27-rally.png',
            order: 0,
            link: 'mmksi://mimate?page=',
            need_token: 0,
        }
    } })
    async updateHighlight(@Param('id') id: number, @Body() highlightCreateDto: HighlightCreateDto): Promise<GlobalResponse<HighlightInterface>> {
        let data = await this.adminHighlightService.updateHighlight(id, highlightCreateDto)
        return {
            message: 'Highlight updated successfully',
            data: data
        }
    }

    // update order all highlight
    @Post('update-order')
    @ApiOperation({ summary: 'Update order all highlight' })
    @ApiResponse({ status: 200, description: 'Order updated successfully', example:{
        "success": true,
        "alert": {
          "code": 201,
          "message": "Order updated successfully"
        },
        "data": [
          {
            "id": 1,
            "name": "QUIZ MIMATE",
            "image": "https://yes.sgp1.digitaloceanspaces.com/images/1748402341784-6ce46c4a-ea5c-45e3-a9bc-803237503b6c-mimatequiz.png",
            "order": 0,
            "link": "mmksi://mimate?page=",
            "need_token": 0,
            "createdAt": "2025-05-28T03:09:41.000Z",
            "updatedAt": "2025-05-28T03:09:41.000Z",
            "deletedAt": ""
          },
          {
            "id": 2,
            "name": "IIMS 2025",
            "image": "https://yes.sgp1.digitaloceanspaces.com/images/1748402363559-0b3683f5-6506-4b46-98d6-cd3f6a5027d3-imms.png",
            "order": 3,
            "link": "mmksi://mimate?page=",
            "need_token": 0,
            "createdAt": "2025-05-28T03:09:41.000Z",
            "updatedAt": "2025-06-18T05:21:08.000Z",
            "deletedAt": ""
          },
          {
            "id": 3,
            "name": "MITSHUBISHI MOTOR",
            "image": "https://yes.sgp1.digitaloceanspaces.com/images/1748402383048-92a438a5-4c81-4981-8ee0-d821c26d7abd-mitshu.png",
            "order": 0,
            "link": "mmksi://mimate?page=",
            "need_token": 0,
            "createdAt": "2025-05-28T03:10:41.000Z",
            "updatedAt": "2025-05-28T03:10:41.000Z",
            "deletedAt": ""
          },
          {
            "id": 4,
            "name": "MITSHUBISHI RALLY MOTOR",
            "image": "https://yes.sgp1.digitaloceanspaces.com/images/1748402400166-01fea245-19c5-4af5-ba4f-50f97da06d27-rally.png",
            "order": 0,
            "link": "mmksi://mimate?page=",
            "need_token": 0,
            "createdAt": "2025-05-28T03:10:41.000Z",
            "updatedAt": "2025-05-28T03:10:41.000Z",
            "deletedAt": ""
          }
        ]
      } })
    async updateOrderAllHighlight(@Body() highlightUpdateOrderDto: HighlightUpdateOrderDto): Promise<GlobalResponse<HighlightInterface[]>> {
        let data = await this.adminHighlightService.updateOrderAllHighlight(highlightUpdateOrderDto)
        return {    
            message: 'Order updated successfully',
            data: data
        }
    }

    @Delete('delete/:id')
    @ApiOperation({ summary: 'Delete highlight' })
    @ApiResponse({ status: 200, description: 'Highlight deleted successfully', example:{
        message: 'Highlight deleted successfully',
        data: true
    } })
    async deleteHighlight(@Param('id') id: number): Promise<GlobalResponse<Boolean>> {
        let data = await this.adminHighlightService.deleteHighlight(id)
        return {
            message: 'Highlight deleted successfully',
            data: true
        }   
    }
}
