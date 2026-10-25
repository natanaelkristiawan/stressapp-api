import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { CmsMembersGuard } from '../cms-members/cms-members.guard';
import {
  MemberAuthGuard,
  MemberRequest,
} from '../member-auth/member-auth.guard';
import { MemberAuthService } from '../member-auth/member-auth.service';
import {
  LocationIdDto,
  LocationImportDto,
  LocationInputDto,
  LocationListDto,
  UpdateLocationDto,
} from './psychologists.dto';
import { PsychologistsService } from './psychologists.service';
import { PsychologistsImport } from './psychologists.import';
const upload = FileInterceptor('file', {
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1,
    fields: 1,
    fieldSize: 128,
    parts: 3,
  },
});

@Controller('cms-psychologists')
@UseGuards(CmsMembersGuard)
export class CmsPsychologistsController {
  constructor(
    private readonly directory: PsychologistsService,
    private readonly importer: PsychologistsImport,
    private readonly auth: MemberAuthService,
  ) {}
  /** Lists a bounded admin directory with publication state. */
  @Get()
  @Header('Cache-Control', 'private, no-store')
  async list(@Query() query: LocationListDto) {
    return { data: await this.directory.list(query) };
  }
  /** Loads the selected branch through the existing CMS guard and validated ID. */
  @Get(':id')
  @Header('Cache-Control', 'private, no-store')
  async detail(@Param() path: LocationIdDto) {
    return { data: await this.directory.detail(path.id) };
  }
  /** Creates one validated branch. */
  @Post()
  @Header('Cache-Control', 'private, no-store')
  async create(
    @Body() input: LocationInputDto,
    @Req() request: { userData: { id: number } },
  ) {
    return {
      data: await this.directory.save(input, request.userData.id),
    };
  }
  /** Updates only the reviewed revision. */
  @Patch(':id')
  @Header('Cache-Control', 'private, no-store')
  async update(
    @Param() path: LocationIdDto,
    @Body() input: UpdateLocationDto,
    @Req() request: { userData: { id: number } },
  ) {
    return {
      data: await this.directory.save(input, request.userData.id, path.id),
    };
  }
  /** Downloads the supplied 40-branch workbook without importing data. */
  @Get('import/template')
  async template(@Res() response: Response) {
    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="psychologist-locations.xlsx"',
    );
    response.setHeader('Cache-Control', 'private, no-store');
    response.send(await this.importer.template());
  }
  /** Rejects absent or incorrectly named file uploads before parsing. */
  private file(file: Express.Multer.File) {
    if (!file?.buffer || !/\.xlsx$/i.test(file.originalname)) {
      throw new BadRequestException('Choose an .xlsx workbook.');
    }
    return file.buffer;
  }
  /** Validates every row without publishing until confirmation. */
  @Post('import/preview')
  @Header('Cache-Control', 'private, no-store')
  @UseInterceptors(upload)
  async preview(
    @UploadedFile() file: Express.Multer.File,
    @Req() request: { userData: { id: number } },
  ) {
    await this.auth.limit(
      'directory-preview',
      String(request.userData.id),
      30,
      3600,
    );
    return { data: await this.importer.preview(this.file(file)) };
  }
  /** Publishes new rows in the reviewed file; duplicate branches are skipped. */
  @Post('import/commit')
  @Header('Cache-Control', 'private, no-store')
  @UseInterceptors(upload)
  async commit(
    @UploadedFile() file: Express.Multer.File,
    @Body() input: LocationImportDto,
    @Req() request: { userData: { id: number } },
  ) {
    await this.auth.limit(
      'directory-commit',
      String(request.userData.id),
      10,
      3600,
    );
    return {
      data: await this.importer.commit(
        this.file(file),
        input.expectedHash,
        request.userData.id,
      ),
    };
  }
}
@Controller('me/psychologists')
@UseGuards(MemberAuthGuard)
export class MemberPsychologistsController {
  constructor(
    private readonly directory: PsychologistsService,
    private readonly auth: MemberAuthService,
  ) {}
  /** Returns only published branches, optionally ordered by straight-line distance. */
  @Get()
  @Header('Cache-Control', 'private, no-store')
  async list(@Query() query: LocationListDto, @Req() request: MemberRequest) {
    await this.auth.limit(
      'directory-list',
      String(request.member.id),
      180,
      3600,
    );
    return { data: await this.directory.list(query, true) };
  }
  /** Supplies real published city options. */
  @Get('cities')
  @Header('Cache-Control', 'private, no-store')
  async cities() {
    return { data: await this.directory.cities() };
  }
}
