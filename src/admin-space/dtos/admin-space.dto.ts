import { PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class AdminSpaceListDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(200)
  search?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(['created_at'])
  sort?: 'created_at';

  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}

export class AdminSpaceCreateDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(255)
  description?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(255)
  @ValidateIf((_object, value) => value !== '')
  @IsUrl({ protocols: ['https'], require_protocol: true })
  image?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(255)
  @ValidateIf((_object, value) => value !== '')
  @IsUrl({ protocols: ['https'], require_protocol: true })
  banner?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  is_dealer?: boolean;
}

export class ForumVersionDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  version: string;
}

export class AdminSpacePatchDto extends PartialType(AdminSpaceCreateDto, {
  skipNullProperties: false,
}) {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  version: string;
}

export class AdminSpaceUpdateDto extends AdminSpacePatchDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;
}

export class AdminSpaceIdDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;
}

export class AdminSpaceDeleteDto extends ForumVersionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;
}

export class AdminSpaceViewDto {
  id: number;
  version: string;
  name: string;
  description?: string;
  image: string;
  banner: string;
  membersCount: number;
  postsCount: number;
  backup_space_id: number;
  is_dealer?: boolean;
  created_at: Date;
}
