import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateBy,
} from 'class-validator';

/** Validates IANA timezone identifiers. Returns a runtime timezone property decorator. */
function IsTimeZone() {
  return ValidateBy({
    name: 'timeZone',
    validator: {
      validate: (value: unknown) => {
        if (typeof value !== 'string' || value.length > 100) return false;
        try {
          new Intl.DateTimeFormat('en', { timeZone: value });
          return true;
        } catch {
          return false;
        }
      },
      defaultMessage: () => 'timeZone must be a valid IANA timezone',
    },
  });
}

export class MoodDateDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  date: string;
}
export class MoodTimeZoneDto {
  @IsTimeZone() timeZone: string;
}
export class MoodRangeDto extends MoodTimeZoneDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true }) from: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true }) to: string;
}
export class MoodListDto extends MoodRangeDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(1000000) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 31;
}
export class MoodSummaryDto extends MoodRangeDto {
  @IsIn(['week', 'month']) grouping: 'week' | 'month' = 'week';
}
export class SaveMoodDto extends MoodTimeZoneDto {
  @IsInt() @Min(1) @Max(5) score: number;
  @IsString() @MaxLength(2000) note = '';
  @IsArray()
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  attachmentIds: string[] = [];
}
export class MoodAttachmentIdDto {
  @IsUUID('4') id: string;
}
