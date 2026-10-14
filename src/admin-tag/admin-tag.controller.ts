import { Controller, Delete, Get, Param, Query, Res } from '@nestjs/common';
import { AdminTagListDto, AdminTagExportDto } from './dtos/admin-tag.dto';
import { AdminTagService } from './admin-tag.service';
import { Datatable, DataTag } from './interfaces/datatable.interface';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GlobalResponse } from 'src/interfaces/global.interface';
import { AdminPostExportDto, AdminPostListDto } from 'src/admin-post/dtos/admin-post.dto';
import { Datatable as DatatablePost } from 'src/admin-post/interfaces/datatable.interface';
import { Response } from 'express';
import { AdminPostService } from 'src/admin-post/admin-post.service';

@Controller('admin-tag')
@ApiTags('ADMIN TAG')
@ApiBearerAuth('access-token')
export class AdminTagController {

    constructor(private readonly adminTagService: AdminTagService, private readonly adminPostService: AdminPostService) {}

    @Get('list')
    @ApiOperation({ summary: 'Get staff list' })
    @ApiResponse({ status: 200, description: 'Success', example: {}})
    @ApiResponse({ status: 400, description: 'Bad Request', example: {
        "success": false,
        "alert": {
          "code": 400,
          "message": "Bad Request"
        },
        "data": {}
      }})
    async getAllTag(@Query() dto: AdminTagListDto): Promise<GlobalResponse<Datatable>>   {
        const data = await this.adminTagService.getAllTag(dto);

        return {
            message: 'Success',
            data: data,
        }
    }

    @Get('detail/:id')
    @ApiOperation({ summary: 'Get detail tag' })
    @ApiResponse({ status: 200, description: 'Success', example: {
        "success": true,
        "alert": {
          "code": 200,
          "message": "Success"
        },
        "data": {
            "id": 1,
            "title": "Tag 1",
            "slug": "tag-1",
            "postCount": 0
        }
      }})
    @ApiResponse({ status: 400, description: 'Bad Request', example: {
        "success": false,
        "alert": {
          "code": 400,
          "message": "Bad Request"
        },
        "data": {}
      }})
    async getDetailTag(@Param('id') id: number): Promise<GlobalResponse<DataTag>> {
        const data = await this.adminTagService.getDetailTag(id);
        return {
            message: 'Success',
            data: data,
     
        }
    }

    // export tag
    @Get('export')
    @ApiOperation({ summary: 'Export tag' })
    @ApiResponse({ status: 200, description: 'Success', example: {
        "success": true,
        "alert": {
          "code": 200,
          "message": "Success"
        },
        "data": "./public/uploads/tag_list_1749436901940.xlsx"
      }})
    @ApiResponse({ status: 400, description: 'Bad Request', example: {
        "success": false,
        "alert": {  
            "code": 400,
            "message": "Bad Request"
        },
        "data": {}
      }})
    async exportTag(@Query() dto: AdminTagExportDto, @Res() res: Response): Promise<void> {
        const { buffer, filename } = await this.adminTagService.exportTag(dto);
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': buffer.length,
        });
        res.end(buffer);
    }

    // delete tag
    @Delete('delete/:id')
    @ApiOperation({ summary: 'Delete tag' })
    @ApiResponse({ status: 200, description: 'Success', example: {}})
    @ApiResponse({ status: 400, description: 'Bad Request', example: {
        "success": false,
        "alert": {
            "code": 400,
            "message": "Bad Request"
        },
        "data": {}
      }})
    async deleteTag(@Param('id') id: number): Promise<GlobalResponse<void>> {
        const data = await this.adminTagService.deleteTag(id);
        return {
            message: 'Success',
            data: null,
        }
    }

    // get all post by tagId
    @Get('post/:tagId')
    @ApiOperation({ summary: 'Get all post by tagId' })
    @ApiResponse({ status: 200, description: 'Success', example: {}})
    @ApiResponse({ status: 400, description: 'Bad Request', example: {
        "success": false,
        "alert": {
            "code": 400,  
            "message": "Bad Request"
        },
        "data": {}
      }})
    async getPostByTagId(@Query() dto: AdminPostListDto, @Param('tagId') tagId: number): Promise<GlobalResponse<DatatablePost>> {
        const data = await this.adminTagService.getPostByTagId(dto, tagId);
        return {
            message: 'Success',
            data: data,
        }
    }

    // export post by tagId
    @Get('post-export/:tagId')
    @ApiOperation({ summary: 'Export post by tagId' })
    @ApiResponse({ status: 200, description: 'Success', example: {}})
    @ApiResponse({ status: 400, description: 'Bad Request', example: {
        "success": false,
        "alert": {
            "code": 400,
            "message": "Bad Request"  
        },
        "data": {}
      }})
    async exportPostByTagId(@Query() adminPostListDto: AdminPostExportDto, @Res() res: Response, @Param('tagId') tagId: number): Promise<void> {
        const { buffer, filename } = await this.adminPostService.export(adminPostListDto, null, tagId);
        
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': buffer.length,
        });
        
        res.end(buffer);
    }


    
}