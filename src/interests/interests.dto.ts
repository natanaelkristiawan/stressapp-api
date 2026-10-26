import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

/** Normalizes catalog labels consistently before validation and uniqueness checks. */
export function normalizeInterestName(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/gu, ' ');
}

export class InterestInputDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeInterestName(value) : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  description: string;

  @IsInt()
  @Min(0)
  @Max(100000)
  sortOrder: number;

  @IsBoolean()
  isActive: boolean;
}

export class InterestRevisionDto {
  @IsInt()
  @Min(1)
  @Max(2147483647)
  revision: number;
}

export class UpdateInterestDto extends InterestInputDto {
  @IsInt()
  @Min(1)
  @Max(2147483647)
  revision: number;
}

export class InterestIdDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  id: number;
}

export class InterestListDto {
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeInterestName(value) : value,
  )
  @IsString()
  @MaxLength(100)
  search = '';

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

  @IsIn(['all', 'active', 'inactive'])
  status: 'all' | 'active' | 'inactive' = 'all';

  @IsIn(['name', 'sortOrder', 'createdAt'])
  sortBy: 'name' | 'sortOrder' | 'createdAt' = 'sortOrder';

  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'asc';
}
