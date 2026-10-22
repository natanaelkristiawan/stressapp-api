import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsInt,
  Min,
  IsString,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ description: 'Post ID', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  post_id: number;

  @ApiPropertyOptional({
    description: 'leave empty if you want to get all parent comment',
    example: '',
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(0)
  comment_id: number;

  @ApiProperty({ description: 'Comment content', example: 'This is a comment' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;
}
