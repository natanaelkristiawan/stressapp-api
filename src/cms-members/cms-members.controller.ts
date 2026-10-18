import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CmsMembersService } from './cms-members.service';
import { CmsMembersGuard } from './cms-members.guard';
import {
  EditMemberDto,
  MemberIdDto,
  MemberListDto,
  MemberVersionDto,
  SuspendMemberDto,
  VerifyMemberDto,
} from './cms-members.dto';

type AdminRequest = { userData: { id: number } };

@ApiTags('CMS Members')
@ApiBearerAuth('access-token')
@UseGuards(CmsMembersGuard)
@Controller('cms-members')
export class CmsMembersController {
  /** Injects member operations. Returns a validated CMS-only controller. */
  constructor(private readonly members: CmsMembersService) {}

  /** Lists filtered mobile accounts. Returns server pagination metadata and safe rows. */
  @Get()
  async list(@Query() query: MemberListDto) {
    return { data: await this.members.list(query) };
  }

  /** Loads a mobile profile. Returns safe detail or 404. */
  @Get(':id')
  async detail(@Param() params: MemberIdDto) {
    return { data: await this.members.detail(params.id) };
  }

  /** Edits allowed profile fields. Returns the updated mobile profile. */
  @Put(':id')
  async edit(
    @Param() params: MemberIdDto,
    @Body() input: EditMemberDto,
    @Req() request: AdminRequest,
  ) {
    return {
      data: await this.members.edit(params.id, request.userData.id, input),
    };
  }

  /** Suspends/restores access. Returns the profile after revocation when applicable. */
  @Patch(':id/suspension')
  async suspend(
    @Param() params: MemberIdDto,
    @Body() input: SuspendMemberDto,
    @Req() request: AdminRequest,
  ) {
    return {
      data: await this.members.suspend(params.id, request.userData.id, input),
    };
  }

  /** Sets a separate profile badge. Returns detail without changing email verification. */
  @Patch(':id/verification')
  async verify(
    @Param() params: MemberIdDto,
    @Body() input: VerifyMemberDto,
    @Req() request: AdminRequest,
  ) {
    return {
      data: await this.members.verify(params.id, request.userData.id, input),
    };
  }

  /** Soft-deletes a mobile account. Returns confirmation without deleting related content. */
  @Delete(':id')
  async remove(
    @Param() params: MemberIdDto,
    @Body() input: MemberVersionDto,
    @Req() request: AdminRequest,
  ) {
    await this.members.remove(params.id, request.userData.id, input);
    return { message: 'Member deleted.', data: { id: params.id } };
  }
}
