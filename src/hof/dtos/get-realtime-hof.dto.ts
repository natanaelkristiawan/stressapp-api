import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
export class GetRealtimeHofDto {
  @ApiPropertyOptional({
    enum: ['paling-eksis', 'pendatang-terbaik', 'tampil-kembali'],
  })
  @IsOptional()
  @IsIn(['paling-eksis', 'pendatang-terbaik', 'tampil-kembali'])
  category?: string;
}
