import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetWinnerPositionDto {
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
    description: 'Bearer access token (optional alternative to Authorization header)',
  })
  @IsOptional()
  @IsString()
  token?: string;
}
