import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CmsMembersGuard } from '../cms-members/cms-members.guard';
import {
  MemberAuthGuard,
  MemberRequest,
} from '../member-auth/member-auth.guard';
import { MemberAuthService } from '../member-auth/member-auth.service';
import { BreathingService } from './breathing.service';
import {
  BreathingIdDto,
  BreathingListDto,
  BreathingPageDto,
  BreathingReportDto,
  BreathingSessionIdDto,
  EndBreathingDto,
  SaveExerciseDto,
  StartBreathingDto,
  UpdateExerciseDto,
} from './breathing.dto';

@Controller('cms-breathing')
@UseGuards(CmsMembersGuard)
export class CmsBreathingController {
  constructor(private readonly breathing: BreathingService) {}
  /** Returns landing copy and durations to authenticated CMS admins. */
  @Header('Cache-Control', 'private, no-store')
  @Get('page')
  async page() {
    return { data: await this.breathing.page() };
  }
  /** Saves the reviewed page revision for an authenticated admin. */
  @Header('Cache-Control', 'private, no-store')
  @Put('page')
  async savePage(
    @Body() input: BreathingPageDto,
    @Req() request: { userData: { id: number } },
  ) {
    return { data: await this.breathing.savePage(input, request.userData.id) };
  }
  /** Returns one row per session for the validated report cohort. */
  @Header('Cache-Control', 'private, no-store')
  @Get('history')
  async history(@Query() query: BreathingReportDto) {
    return { data: await this.breathing.history(query) };
  }
  /** Returns dashboard totals calculated from the same session cohort. */
  @Header('Cache-Control', 'private, no-store')
  @Get('summary')
  async summary(@Query() query: BreathingReportDto) {
    return { data: await this.breathing.summary(query) };
  }
  /** Returns a server-paginated CMS exercise catalog. */
  @Header('Cache-Control', 'private, no-store')
  @Get('exercises')
  async list(@Query() query: BreathingListDto) {
    return { data: await this.breathing.list(query) };
  }
  /** Returns the current exercise and its revision. */
  @Header('Cache-Control', 'private, no-store')
  @Get('exercises/:id')
  async detail(@Param() path: BreathingIdDto) {
    return { data: await this.breathing.detail(path.id) };
  }
  /** Creates a CMS exercise after boundary and upload validation. */
  @Header('Cache-Control', 'private, no-store')
  @Post('exercises')
  async create(
    @Body() input: SaveExerciseDto,
    @Req() request: { userData: { id: number } },
  ) {
    return { data: await this.breathing.save(input, request.userData.id) };
  }
  /** Updates the reviewed exercise revision without changing history. */
  @Header('Cache-Control', 'private, no-store')
  @Patch('exercises/:id')
  async update(
    @Param() path: BreathingIdDto,
    @Body() input: UpdateExerciseDto,
    @Req() request: { userData: { id: number } },
  ) {
    return {
      data: await this.breathing.save(input, request.userData.id, path.id),
    };
  }
}

@Controller('me/breathing')
@UseGuards(MemberAuthGuard)
export class MemberBreathingController {
  constructor(
    private readonly breathing: BreathingService,
    private readonly auth: MemberAuthService,
  ) {}
  /** Returns only published exercises and shared landing content. */
  @Header('Cache-Control', 'private, no-store')
  @Get()
  async catalog() {
    return { data: await this.breathing.catalog() };
  }
  /** Creates or replays one authenticated member session. */
  @Post('sessions') async start(
    @Body() input: StartBreathingDto,
    @Req() request: MemberRequest,
  ) {
    await this.auth.limit(
      'breathing-start',
      String(request.member.id),
      60,
      3600,
    );
    return { data: await this.breathing.start(request.member.id, input) };
  }
  /** Records an owned terminal report and deduplicates retries. */
  @Put('sessions/:id/end') async end(
    @Param() path: BreathingSessionIdDto,
    @Body() input: EndBreathingDto,
    @Req() request: MemberRequest,
  ) {
    await this.auth.limit(
      'breathing-end',
      String(request.member.id),
      120,
      3600,
    );
    return {
      data: await this.breathing.end(request.member.id, path.id, input),
    };
  }
}
