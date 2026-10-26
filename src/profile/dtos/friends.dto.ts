import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
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

/** Trims a string field while preserving empty string so the user can clear an optional field.
 * @returns A trimmed string or the original non-string value.
 */
function trimString(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  return value.trim();
}

export class UpdateMemberProfileDto {
  @ApiPropertyOptional({
    example: 'Sarah Kim',
    description: 'Member display name (1-100 characters)',
  })
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({
    example: 'sarah_kim',
    description: 'Unique public username handle (optional, max 100 characters)',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }
    const trimmed = value.trim().replace(/^@+/, '');
    return trimmed;
  })
  @IsString()
  @MaxLength(100)
  @ValidateIf((_obj, value) => typeof value === 'string' && value.length > 0)
  @Matches(/^[a-zA-Z0-9_.]+$/, {
    message:
      'Username hanya boleh menggunakan huruf, angka, titik (.), atau garis bawah (_).',
  })
  username?: string | null;

  @ApiPropertyOptional({
    example: 'Jakarta',
    description: 'Member home city/location (optional, max 100 characters)',
  })
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(100)
  location?: string | null;

  @ApiPropertyOptional({
    example: 'Halo semua, saya sedang mencari teman baru.',
    description: 'Member short biography (optional, max 1000 characters)',
  })
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(1000)
  bio?: string | null;

  @ApiPropertyOptional({
    example: 'https://s3.temusobat.tech/temu-sobat/avatar.jpg',
    description: 'Uploaded profile picture URL (optional, max 255 characters)',
  })
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(255)
  @ValidateIf((_obj, value) => typeof value === 'string' && value.length > 0)
  @IsUrl(
    {
      protocols: ['http', 'https'],
      require_protocol: true,
      disallow_auth: true,
    },
    { message: 'URL foto profil tidak valid.' },
  )
  avatarUrl?: string | null;

  @ApiPropertyOptional({
    example: ['Membaca Buku', 'Memasak'],
    description: 'List of member interest/preference tags (up to 20 items)',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!Array.isArray(value)) {
      return value;
    }
    const unique: string[] = [];
    for (const item of value) {
      if (typeof item !== 'string') {
        return value;
      }
      const trimmed = item.trim();
      if (trimmed.length > 0 && !unique.includes(trimmed)) {
        unique.push(trimmed);
      }
    }
    return unique;
  })
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Length(1, 50, { each: true })
  preferences?: string[];
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
