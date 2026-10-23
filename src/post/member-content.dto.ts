import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Matches,
  Min,
  MinLength,
} from 'class-validator';

export class ContentPageDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  categoryId?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  after?: string;

  @IsOptional()
  @IsIn(['article', 'video'])
  type?: 'article' | 'video';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
export class ContentIdDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;
}
export class ContentCommentIdDto extends ContentIdDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  commentId: number;
}
export class ContentEventDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{16,80}$/)
  requestId: string;
}

export class ContentCommentDto extends ContentEventDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(260)
  content: string;
}
