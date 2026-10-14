import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CheckWinnerCategoriesDto {
  @ApiPropertyOptional({
    description: 'Bearer access token (optional alternative to Authorization header)',
  })
  @IsOptional()
  @IsString()
  token?: string;
}
