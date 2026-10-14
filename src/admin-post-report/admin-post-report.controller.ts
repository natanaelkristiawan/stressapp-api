import { 
    Controller, 
    Get, 
    Post, 
    Query, 
    Param, 
    Body,
    ParseIntPipe,
    HttpStatus,
    HttpCode,
    Req
} from '@nestjs/common';
import { 
    ApiTags, 
    ApiOperation, 
    ApiResponse, 
    ApiQuery, 
    ApiParam,
    ApiBody,
    ApiBearerAuth
} from '@nestjs/swagger';
import { AdminPostReportService } from './admin-post-report.service';
import { GetPostReportsDto } from './dtos/get-post-reports.dto';
import { GetReportersByPostDto } from './dtos/get-reporters-by-post.dto';
import { GlobalResponse } from 'src/interfaces/global.interface';

@ApiTags('Admin Post Reports')
@ApiBearerAuth('access-token')  
@Controller('admin-post-report')
export class AdminPostReportController {
    constructor(
        private readonly adminPostReportService: AdminPostReportService
    ) {}

    @Get()
    @ApiOperation({
        summary: 'Get paginated list of post reports',
        description: 'Retrieve a paginated list of post reports with Redis caching support. Groups reports by post ID to avoid duplicates.'
    })
    @ApiQuery({
        name: 'limit',
        description: 'Number of items per page (1-100)',
        required: false,
        type: Number,
        example: 10
    })
    @ApiQuery({
        name: 'after',
        description: 'Cursor for pagination (UUID)',
        required: false,
        type: String,
        example: '550e8400-e29b-41d4-a716-446655440000'
    })
    @ApiQuery({
        name: 'search',
        description: 'Search term to filter posts by title',
        required: false,
        type: String,
        example: 'spam content'
    })
    @ApiResponse({
        status: 200,
        description: 'Successfully retrieved post reports with pagination data and post report details'
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid parameters'
    })
    @ApiResponse({
        status: 500,
        description: 'Internal server error'
    })
    async getPostReports(@Query() query: GetPostReportsDto): Promise<GlobalResponse<any>> {
        const data = await this.adminPostReportService.getPostReports(
            query.limit || 10,
            query.after || '',
            query.search || ''
        );
        return {
            message: 'Post reports retrieved successfully',
            data: data
        };
    }

    @Get(':postId/reporters')
    @ApiOperation({
        summary: 'Get all reporters for a specific post',
        description: 'Retrieve all users who reported a specific post with their report details and user information.'
    })
    @ApiParam({
        name: 'postId',
        description: 'ID of the post to get reporters for',
        type: Number,
        example: 123
    })
    @ApiResponse({
        status: 200,
        description: 'Successfully retrieved all reporters for the post with their report details and user information'
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid post ID'
    })
    @ApiResponse({
        status: 404,
        description: 'Post not found'
    })
    async getReportersByPostId(@Param('postId', ParseIntPipe) postId: number): Promise<GlobalResponse<any>> {
        const data = await this.adminPostReportService.getReportersByPostId(postId);
        return {
            message: 'Reporters retrieved successfully',
            data: data
        };
    }

    @Post('not-accepting/:postId')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Not accept post reports',
        description: 'Mark all reports for a post as not accepted. Updates report status and marks as solved with admin action reason.'
    })
    @ApiResponse({
        status: 200,
        description: 'Successfully marked all reports for the post as not accepted with admin action details'
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid parameters'
    })
    @ApiResponse({
        status: 404,
        description: 'Post not found'
    })
    async notAcceptingReport(@Param('postId', ParseIntPipe) postId: number, @Req() request): Promise<GlobalResponse<any>> {
        const {id:userId, name} = request.userData
        const data = await this.adminPostReportService.notAcceptingReport(postId, name);
        return {
            message: 'Reports marked as not accepted successfully',
            data: data
        };
    }

    @Post('hide-post/:postId')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Hide post and resolve reports',
        description: 'Hide a post from users and mark all its reports as resolved. Updates both post visibility and report status.'
    })
    @ApiResponse({
        status: 200,
        description: 'Successfully hidden the post and resolved all its reports with admin action details'
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid parameters'
    })
    @ApiResponse({
        status: 404,
        description: 'Post not found'
    })
    async hidePostReport(@Param('postId', ParseIntPipe) postId: number, @Req() request): Promise<GlobalResponse<any>> {
        const {id:userId, name} = request.userData
        const data = await this.adminPostReportService.hidePostReport(postId, name);
        return {
            message: 'Post hidden and reports resolved successfully',
            data: data
        };
    }

    @Post('delete-post/:postId')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Delete post and resolve reports',
        description: 'Permanently delete a post and mark all its reports as resolved. This action cannot be undone.'
    })
    @ApiResponse({
        status: 200,
        description: 'Successfully deleted the post and resolved all its reports with admin action details'
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid parameters'
    })
    @ApiResponse({
        status: 404,
        description: 'Post not found'
    })
    async deletePostReport(@Param('postId', ParseIntPipe) postId: number, @Req() request): Promise<GlobalResponse<any>> {
        const {id:userId, name} = request.userData
        const data = await this.adminPostReportService.deletePostReport(postId, name);
        return {
            message: 'Post deleted and reports resolved successfully',
            data: data
        };
    }
}
