import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { CmsMembersGuard } from '../cms-members/cms-members.guard';
import { ContentModerationService } from './content-moderation.service';

export class ModerationTestDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'content must contain text' })
  @MaxLength(10000)
  content: string;
}

@ApiTags('CMS moderation settings')
@ApiBearerAuth('access-token')
@UseGuards(CmsMembersGuard)
@Controller('cms-settings/moderation')
export class CmsModerationSettingsController {
  constructor(private readonly moderation: ContentModerationService) {}

  /** Returns configuration presence/model only; never exposes the private provider key. */
  @Get()
  @Header('Cache-Control', 'private, no-store')
  status() {
    return { data: this.moderation.status() };
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
      data: await this.moderation.moderateContent(
        [input.content],
        request.userData.id,
      ),
    };
  }
}
