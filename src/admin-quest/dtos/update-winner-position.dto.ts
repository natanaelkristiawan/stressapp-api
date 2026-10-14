import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class UpdateWinnerPositionDto {
  @ApiProperty({
    description: 'ID of the winner record in hof_list',
    example: 1,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  id: number;

  @ApiProperty({
    description: 'New position/rank for the winner',
    example: 1,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  position: number;
}
