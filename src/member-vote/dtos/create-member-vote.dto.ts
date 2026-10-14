import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CreateMemberVoteDto {
  @ApiProperty({ description: 'Post ID', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  post_id: number;

  @ApiProperty({ description: 'Vote option ID', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  vote_id: number;
}
