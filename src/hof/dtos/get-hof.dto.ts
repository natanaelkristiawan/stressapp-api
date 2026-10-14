import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetHofDto {
  @ApiPropertyOptional({
    description: 'Category name (e.g. Paling Eksis, Pendatang Terbaik, Tampil kembali). Defaults to Paling Eksis.',
    example: 'Paling Eksis',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Month (1-12). Defaults to current or latest available month.',
    example: 9,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({
    description: 'Year. Defaults to current or latest available year.',
    example: 2026,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  year?: number;

  @ApiPropertyOptional({
    description: 'Limit results. Defaults to 5.',
    default: 5,
    example: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 5;

  @ApiPropertyOptional({
    description: 'Bearer access token (optional alternative to Authorization header)',
  })
  @IsOptional()
  @IsString()
  token?: string;
}

