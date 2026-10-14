import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsNumber, IsOptional, IsString } from 'class-validator';

export class PostsMostReactionsDto {
    @ApiPropertyOptional({ description: 'Max number of posts to return', example: 10, default: 10 })
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    limit?: number;

    @ApiPropertyOptional({ description: 'Filter by tag title (exact match)', example: 'lorem' })
    @IsString()
    @IsOptional()
    tag?: string;

    @ApiPropertyOptional({ description: 'Filter by post published_at start (date range)', example: '2025-10-01' })
    @Type(() => Date)
    @IsDate()
    @IsOptional()
    start_date?: Date;

    @ApiPropertyOptional({ description: 'Filter by post published_at end (date range)', example: '2025-10-31' })
    @Type(() => Date)
    @IsDate()
    @IsOptional()
    end_date?: Date;
}
