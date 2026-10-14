import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminSettingListDto {
  @ApiPropertyOptional({ description: 'Page number', example: 1, default: 1 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Limit per page', example: 10, default: 10 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Search by key or description', example: '' })
  @Type(() => String)
  @IsString()
  @IsOptional()
  search?: string;
}

export class CreateSettingDto {
  @ApiProperty({ description: 'Setting key (unique identifier)', example: 'site_maintenance' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  key: string;

  @ApiPropertyOptional({ description: 'Setting value (string, JSON, etc.)', example: 'false' })
  @IsString()
  @IsOptional()
  value?: string;

  @ApiPropertyOptional({ description: 'Description of setting', example: 'Maintenance mode toggle' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;
}

export class UpdateSettingDto {
  @ApiPropertyOptional({ description: 'Setting key (unique identifier)', example: 'site_maintenance' })
  @IsString()
  @IsOptional()
  @MaxLength(191)
  key?: string;

  @ApiPropertyOptional({ description: 'Setting value (string, JSON, etc.)', example: 'true' })
  @IsString()
  @IsOptional()
  value?: string;

  @ApiPropertyOptional({ description: 'Description of setting', example: 'Maintenance mode toggle' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;
}
