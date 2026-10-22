import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class UpdateCommentDto {
  @ApiProperty({ description: 'Comment content', example: 'This is a comment' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;
}
