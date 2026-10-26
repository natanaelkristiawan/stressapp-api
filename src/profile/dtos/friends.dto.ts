import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Trims query string input and converts blank strings into undefined.
 * @returns A trimmed string or undefined when empty.
 */
function trimOptionalString(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  return trimmed;
}

export class FriendDiscoverQueryDto {
  @ApiPropertyOptional({
    example: 1,
    description: '1-based page number for the member discovery grid',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    example: 6,
    description: 'Number of members per page (bounded between 1 and 50)',
    default: 6,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize = 6;

  @ApiPropertyOptional({
    example: 'Sarah',
    description: 'Search query matching member name or username',
  })
  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    example: 'Jakarta',
    description: 'Optional city/location filter',
  })
  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(100)
  location?: string;
}

export class FriendConnectionsQueryDto {
  @ApiPropertyOptional({
    example: 'Sarah',
    description:
      'Search query matching friend or pending requester name/username',
  })
  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    example: 'Jakarta',
    description:
      'Optional city/location filter for friends and incoming requests',
  })
  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MaxLength(100)
  location?: string;
}

export class FriendMemberIdParamDto {
  @ApiProperty({
    example: 42,
    description: 'Target member ID',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;
}
