import {
  Body,
  Controller,
  Delete,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  MemberAuthGuard,
  MemberRequest,
} from '../member-auth/member-auth.guard';
import { PushPlatformDto, SavePushDeviceDto } from './push-devices.dto';
import { PushDevicesService } from './push-devices.service';

@ApiTags('Push devices')
@ApiBearerAuth('access-token')
@UseGuards(MemberAuthGuard)
@Controller('me/push-devices')
export class PushDevicesController {
  /** Injects session-owned token registration. Returns member-only routes. */
  constructor(private readonly pushDevicesService: PushDevicesService) {}

  /** Saves current device after login or OTP registration. Returns safe subscription metadata. */
  @Put()
  async save(@Req() request: MemberRequest, @Body() input: SavePushDeviceDto) {
    return {
      data: await this.pushDevicesService.save(
        request.member.id,
        request.sessionId,
        input,
      ),
    };
  }

  /** Unsubscribes only the current session/platform. Returns idempotent confirmation. */
  @Delete(':platform')
  async remove(
    @Req() request: MemberRequest,
    @Param() params: PushPlatformDto,
  ) {
    return {
      data: await this.pushDevicesService.remove(
        request.sessionId,
        params.platform,
      ),
    };
  }
}
