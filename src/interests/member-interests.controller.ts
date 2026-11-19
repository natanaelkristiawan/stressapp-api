import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GlobalResponse } from '../interfaces/global.interface';
import { MemberAuthGuard } from '../member-auth/member-auth.guard';
import { InterestsService } from './interests.service';

export interface MemberInterestOption {
  id: number;
  name: string;
  description: string;
  sortOrder: number;
}

@ApiTags('Member Interests')
@ApiBearerAuth('access-token')
@UseGuards(MemberAuthGuard)
@Controller('me/interests')
export class MemberInterestsController {
  constructor(private readonly interests: InterestsService) {}

  @Get()
  @Header('Cache-Control', 'private, no-cache')
  @ApiOperation({ summary: 'Daftar preferensi aktif untuk onboarding forum' })
  @ApiResponse({
    status: 200,
    description: 'Berhasil memuat daftar preferensi',
  })
  async list(): Promise<GlobalResponse<MemberInterestOption[]>> {
    return {
      message: 'Berhasil memuat daftar preferensi',
      data: await this.interests.listActive(),
    };
  }
}
