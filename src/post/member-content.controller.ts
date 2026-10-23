import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  MemberAuthGuard,
  MemberRequest,
} from '../member-auth/member-auth.guard';
import { MemberAuthService } from '../member-auth/member-auth.service';
import {
  ContentEventDto,
  ContentCommentDto,
  ContentCommentIdDto,
  ContentIdDto,
  ContentPageDto,
} from './member-content.dto';
import { MemberContentService } from './member-content.service';

@Controller('me/psychoeducation')
@UseGuards(MemberAuthGuard)
export class MemberContentController {
  constructor(
    private readonly content: MemberContentService,
    private readonly auth: MemberAuthService,
  ) {}
  /** Lists published content with a scoped after cursor. */
  @Get()
  list(@Query() query: ContentPageDto, @Req() request: MemberRequest) {
    return this.content.list(query, request.member.id);
  }
  /** Revalidates eligibility for a single content item. */
  @Get(':id')
  detail(@Param() path: ContentIdDto, @Req() request: MemberRequest) {
    return this.content.detail(path.id, request.member.id);
  }
  /** Returns approved comments and the author's private moderation states. */
  @Get(':id/comments')
  comments(
    @Param() path: ContentIdDto,
    @Query() query: ContentPageDto,
    @Req() request: MemberRequest,
  ) {
    return this.content.comments(path.id, query, request.member.id);
  }
  /** Limits member submissions before saving a pending comment. */
  @Post(':id/comments')
  async create(
    @Param() path: ContentIdDto,
    @Body() body: ContentCommentDto,
    @Req() request: MemberRequest,
  ) {
    await this.auth.limit(
      'content-comment',
      String(request.member.id),
      30,
      3600,
    );
    return this.content.saveComment(
      path.id,
      request.member.id,
      body.content,
      undefined,
      body.requestId,
    );
  }
  /** Resubmits an owned comment for a fresh asynchronous moderation revision. */
  @Patch(':id/comments/:commentId')
  async edit(
    @Param() path: ContentCommentIdDto,
    @Body() body: ContentCommentDto,
    @Req() request: MemberRequest,
  ) {
    await this.auth.limit(
      'content-comment',
      String(request.member.id),
      30,
      3600,
    );
    return this.content.saveComment(
      path.id,
      request.member.id,
      body.content,
      path.commentId,
      body.requestId,
    );
  }
  /** Removes an owned comment without exposing or deleting another author's text. */
  @Delete(':id/comments/:commentId')
  remove(@Param() path: ContentCommentIdDto, @Req() request: MemberRequest) {
    return this.content.deleteComment(
      path.id,
      path.commentId,
      request.member.id,
    );
  }
  /** Records one detail-open event, deduplicating network retries. */
  @Post(':id/views')
  async view(
    @Param() path: ContentIdDto,
    @Body() body: ContentEventDto,
    @Req() request: MemberRequest,
  ) {
    await this.auth.limit('content-view', String(request.member.id), 600, 3600);
    return this.content.view(path.id, request.member.id, body.requestId);
  }
  /** Applies an idempotent like. */
  @Put(':id/like')
  like(@Param() path: ContentIdDto, @Req() request: MemberRequest) {
    return this.content.like(path.id, request.member.id, true);
  }
  /** Applies an idempotent unlike. */
  @Delete(':id/like')
  unlike(@Param() path: ContentIdDto, @Req() request: MemberRequest) {
    return this.content.like(path.id, request.member.id, false);
  }
}
