import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CmsMembersGuard } from '../cms-members/cms-members.guard';
import {
  AssessmentDefinitionDto,
  AssessmentIdDto,
  AssessmentListDto,
  EditAssessmentDto,
  PublishAssessmentDto,
} from './assessment.dto';
import { AssessmentService } from './assessment.service';

interface CmsRequest {
  userData: { id: number };
}

@ApiTags('CMS Assessment')
@ApiBearerAuth('access-token')
@UseGuards(CmsMembersGuard)
@Controller('cms-assessments')
export class CmsAssessmentController {
  /** Injects shared questionnaire operations. Returns CMS configuration routes only. */
  constructor(private readonly assessments: AssessmentService) {}

  /** Lists version metadata. Returns a bounded remote page. */
  @Get()
  @Header('Cache-Control', 'private, no-store')
  async list(@Query() query: AssessmentListDto) {
    return { data: await this.assessments.list(query) };
  }

  /** Loads questionnaire configuration. Returns no member responses. */
  @Get(':id')
  @Header('Cache-Control', 'private, no-store')
  async detail(@Param() params: AssessmentIdDto) {
    return { data: await this.assessments.detail(params.id) };
  }

  /** Creates a complete draft. Returns the new configuration and revision. */
  @Post()
  async create(@Req() req: CmsRequest, @Body() input: AssessmentDefinitionDto) {
    return { data: await this.assessments.create(input, req.userData.id) };
  }

  /** Replaces an unpublished draft. Returns its incremented revision. */
  @Put(':id')
  async edit(
    @Param() params: AssessmentIdDto,
    @Body() input: EditAssessmentDto,
  ) {
    return { data: await this.assessments.edit(params.id, input) };
  }

  /** Activates approved scoring and freezes this version. Returns the published definition. */
  @Post(':id/publish')
  async publish(
    @Req() req: CmsRequest,
    @Param() params: AssessmentIdDto,
    @Body() input: PublishAssessmentDto,
  ) {
    return {
      data: await this.assessments.publish(params.id, input, req.userData.id),
    };
  }
}
