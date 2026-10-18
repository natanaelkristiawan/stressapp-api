import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import {
  MemberAuthGuard,
  MemberRequest,
} from '../member-auth/member-auth.guard';
import { MemberAuthService } from '../member-auth/member-auth.service';
import { MoodAttachmentIdDto } from '../mood-tracker/mood-tracker.dto';
import { MoodUploadService } from './mood-upload.service';

@ApiTags('Mood uploads')
@ApiBearerAuth('access-token')
@UseGuards(MemberAuthGuard)
@Controller('upload/mood')
export class MoodUploadController {
  /** Injects private media and shared rate limits. Returns member-only upload routes. */
  constructor(
    private readonly uploads: MoodUploadService,
    private readonly auth: MemberAuthService,
  ) {}

  /** Uploads a bounded private photo. Returns an attachment ID and short-lived preview URL. */
  @Post('image')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 },
    }),
  )
  async image(
    @Req() req: MemberRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    await this.auth.limit('mood-upload', String(req.member.id), 60, 3600);
    return { data: await this.uploads.upload(req.member.id, 'photo', file) };
  }

  /** Uploads bounded private audio. Returns an attachment ID and short-lived playback URL. */
  @Post('audio')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 0 },
    }),
  )
  async audio(
    @Req() req: MemberRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    await this.auth.limit('mood-upload', String(req.member.id), 60, 3600);
    return { data: await this.uploads.upload(req.member.id, 'audio', file) };
  }

  /** Refreshes private access after ownership validation. Returns safe metadata and an expiring URL. */
  @Get(':id')
  async detail(
    @Req() req: MemberRequest,
    @Param() params: MoodAttachmentIdDto,
  ) {
    return { data: await this.uploads.detail(req.member.id, params.id) };
  }
}
