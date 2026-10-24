import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsArray,
  ArrayMaxSize,
  ArrayUnique,
  IsBoolean,
  ValidateIf,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Matches,
  Min,
} from 'class-validator';

export class PsychoeducationIdDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;
}

export class PsychoeducationListDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  categoryId?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @IsOptional()
  @IsIn(['article', 'video'])
  contentType?: 'article' | 'video';

  @IsOptional()
  @IsIn(['draft', 'published'])
  status?: 'draft' | 'published';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsIn(['title', 'createdAt', 'updatedAt', 'publishedAt'])
  sort = 'createdAt';

  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';
}

export class SavePsychoeducationDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(2147483647, { each: true })
  categoryIds?: number[];

  @IsIn(['article', 'video'])
  contentType: 'article' | 'video';

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100000)
  body?: string;

  @IsOptional()
  @IsUrl({
    protocols: ['https', 'http'],
    require_protocol: true,
    require_tld: false,
  })
  @MaxLength(2048)
  thumbnailUrl?: string;

  @IsOptional()
  @IsUrl({
    protocols: ['https', 'http'],
    require_protocol: true,
    require_tld: false,
  })
  @MaxLength(2048)
  videoUrl?: string;

  @IsOptional()
  @IsIn(['self', 'youtube'])
  videoSource?: 'self' | 'youtube';

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  youtubeUrl?: string;

  @IsIn(['draft', 'published'])
  status: 'draft' | 'published';
}

export class PsychoeducationVersionDto {
  @IsInt()
  @Min(1)
  revision: number;
}

export class UpdatePsychoeducationDto extends SavePsychoeducationDto {
  @IsInt()
  @Min(1)
  revision: number;
}

export class PsychoeducationCommentsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}

export class PsychoeducationCommentIdDto extends PsychoeducationIdDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  commentId: number;
}

export class ModeratePsychoeducationCommentDto {
  @IsIn(['sara', 'admin_delete'])
  reason: 'sara' | 'admin_delete';

  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  version: string;
}

export class ContentCategoryNameDto {
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.normalize('NFKC').trim().replace(/\s+/g, ' ')
      : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;
}
export class UpdateContentCategoryDto extends ContentCategoryNameDto {
  @IsBoolean()
  active: boolean;

  @IsInt()
  @Min(1)
  revision: number;
}

/** Validates the cross-content CMS comment table query. */
export class PsychoeducationCommentListDto extends PsychoeducationCommentsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  postId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  user?: string;

  @IsOptional()
  @IsString()
  @MaxLength(260)
  comment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  article?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  startDate?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  endDate?: string;
}
