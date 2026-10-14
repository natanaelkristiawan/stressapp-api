import { Body, Controller, Post, Req, Get, Query } from '@nestjs/common';
import { PostReportService } from './post-report.service';
import { CreatePostReportDto } from './dto/create-post-report.dto';
import { GetPostReportsDto } from './dto/get-post-reports.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PostReportInterface, PostReportCollectionResponse } from './interfaces/post-report.interface';
import { GlobalResponse } from 'src/interfaces/global.interface';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@Controller('post-report')
@ApiTags('POST-REPORT')
@ApiBearerAuth('access-token')
export class PostReportController {
    constructor(private readonly postReportService: PostReportService) {}


    // create documentation for this endpoint
    @Post()
    @ApiOperation({ summary: 'Create a post report' })
    @ApiResponse({ status: 201, description: 'The post report has been successfully created.' })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    // set async
    async createPostReport(@Body() createPostReportDto: CreatePostReportDto, @Req() request):Promise< GlobalResponse<PostReportInterface>> {

        const {id:userId} = request.userData

        let response = await this.postReportService.createPostReport(createPostReportDto, userId);

        return {
            message: "Success create post report",
            data: response
        }
    }

    @Get()
    @ApiOperation({ summary: 'Get all post reports' })
    @ApiResponse({ 
        status: 200, 
        description: 'Successfully retrieved post reports',
        example: {
            "success": true,
            "message": "Success get data",
            "data": {
                "totalData": 10,
                "hasNext": true,
                "page": 1,
                "limit": 15,
                "offset": 0,
                "after": "9b8c9f6a-bdcc-4fd3-8c35-78c257755a3f",
                "data": [
                    {
                        "id": 1,
                        "reason": "spam",
                        "description": "This post contains spam content",
                        "createdAt": "2025-01-15T10:30:00.000Z",
                        "post": {
                            "id": 123,
                            "title": "Sample Post Title"
                        },
                        "reportedById": {
                            "id": 456,
                            "name": "John Doe",
                            "profilePictureUrl": "https://example.com/profile.jpg"
                        }
                    }
                ]
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getPostReports(@Query() param: GetPostReportsDto): Promise<GlobalResponse<PostReportCollectionResponse>> {
        const { limit, after, order } = param;
        
        let response = await this.postReportService.getPostReports(limit, after, order);
        
        return {
            message: "Success get data",
            data: response
        };
    }
}