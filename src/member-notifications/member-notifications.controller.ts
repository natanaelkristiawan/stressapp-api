import { MoodTimeZoneDto } from '../mood-tracker/mood-tracker.dto';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  MemberAuthGuard,
  MemberRequest,
} from '../member-auth/member-auth.guard';
import {
  NotificationIdDto,
  NotificationListDto,
} from './member-notifications.dto';
import { MemberNotificationsService } from './member-notifications.service';

@UseGuards(MemberAuthGuard)
@Controller('me/notifications')
export class MemberNotificationsController {
  constructor(private readonly notifications: MemberNotificationsService) {}

  /** Returns the member-owned timezone used for the fixed 20:00 mood reminder. */
  @Get('settings')
  async settings(@Req() request: MemberRequest) {
    return { data: await this.notifications.settings(request.member.id) };
  }

  /** Saves a validated IANA timezone; clients synchronize it when the device timezone changes. */
  @Patch('settings')
  async saveSettings(
    @Req() request: MemberRequest,
    @Body() input: MoodTimeZoneDto,
  ) {
    return {
      data: await this.notifications.saveSettings(
        request.member.id,
        input.timeZone,
      ),
    };
  }

  /** Returns a paginated category; there is no combined all-category list. */
  @Get()
  async list(
    @Req() request: MemberRequest,
    @Query() input: NotificationListDto,
  ) {
    return { data: await this.notifications.list(request.member.id, input) };
  }

  /** Marks a single notification read and returns the refreshed unread counter. */
  @Patch(':id/read')
  async read(
    @Req() request: MemberRequest,
    @Param() params: NotificationIdDto,
  ) {
    return {
      data: await this.notifications.markRead(request.member.id, params.id),
    };
  }

  /** Soft-deletes a single notification and returns the refreshed unread counter. */
  @Delete(':id')
  async clear(
    @Req() request: MemberRequest,
    @Param() params: NotificationIdDto,
  ) {
    return {
      data: await this.notifications.clear(request.member.id, params.id),
    };
  }
}
