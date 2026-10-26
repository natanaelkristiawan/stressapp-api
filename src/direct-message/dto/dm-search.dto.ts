import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Trims an optional search string and converts blank strings to undefined.
 * @returns Trimmed non-empty string or undefined.
 */
function trimOptionalSearch(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export class DmSearchDto {
  @ApiPropertyOptional({ description: 'Search query', required: false })
  @IsOptional()
  @Transform(({ value }) => trimOptionalSearch(value))
  @IsString()
  @MaxLength(100)
  search?: string;
}
