import {
  Controller,
  Get,
  Header,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CmsMembersGuard } from '../cms-members/cms-members.guard';
import {
  ActivityLogQueryDto,
  LogIdDto,
  NotificationLogQueryDto,
} from './cms-logs.dto';
import { CmsLogsService } from './cms-logs.service';

@ApiTags('CMS Logs')
@ApiBearerAuth('access-token')
@UseGuards(CmsMembersGuard)
@Controller('cms-logs')
export class CmsLogsController {
  constructor(private readonly logs: CmsLogsService) {}

  /** Lists activity metadata under live admin authorization. */
  @Get('activity')
  @Header('Cache-Control', 'private, no-store')
  async activity(@Query() query: ActivityLogQueryDto) {
    return { data: await this.logs.activity(query) };
  }

  /** Returns one activity audit record, without raw submitted content. */
  @Get('activity/:id')
  @Header('Cache-Control', 'private, no-store')
  async activityDetail(@Param() params: LogIdDto) {
    return { data: await this.logs.activityDetail(params.id) };
  }

  /** Lists notification history, including read and cleared records. */
  @Get('notification')
  @Header('Cache-Control', 'private, no-store')
  async notification(@Query() query: NotificationLogQueryDto) {
    return { data: await this.logs.notification(query) };
  }

  /** Returns notification text/status only, never private chat content or device tokens. */
  @Get('notification/:id')
  @Header('Cache-Control', 'private, no-store')
  async notificationDetail(@Param() params: LogIdDto) {
    return { data: await this.logs.notificationDetail(params.id) };
  }
}
