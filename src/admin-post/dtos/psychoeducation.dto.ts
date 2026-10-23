import { Transform, Type } from 'class-transformer';
import {
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
  @IsIn(['sara'])
  reason: 'sara';

  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  version: string;
}
