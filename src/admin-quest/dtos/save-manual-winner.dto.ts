import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class SaveManualWinnerDto {
  @ApiPropertyOptional({
    description: 'Period string, e.g. "2026-09" or "09-2026". If omitted, month and year will be used.',
    example: '2026-09',
  })
  @IsOptional()
  @IsString()
  period?: string;

  @ApiPropertyOptional({
    description: 'Month (1-12)',
    example: 9,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({
    description: 'Year',
    example: 2026,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  year?: number;

  @ApiPropertyOptional({
    description: 'User ID / Member ID in members',
    example: 105,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  @ApiPropertyOptional({
    description: 'Member ID (alias for userId)',
    example: 105,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  memberId?: number;

  @ApiProperty({
    description: 'Winner type / category name, e.g. Paling Eksis, Pendatang Terbaik, Tampil kembali',
    example: 'Paling Eksis',
  })
  @IsNotEmpty()
  @IsString()
  winner_type: string;

  @ApiPropertyOptional({
    description: 'Category (alias for winner_type)',
    example: 'Paling Eksis',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Rank / position in the winner list. If omitted, automatically determined by current count + 1.',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rank?: number;
}
