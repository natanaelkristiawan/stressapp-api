import { Type } from 'class-transformer';
import { ModerationMessagesService } from './moderation-messages.service';
import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsDefined,
  IsObject,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CmsMembersGuard } from '../cms-members/cms-members.guard';
import { ContentModerationService } from './content-moderation.service';

export class ModerationTestDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'content must contain text' })
  @MaxLength(10000)
  content: string;
}

export class ModerationMessagesDto {
  @IsString()
  @Matches(/\S/)
  @MaxLength(2000)
  self_harm: string;
  @IsString()
  @Matches(/\S/)
  @MaxLength(2000)
  sexual: string;
  @IsString()
  @Matches(/\S/)
  @MaxLength(2000)
  sara: string;
  @IsString()
  @Matches(/\S/)
  @MaxLength(2000)
  bullying: string;
}
export class SaveModerationMessagesDto {
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => ModerationMessagesDto)
  messages: ModerationMessagesDto;
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  version: string;
}

@ApiTags('CMS moderation settings')
@ApiBearerAuth('access-token')
@UseGuards(CmsMembersGuard)
@Controller('cms-settings/moderation')
export class CmsModerationSettingsController {
  constructor(
    private readonly moderation: ContentModerationService,
    private readonly messages: ModerationMessagesService,
  ) {}

  /** Returns configuration presence/model only; never exposes the private provider key. */
  @Get()
  @Header('Cache-Control', 'private, no-store')
  status() {
    return { data: this.moderation.status() };
  }

  /** Reads four fixed notification entries and their concurrency version. */
  @Get('messages')
  @Header('Cache-Control', 'private, no-store')
  async listMessages() {
    return { data: await this.messages.read() };
  }

  /** Saves validated plain-text messages atomically; no model prompt or category can be edited. */
  @Put('messages')
  @Header('Cache-Control', 'private, no-store')
  async saveMessages(@Body() input: SaveModerationMessagesDto) {
    return { data: await this.messages.save(input.messages, input.version) };
  }

  /** Runs the member classifier without the CMS bypass; never creates or publishes content. */
  @Post('test')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  async test(
    @Body() input: ModerationTestDto,
    @Req() request: { userData: { id: number } },
  ) {
    return {
      data: await this.moderation.testContent(
        [input.content],
        request.userData.id,
      ),
    };
  }
}
