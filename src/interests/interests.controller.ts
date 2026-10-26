import {
  Body,
  Controller,
  Delete,
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
  InterestIdDto,
  InterestInputDto,
  InterestListDto,
  InterestRevisionDto,
  UpdateInterestDto,
} from './interests.dto';
import { InterestsService } from './interests.service';

type AdminRequest = { userData: { id: number } };

@ApiTags('CMS Interests')
@ApiBearerAuth('access-token')
@UseGuards(CmsMembersGuard)
@Controller('cms-interests')
export class InterestsController {
  constructor(private readonly interests: InterestsService) {}

  /** Returns the current admin catalog and server pagination metadata. */
  @Get()
  @Header('Cache-Control', 'private, no-store')
  async list(@Query() query: InterestListDto) {
    return { data: await this.interests.list(query) };
  }

  /** Returns one catalog record, including inactive records. */
  @Get(':id')
  @Header('Cache-Control', 'private, no-store')
  async detail(@Param() params: InterestIdDto) {
    return { data: await this.interests.detail(params.id) };
  }

  /** Creates an admin-authored label with validated fields. */
  @Post()
  async create(@Body() input: InterestInputDto, @Req() request: AdminRequest) {
    return { data: await this.interests.save(input, request.userData.id) };
  }

  /** Saves a full reviewed form, rejecting stale updates. */
  @Put(':id')
  async update(
    @Param() params: InterestIdDto,
    @Body() input: UpdateInterestDto,
    @Req() request: AdminRequest,
  ) {
    return {
      data: await this.interests.save(input, request.userData.id, params.id),
    };
  }

  /** Deactivates a reviewed item; catalog identities are never physically removed. */
  @Delete(':id')
  async deactivate(
    @Param() params: InterestIdDto,
    @Body() input: InterestRevisionDto,
    @Req() request: AdminRequest,
  ) {
    return {
      data: await this.interests.deactivate(
        params.id,
        input.revision,
        request.userData.id,
      ),
    };
  }
}
