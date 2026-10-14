import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class PostByIdsDto {
  @ApiProperty({
    description: 'Comma-separated post IDs',
    example: '1,2,3',
  })
  @IsString()
  @IsNotEmpty()
  ids: string;
}
