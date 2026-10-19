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
  constructor(private readonly devices: PushDevicesService) {}

  /** Saves current device after login or OTP registration. Returns safe subscription metadata. */
  @Put()
  async save(@Req() req: MemberRequest, @Body() input: SavePushDeviceDto) {
    return {
      data: await this.devices.save(req.member.id, req.sessionId, input),
    };
  }

  /** Unsubscribes only the current session/platform. Returns idempotent confirmation. */
  @Delete(':platform')
  async remove(@Req() req: MemberRequest, @Param() params: PushPlatformDto) {
    return { data: await this.devices.remove(req.sessionId, params.platform) };
  }
}
