import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty } from 'class-validator';

export class DeleteWinnerDto {
  @ApiProperty({
    description: 'ID of the winner record in hof_list',
    example: 1,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  id: number;
}
