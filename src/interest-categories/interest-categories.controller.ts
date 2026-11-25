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
  InterestCategoryIdDto,
  InterestCategoryInputDto,
  InterestCategoryListDto,
  InterestCategoryRevisionDto,
  UpdateInterestCategoryDto,
} from './interest-categories.dto';
import { InterestCategoriesService } from './interest-categories.service';

type AdminRequest = { userData: { id: number } };

@ApiTags('CMS Interest Categories')
@ApiBearerAuth('access-token')
@UseGuards(CmsMembersGuard)
@Controller('cms-interest-categories')
export class InterestCategoriesController {
  constructor(private readonly categories: InterestCategoriesService) {}

  /** Returns the current category catalog and server pagination metadata. */
  @Get()
  @Header('Cache-Control', 'private, no-store')
  async list(@Query() query: InterestCategoryListDto) {
    return { data: await this.categories.list(query) };
  }

  /** Returns every active category for interest assignment selects. */
  @Get('options')
  @Header('Cache-Control', 'private, no-store')
  async options() {
    return { data: await this.categories.listActive() };
  }

  /** Returns one category, including inactive records. */
  @Get(':id')
  @Header('Cache-Control', 'private, no-store')
  async detail(@Param() params: InterestCategoryIdDto) {
    return { data: await this.categories.detail(params.id) };
  }

  /** Creates an admin-authored category with validated fields. */
  @Post()
  async create(
    @Body() input: InterestCategoryInputDto,
    @Req() request: AdminRequest,
  ) {
    return { data: await this.categories.save(input, request.userData.id) };
  }

  /** Saves a full reviewed form, rejecting stale updates. */
  @Put(':id')
  async update(
    @Param() params: InterestCategoryIdDto,
    @Body() input: UpdateInterestCategoryDto,
    @Req() request: AdminRequest,
  ) {
    return {
      data: await this.categories.save(input, request.userData.id, params.id),
    };
  }

  /** Deactivates a reviewed category that no longer has active interests. */
  @Delete(':id')
  async deactivate(
    @Param() params: InterestCategoryIdDto,
    @Body() input: InterestCategoryRevisionDto,
    @Req() request: AdminRequest,
  ) {
    return {
      data: await this.categories.deactivate(
        params.id,
        input.revision,
        request.userData.id,
      ),
    };
  }
}
