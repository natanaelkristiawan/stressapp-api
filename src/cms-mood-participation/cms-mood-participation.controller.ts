import {
  Controller,
  Get,
  Header,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CmsMembersGuard } from '../cms-members/cms-members.guard';
import {
  ParticipationIdDto,
  ParticipationListDto,
  ParticipationRangeDto,
} from './cms-mood-participation.dto';
import { CmsMoodParticipationService } from './cms-mood-participation.service';

@ApiTags('CMS Mood Participation')
@ApiBearerAuth('access-token')
@UseGuards(CmsMembersGuard)
@Controller('cms-mood-participation')
export class CmsMoodParticipationController {
  /** Injects read-only reports protected by the existing live CMS admin guard. */
  constructor(private readonly participation: CmsMoodParticipationService) {}

  /** Loads whole-range participation cards. Returns counts without mood values or private content. */
  @Get('summary')
  @Header('Cache-Control', 'private, no-store')
  async summary(@Query() query: ParticipationRangeDto) {
    return { data: await this.participation.summary(query) };
  }

  /** Loads approved participant/date metadata only. Returns a remote history page. */
  @Get()
  @Header('Cache-Control', 'private, no-store')
  async list(@Query() query: ParticipationListDto) {
    return { data: await this.participation.list(query) };
  }
  /** Loads one approved read-only mood submission for an active CMS admin. */
  @Get(':id')
  @Header('Cache-Control', 'private, no-store')
  async detail(@Param() params: ParticipationIdDto) {
    return { data: await this.participation.detail(params.id) };
  }
}
