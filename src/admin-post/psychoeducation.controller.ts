import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CmsMembersGuard } from '../cms-members/cms-members.guard';
import { AdminPostContentService } from './admin-post-content.service';
import {
  PsychoeducationIdDto,
  PsychoeducationCommentsDto,
  PsychoeducationCommentIdDto,
  ModeratePsychoeducationCommentDto,
  PsychoeducationListDto,
  PsychoeducationVersionDto,
  SavePsychoeducationDto,
  UpdatePsychoeducationDto,
} from './dtos/psychoeducation.dto';

@ApiTags('CMS Psychoeducation')
@ApiBearerAuth('access-token')
@UseGuards(CmsMembersGuard)
@Controller('admin-post/psychoeducation')
export class PsychoeducationController {
  /** Reuses the existing Admin Post module and Post table for CMS content. */
  constructor(private readonly content: AdminPostContentService) {}

  /** Returns only nondeleted psychoeducation posts with bounded remote pagination. */
  @Get()
  @Header('Cache-Control', 'private, no-store')
  async list(@Query() query: PsychoeducationListDto) {
    return { data: await this.content.list(query) };
  }

  /** Returns the selected article/video, including drafts, to an active CMS admin. */
  @Get(':id')
  @Header('Cache-Control', 'private, no-store')
  async detail(@Param() params: PsychoeducationIdDto) {
    return { data: await this.content.detail(params.id) };
  }

  /** Lists comments/replies only for an educational post, including drafts for moderation. */
  @Get(':id/comments')
  @Header('Cache-Control', 'private, no-store')
  async comments(
    @Param() params: PsychoeducationIdDto,
    @Query() query: PsychoeducationCommentsDto,
  ) {
    return { data: await this.content.comments(params.id, query) };
  }

  /** Records a human SARA moderation decision and soft-deletes exactly the selected comment. */
  @Delete(':id/comments/:commentId')
  @Header('Cache-Control', 'private, no-store')
  async moderateComment(
    @Param() params: PsychoeducationCommentIdDto,
    @Body() input: ModeratePsychoeducationCommentDto,
    @Req() request: { userData: { id: number } },
  ) {
    await this.content.moderateComment(
      params.id,
      params.commentId,
      input,
      request.userData.id,
    );
    return { data: { id: params.commentId } };
  }

  /** Creates CMS-owned content; clients cannot supply the flag or author. */
  @Post()
  @Header('Cache-Control', 'private, no-store')
  async create(
    @Body() input: SavePsychoeducationDto,
    @Req() request: { userData: { id: number } },
  ) {
    return { data: await this.content.create(input, request.userData.id) };
  }

  /** Replaces editable content fields after checking the current revision. */
  @Patch(':id')
  @Header('Cache-Control', 'private, no-store')
  async update(
    @Param() params: PsychoeducationIdDto,
    @Body() input: UpdatePsychoeducationDto,
  ) {
    return { data: await this.content.update(params.id, input) };
  }

  /** Soft-deletes the post; assets and historical interactions are retained. */
  @Delete(':id')
  @Header('Cache-Control', 'private, no-store')
  async remove(
    @Param() params: PsychoeducationIdDto,
    @Body() input: PsychoeducationVersionDto,
  ) {
    await this.content.remove(params.id, input.revision);
    return { data: { id: params.id } };
  }
}
