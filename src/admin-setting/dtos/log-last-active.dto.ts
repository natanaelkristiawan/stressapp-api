import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class SyncLogLastActiveDto {
  @ApiPropertyOptional({
    description: 'Whether to truncate log_last_active_manual table before inserting fresh records. Defaults to true.',
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  truncate?: boolean = true;
}
