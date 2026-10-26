import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  MemberAuthGuard,
  MemberRequest,
} from 'src/member-auth/member-auth.guard';
import { GlobalResponse } from 'src/interfaces/global.interface';
import {
  CreateMemberForumCommentDto,
  CreateMemberForumPostDto,
  MemberForumCommentsQueryDto,
  MemberForumFeedQueryDto,
  ReportMemberForumPostDto,
  ToggleReactionDto,
} from './dtos/member-forum.dto';
import {
  FormattedCommunity,
  FormattedForumComment,
  FormattedForumPost,
  MemberForumService,
} from './member-forum.service';

@Controller('me/forum')
@ApiTags('MEMBER FORUM')
@ApiBearerAuth('access-token')
@UseGuards(MemberAuthGuard)
export class MemberForumController {
  constructor(private readonly forumService: MemberForumService) {}

  @Get('posts')
  @ApiOperation({ summary: 'Get paginated forum feed by tab' })
  async getFeed(
    @Query() query: MemberForumFeedQueryDto,
    @Req() request: MemberRequest,
  ): Promise<
    GlobalResponse<{
      items: FormattedForumPost[];
      hasNext: boolean;
      after: string;
      totalData: number;
    }>
  > {
    const data = await this.forumService.getFeed(query, request.member.id);
    return {
      message: 'Success',
      data,
    };
  }

  @Get('posts/:id')
  @ApiOperation({ summary: 'Get single forum post detail' })
  async getPostDetail(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: MemberRequest,
  ): Promise<GlobalResponse<FormattedForumPost>> {
    const data = await this.forumService.getPostDetail(id, request.member.id);
    return {
      message: 'Success',
      data,
    };
  }

  @Post('posts')
  @ApiOperation({ summary: 'Create a new forum post' })
  async createPost(
    @Body() dto: CreateMemberForumPostDto,
    @Req() request: MemberRequest,
  ): Promise<GlobalResponse<FormattedForumPost>> {
    const data = await this.forumService.createPost(dto, request.member.id);
    return {
      message: 'Success create post',
      data,
    };
  }

  @Patch('posts/:id')
  async updatePost(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateMemberForumPostDto,
    @Req() request: MemberRequest,
  ): Promise<GlobalResponse<FormattedForumPost>> {
    const data = await this.forumService.updatePost(id, dto, request.member.id);
    return { message: 'Success update post', data };
  }

  @Delete('posts/:id')
  @ApiOperation({ summary: 'Delete an owned forum post' })
  async deletePost(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: MemberRequest,
  ): Promise<GlobalResponse<boolean>> {
    const data = await this.forumService.deletePost(id, request.member.id);
    return {
      message: 'Success delete post',
      data,
    };
  }

  @Post('posts/:id/reactions')
  @ApiOperation({ summary: 'Toggle like / reaction on a post' })
  async toggleReaction(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ToggleReactionDto,
    @Req() request: MemberRequest,
  ): Promise<GlobalResponse<{ reacted: boolean; likes: number }>> {
    const data = await this.forumService.toggleReaction(
      id,
      request.member.id,
      dto.reaction || 'heart',
    );
    return {
      message: 'Success',
      data,
    };
  }

  @Get('posts/:id/comments')
  @ApiOperation({ summary: 'Get comments for a forum post' })
  async getComments(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: MemberForumCommentsQueryDto,
    @Req() request: MemberRequest,
  ): Promise<
    GlobalResponse<{
      items: FormattedForumComment[];
      hasNext: boolean;
      after: string;
      totalData: number;
    }>
  > {
    const data = await this.forumService.getComments(
      id,
      request.member.id,
      query.limit || 15,
      query.after || '',
    );
    return {
      message: 'Success',
      data,
    };
  }

  @Post('posts/:id/comments')
  @ApiOperation({ summary: 'Post a comment or reply' })
  async createComment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateMemberForumCommentDto,
    @Req() request: MemberRequest,
  ): Promise<GlobalResponse<FormattedForumComment>> {
    const data = await this.forumService.createComment(
      id,
      request.member.id,
      dto,
    );
    return {
      message: 'Success create comment',
      data,
    };
  }

  @Delete('comments/:commentId')
  @ApiOperation({ summary: 'Delete an owned forum comment' })
  async deleteComment(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Req() request: MemberRequest,
  ): Promise<GlobalResponse<boolean>> {
    const data = await this.forumService.deleteComment(
      commentId,
      request.member.id,
    );
    return {
      message: 'Success delete comment',
      data,
    };
  }

  @Get('communities')
  @ApiOperation({ summary: 'Get all communities with joined status' })
  async getCommunities(
    @Req() request: MemberRequest,
  ): Promise<GlobalResponse<FormattedCommunity[]>> {
    const data = await this.forumService.getCommunities(request.member.id);
    return {
      message: 'Success',
      data,
    };
  }

  @Get('communities/:id')
  @ApiOperation({ summary: 'Get single community details' })
  async getCommunityDetail(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: MemberRequest,
  ): Promise<GlobalResponse<FormattedCommunity>> {
    const data = await this.forumService.getCommunityDetail(
      id,
      request.member.id,
    );
    return {
      message: 'Success',
      data,
    };
  }

  @Post('communities/:id/join')
  @ApiOperation({ summary: 'Join a community' })
  async joinCommunity(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: MemberRequest,
  ): Promise<GlobalResponse<boolean>> {
    const data = await this.forumService.joinCommunity(id, request.member.id);
    return {
      message: 'Success join community',
      data,
    };
  }

  @Post('communities/:id/leave')
  @ApiOperation({ summary: 'Leave a community' })
  async leaveCommunity(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: MemberRequest,
  ): Promise<GlobalResponse<boolean>> {
    const data = await this.forumService.leaveCommunity(id, request.member.id);
    return {
      message: 'Success leave community',
      data,
    };
  }

  @Post('posts/:id/report')
  @ApiOperation({ summary: 'Report a forum post' })
  async reportPost(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReportMemberForumPostDto,
    @Req() request: MemberRequest,
  ): Promise<GlobalResponse<boolean>> {
    const data = await this.forumService.reportPost(id, dto, request.member.id);
    return {
      message: 'Success report post',
      data,
    };
  }
}
