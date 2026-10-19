import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CmsMembersGuard } from '../cms-members/cms-members.guard';
import { EmailDto } from '../member-auth/member-auth.dto';
import { PushNotificationsService } from './push-notifications.service';

type AdminRequest = { userData: { id: number } };

@ApiTags('CMS Push settings')
@ApiBearerAuth('access-token')
@UseGuards(CmsMembersGuard)
@Controller('cms-settings/push')
export class CmsPushSettingsController {
  /** Injects the shared Firebase sender. Returns admin-only notification test operations. */
  constructor(private readonly notifications: PushNotificationsService) {}

  /** Returns safe configuration presence without credentials, file paths or delivery tokens. */
  @Get()
  status(@Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'private, no-store');
    return { data: this.notifications.status() };
  }

  /** Sends a fixed dummy notification only to the chosen member's devices. Returns Firebase acceptance counts. */
  @Post('test')
  @HttpCode(200)
  async sendTest(
    @Body() input: EmailDto,
    @Req() request: AdminRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    response.setHeader('Cache-Control', 'private, no-store');
    return {
      data: await this.notifications.sendTest(input.email, request.userData.id),
    };
  }
}
