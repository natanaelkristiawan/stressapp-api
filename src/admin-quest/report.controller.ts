import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { HeadInfo, DailyPointCollectionResponse, PointTypeDistributionResponse, PostHighestPointResponse, HigherUserPointResponse, LatestPointCollectorResponse } from "./interfaces/report.interface";
import { GlobalResponse } from "src/interfaces/global.interface";
import { ReportService } from "./report.service";
import { ReportFilterDto } from "./dtos/report.dto";

@Controller('admin-quest/report')
@ApiTags('ADMIN-QUEST-REPORT')
@ApiBearerAuth('access-token')
export class ReportController {
    constructor(private readonly reportService: ReportService) { }

    @Get('head-info')
    @ApiOperation({ summary: 'Get head info' })
    async HeadInfo(@Query() filterDto: ReportFilterDto): Promise<GlobalResponse<HeadInfo>> {
        const data = await this.reportService.getHeadInfo(filterDto);
        return {
            message: 'Success',
            data,
        };
    }

    @Get('daily-point-collection')
    @ApiOperation({ summary: 'Get daily point collection' })
    async DailyPointCollection(@Query() filterDto: ReportFilterDto): Promise<GlobalResponse<DailyPointCollectionResponse>> {
        const data = await this.reportService.dailyPointCollection(filterDto);
        return {
            message: 'Success',
            data,
        };
    }

    @Get('point-type-distribution')
    @ApiOperation({ summary: 'Get point type distribution' })
    async PointTypeDistribution(@Query() filterDto: ReportFilterDto): Promise<GlobalResponse<PointTypeDistributionResponse>> {
        const data = await this.reportService.pointTypeDistribution(filterDto);
        return {
            message: 'Success',
            data,
        };
    }

    @Get('post-highest-point')
    @ApiOperation({ summary: 'Get post with highest point' })
    async PostHighestPoint(@Query() filterDto: ReportFilterDto): Promise<GlobalResponse<PostHighestPointResponse>> {
        const data = await this.reportService.postHighestPoint(filterDto);
        return {
            message: 'Success',
            data,
        };
    }

    @Get('higher-user-point')
    @ApiOperation({ summary: 'Get higher user point' })
    async HigherUserPoint(@Query() filterDto: ReportFilterDto): Promise<GlobalResponse<HigherUserPointResponse>> {
        const data = await this.reportService.higherUserPoint(filterDto);
        return {
            message: 'Success',
            data,
        };
    }

    @Get('latest-point-collector')
    @ApiOperation({ summary: 'Get latest point collectors' })
    async LatestPointCollector(): Promise<GlobalResponse<LatestPointCollectorResponse>> {
        const data = await this.reportService.latestPointCollector();
        return {
            message: 'Success',
            data,
        };
    }
}