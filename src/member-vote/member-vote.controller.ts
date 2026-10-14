import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { GlobalResponse } from 'src/interfaces/global.interface';
import { MemberVoteService } from './member-vote.service';
import { CreateMemberVoteDto } from './dtos/create-member-vote.dto';
import { MemberVote, VoteDetailResponse, VoteOptionMembersResponse } from './interfaces/member-vote.interface';

@ApiTags('MEMBER-VOTE')
@ApiBearerAuth('access-token')
@Controller('member-vote')
export class MemberVoteController {
  constructor(private readonly memberVoteService: MemberVoteService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create member vote', description: 'Submit a vote for an option on a post. Allowed only when current time is within the post vote_start and vote_end. Member is taken from the auth token.' })
  @ApiBody({ type: CreateMemberVoteDto, description: 'Post ID and vote option ID' })
  @ApiResponse({ status: 201, description: 'Vote created successfully.', example: {
    success: true,
    alert: { code: 201, message: 'Vote created successfully' },
    data: {
      id: 1,
      post_id: 1,
      vote_id: 1,
      member: { id: 10245, name: 'Abid Putra', profilePictureUrl: '' },
    },
  }})
  @ApiResponse({ status: 400, description: 'Voting not allowed: outside vote_start/vote_end window' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async create(
    @Body() body: CreateMemberVoteDto,
    @Req() request: { userData: { id: number } },
  ): Promise<GlobalResponse<MemberVote>> {
    const memberId = request.userData.id;
    const { post_id, vote_id } = body;
    const data = await this.memberVoteService.createMemberVote(post_id, vote_id, memberId);
    return {
      message: 'Vote created successfully',
      data,
    };
  }

  @Post('update')
  @ApiOperation({ summary: 'Update member vote', description: 'Change vote to another option. Allowed only when current time is within the post vote_start and vote_end. Old vote is soft-deleted and a new record is created.' })
  @ApiBody({ type: CreateMemberVoteDto, description: 'Post ID and new vote option ID' })
  @ApiResponse({ status: 200, description: 'Vote updated successfully.', example: {
    success: true,
    alert: { code: 200, message: 'Vote updated successfully' },
    data: {
      id: 2,
      post_id: 1,
      vote_id: 2,
      member: { id: 10245, name: 'Abid Putra', profilePictureUrl: '' },
    },
  }})
  @ApiResponse({ status: 400, description: 'Voting not allowed: outside vote_start/vote_end window' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async update(
    @Body() body: CreateMemberVoteDto,
    @Req() request: { userData: { id: number } },
  ): Promise<GlobalResponse<MemberVote>> {
    const memberId = request.userData.id;
    const { post_id, vote_id } = body;
    const data = await this.memberVoteService.updateMemberVote(post_id, vote_id, memberId);
    return {
      message: 'Vote updated successfully',
      data,
    };
  }

  @Delete('delete/:post_id')
  @ApiOperation({ summary: 'Delete member vote', description: 'Remove your vote for the post. Allowed only when current time is within the post vote_start and vote_end. Vote is soft-deleted and totals are recalculated.' })
  @ApiParam({ name: 'post_id', type: Number, description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Vote deleted successfully.', example: {
    success: true,
    alert: { code: 200, message: 'Vote deleted successfully' },
    data: {},
  }})
  @ApiResponse({ status: 400, description: 'Voting not allowed: outside vote_start/vote_end window' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  async delete(
    @Param('post_id', ParseIntPipe) post_id: number,
    @Req() request: { userData: { id: number } },
  ): Promise<GlobalResponse<Record<string, never>>> {
    const memberId = request.userData.id;
    await this.memberVoteService.deleteMemberVote(post_id, memberId);
    return {
      message: 'Vote deleted successfully',
      data: {},
    };
  }

  @Get('detail-post-vote/:post_id')
  @ApiOperation({ summary: 'Get vote summary by post', description: 'Returns each vote option with total_vote and percentage. When authenticated, includes my_vote_id so client knows if the user already voted and which option.' })
  @ApiParam({ name: 'post_id', type: Number, description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Vote detail with percentages and current user vote (if authenticated).', example: {
    success: true,
    alert: { code: 200, message: 'Success get data' },
    data: {
      post_id: 1,
      total_votes: 10,
      votes: [
        { id: 1, vote: 'Option A', total_vote: 6, percentage: 60 },
        { id: 2, vote: 'Option B', total_vote: 4, percentage: 40 },
      ],
      my_vote_id: 1,
    },
  }})
  @ApiResponse({ status: 404, description: 'Not Found' })
  async getDetail(
    @Param('post_id', ParseIntPipe) post_id: number,
    @Req() request: { userData?: { id: number } },
  ): Promise<GlobalResponse<VoteDetailResponse>> {
    const memberId = request.userData?.id;
    const data = await this.memberVoteService.getVoteDetailByPostId(post_id, memberId);
    return {
      message: 'Success get data',
      data,
    };
  }

  @Get('detail-vote/:vote_id')
  @ApiOperation({ summary: 'Get members who voted for an option', description: 'Returns the vote option and the list of members who voted for it.' })
  @ApiParam({ name: 'vote_id', type: Number, description: 'Vote option ID' })
  @ApiResponse({ status: 200, description: 'Vote option with list of members who voted.', example: {
    success: true,
    alert: { code: 200, message: 'Success get data' },
    data: {
      vote_id: 1,
      vote: 'Option A',
      total_vote: 6,
      members: [
        { id: 10245, name: 'Abid Putra', profilePictureUrl: '' },
        { id: 10246, name: 'John Doe', profilePictureUrl: 'https://...' },
      ],
    },
  }})
  @ApiResponse({ status: 404, description: 'Not Found' })
  async getDetailVote(
    @Param('vote_id', ParseIntPipe) vote_id: number,
  ): Promise<GlobalResponse<VoteOptionMembersResponse>> {
    const data = await this.memberVoteService.getMembersByVoteId(vote_id);
    return {
      message: 'Success get data',
      data,
    };
  }

  @Get('export-report/:post_id')
  @ApiOperation({ summary: 'Export vote report as CSV', description: 'Returns CSV with summary (options and counts) and voters per option. Filename: vote-report-post-{post_id}.csv' })
  @ApiParam({ name: 'post_id', type: Number, description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async exportReportCsv(
    @Param('post_id', ParseIntPipe) post_id: number,
    @Res() res: Response,
  ): Promise<void> {
    const { csv, filename } = await this.memberVoteService.getVoteReportCsv(post_id);
    const buffer = Buffer.from(csv, 'utf-8');
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    });
    res.end(buffer);
  }
}
