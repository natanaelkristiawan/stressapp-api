import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  MemberAuthGuard,
  MemberRequest,
} from '../member-auth/member-auth.guard';
import { InitialMoodDto, SubmitAssessmentDto } from './assessment.dto';
import { AssessmentService } from './assessment.service';

@ApiTags('Assessment')
@ApiBearerAuth('access-token')
@UseGuards(MemberAuthGuard)
@Controller('me/assessment')
export class AssessmentController {
  /** Injects member assessment operations. Returns authenticated routes. */
  constructor(private readonly assessments: AssessmentService) {}

  /** Loads only the current member's progress. Returns current questions or the historical result. */
  @Get()
  async status(@Req() req: MemberRequest) {
    return { data: await this.assessments.status(req.member.id) };
  }

  /** Saves the separate initial mood step. Returns feedback metadata. */
  @Put('mood')
  async mood(@Req() req: MemberRequest, @Body() input: InitialMoodDto) {
    return { data: await this.assessments.saveMood(req.member.id, input) };
  }

  /** Completes the baseline exactly once. Returns a server-calculated result. */
  @Put()
  async submit(@Req() req: MemberRequest, @Body() input: SubmitAssessmentDto) {
    return { data: await this.assessments.submit(req.member.id, input) };
  }
}
