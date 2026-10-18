import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  MemberAuthGuard,
  MemberRequest,
} from '../member-auth/member-auth.guard';
import {
  MoodDateDto,
  MoodListDto,
  MoodSummaryDto,
  MoodTimeZoneDto,
  SaveMoodDto,
} from './mood-tracker.dto';
import { MoodTrackerService } from './mood-tracker.service';

@ApiTags('Mood Tracker')
@ApiBearerAuth('access-token')
@UseGuards(MemberAuthGuard)
@Controller('me')
export class MoodTrackerController {
  /** Injects the feature service. Returns authenticated mood routes. */
  constructor(private readonly moods: MoodTrackerService) {}

  /** Loads calendar/history entries. Returns member-only paginated data. */
  @Get('moods')
  async list(@Req() req: MemberRequest, @Query() query: MoodListDto) {
    return { data: await this.moods.list(req.member.id, query) };
  }

  /** Loads chart data. Returns real counts and null gaps for the requested dates. */
  @Get('mood-summary')
  async summary(@Req() req: MemberRequest, @Query() query: MoodSummaryDto) {
    return {
      data: {
        ...(await this.moods.summary(req.member.id, query)),
        grouping: query.grouping,
      },
    };
  }

  /** Loads a single local day. Returns safe detail or 404. */
  @Get('moods/:date')
  async detail(
    @Req() req: MemberRequest,
    @Param() params: MoodDateDto,
    @Query() _query: MoodTimeZoneDto,
  ) {
    // Query validation is intentional; date keys identify the stored local day across travel.
    void _query;
    return { data: await this.moods.detail(req.member.id, params.date) };
  }

  /** Creates/replaces today's mood. Returns the saved entry without creating duplicates. */
  @Put('moods/:date')
  async save(
    @Req() req: MemberRequest,
    @Param() params: MoodDateDto,
    @Body() input: SaveMoodDto,
  ) {
    return { data: await this.moods.save(req.member.id, params.date, input) };
  }
}
