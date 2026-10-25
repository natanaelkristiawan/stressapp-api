import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Header,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsString, Matches } from 'class-validator';
import { Response } from 'express';
import { CmsMembersGuard } from '../cms-members/cms-members.guard';
import { MemberAuthService } from '../member-auth/member-auth.service';
import { ContentImportService } from './content-import.service';
import { MAX_IMPORT_BYTES } from './content-import.format';
import { contentImportTemplate } from './content-import.template';

export class ContentImportCommitDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  expectedHash: string;
}
const upload = FileInterceptor('file', {
  limits: {
    fileSize: MAX_IMPORT_BYTES,
    files: 1,
    fields: 1,
    fieldSize: 128,
    // Busboy emits partsLimit when the threshold is reached, including a valid file + hash.
    parts: 3,
  },
});

@Controller('admin-post/psychoeducation/import')
@UseGuards(CmsMembersGuard)
export class ContentImportController {
  constructor(
    private readonly importer: ContentImportService,
    private readonly auth: MemberAuthService,
  ) {}

  /** Downloads the 17-video example and its field instructions without publishing any data. */
  @Get('template')
  async template(@Res() response: Response) {
    const buffer = await contentImportTemplate();
    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="psychoeducation-content-example.xlsx"',
    );
    response.setHeader('Cache-Control', 'private, no-store');
    response.send(buffer);
  }

  /** Requires an actual uploaded XLSX; ZIP/XML and field validation happen in the importer. */
  private file(file: Express.Multer.File): Buffer {
    if (!file?.buffer || !/\.xlsx$/i.test(file.originalname)) {
      throw new BadRequestException(
        'Choose an .xlsx file using the downloaded template.',
      );
    }
    return file.buffer;
  }

  /** Returns errors, duplicate skips and planned categories without writing content/categories. */
  @Post('preview')
  @Header('Cache-Control', 'private, no-store')
  @UseInterceptors(upload)
  async preview(
    @UploadedFile() file: Express.Multer.File,
    @Req() request: { userData: { id: number } },
  ) {
    await this.auth.limit(
      'cms-content-import-preview',
      String(request.userData.id),
      30,
      3600,
    );
    return { data: await this.importer.preview(this.file(file)) };
  }

  /** Revalidates the exact reviewed file and atomically saves drafts after explicit confirmation. */
  @Post('commit')
  @Header('Cache-Control', 'private, no-store')
  @UseInterceptors(upload)
  async commit(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: ContentImportCommitDto,
    @Req() request: { userData: { id: number } },
  ) {
    await this.auth.limit(
      'cms-content-import-commit',
      String(request.userData.id),
      10,
      3600,
    );
    return {
      data: await this.importer.commit(
        this.file(file),
        body.expectedHash,
        request.userData.id,
      ),
    };
  }
}
