import { Controller, Get, Query } from '@nestjs/common';
import { TagsDto } from './dtos/tags.dto';
import { TagService } from './tag.service';
import { TagsInterface } from './interfaces/tags.interface';
import { GlobalResponse } from 'src/interfaces/global.interface';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@Controller('tag')
@ApiTags('TAG')
@ApiBearerAuth('access-token')
export class TagController {
    constructor(private readonly tagService: TagService) {}

    @Get()
    @ApiOperation({summary: 'Get tags'})
    @ApiResponse({status: 200, description: 'Tags fetched successfully', example:{
        "success": true,
        "alert": {
            "code": 200,
            "message": "Tags fetched successfully"
        },
        "data": []
    }})
    async getTags(@Query() tagsDto: TagsDto): Promise<GlobalResponse<TagsInterface[]>> {
        const tags = await this.tagService.getTags(tagsDto);
        return {
            message: 'Tags fetched successfully',
            data: tags,
        };
    }
}
