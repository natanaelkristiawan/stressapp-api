import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetReportersByPostDto {
    @ApiProperty({
        description: 'ID of the post to get reporters for',
        example: 123,
        minimum: 1
    })
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    postId: number;
} 