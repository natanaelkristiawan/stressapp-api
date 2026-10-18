import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ParticipationRangeDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true }) from: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true }) to: string;
}
export class ParticipationListDto extends ParticipationRangeDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(100)
  name?: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(1000000) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
  @IsIn(['memberName', 'dateString']) sortBy: 'memberName' | 'dateString' =
    'dateString';
  @IsIn(['asc', 'desc']) sortOrder: 'asc' | 'desc' = 'desc';
}

export class ParticipationIdDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(2147483647) id: number;
}
