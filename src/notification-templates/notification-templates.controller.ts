import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CmsMembersGuard } from '../cms-members/cms-members.guard';
import {
  NotificationTemplateTypeDto,
  SaveNotificationTemplateDto,
} from './notification-templates.dto';
import { NotificationTemplatesService } from './notification-templates.service';

type AdminRequest = { userData: { id: number } };

@ApiTags('CMS Notification Templates')
@ApiBearerAuth('access-token')
@UseGuards(CmsMembersGuard)
@Controller('cms-notification-templates')
export class NotificationTemplatesController {
  constructor(private readonly templates: NotificationTemplatesService) {}

  /** Returns the fixed automatic-template catalog, including unconfigured slots. */
  @Get()
  @Header('Cache-Control', 'private, no-store')
  async list() {
    return { data: await this.templates.list() };
  }

  /** Returns the current reviewed text and revision for one category. */
  @Get(':type')
  @Header('Cache-Control', 'private, no-store')
  async detail(@Param() params: NotificationTemplateTypeDto) {
    return { data: await this.templates.detail(params.type) };
  }

  /** Replaces one automatic template; this operation never sends a notification. */
  @Put(':type')
  @Header('Cache-Control', 'private, no-store')
  async save(
    @Param() params: NotificationTemplateTypeDto,
    @Body() input: SaveNotificationTemplateDto,
    @Req() request: AdminRequest,
  ) {
    return {
      data: await this.templates.save(params.type, input, request.userData.id),
    };
  }
}
