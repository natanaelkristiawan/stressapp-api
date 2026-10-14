import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CommentListDto {
    @ApiProperty({ description: 'Page', example: 1 })
    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    page: number;

    @ApiProperty({ description: 'Limit', example: 10 })
    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    limit: number;

    @ApiPropertyOptional({ description: 'Filter by post id', example: 123 })
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    post_id?: number;

    @ApiPropertyOptional({ description: 'Filter by member id', example: 456 })
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    member_id?: number;

    @ApiPropertyOptional({ description: 'Filter by parent comment id (for replies)', example: 789 })
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    parent_id?: number;

    @ApiPropertyOptional({ description: 'Sort field', enum: ['id', 'created_at', 'updated_at'], default: 'created_at' })
    @IsOptional()
    @IsString()
    @IsIn(['id', 'created_at', 'updated_at'])
    sort?: 'id' | 'created_at' | 'updated_at';

    @ApiPropertyOptional({ description: 'Order direction', enum: ['asc', 'desc'], default: 'desc' })
    @IsOptional()
    @IsString()
    @IsIn(['asc', 'desc'])
    order?: 'asc' | 'desc';

    @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD)', example: '2025-10-01' })
    @Type(() => Date)
    @IsDate()
    @IsOptional()
    start_date?: Date;

    @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)', example: '2025-10-31' })
    @Type(() => Date)
    @IsDate()
    @IsOptional()
    end_date?: Date;
}


