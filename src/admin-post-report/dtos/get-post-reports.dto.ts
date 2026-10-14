import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetPostReportsDto {
    @ApiProperty({
        description: 'Number of items to return per page',
        example: 10,
        minimum: 1,
        maximum: 100,
        required: false,
        default: 10
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(100)
    limit?: number = 10;

    @ApiProperty({
        description: 'Cursor for pagination (UUID)',
        example: '550e8400-e29b-41d4-a716-446655440000',
        required: false
    })
    @IsOptional()
    @IsString()
    after?: string = '';

    @ApiProperty({
        description: 'Search term to filter posts by title',
        example: 'spam content',
        required: false
    })
    @IsOptional()
    @IsString()
    search?: string = '';
} 