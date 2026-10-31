import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { NotificationType } from '../entity/member-notification.entity';

export class LogQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  search = '';

  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  memberId?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  from?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  to?: string;
}

export class ActivityLogQueryDto extends LogQueryDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(50)
  action = '';
}

export class NotificationLogQueryDto extends LogQueryDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsIn(['all', 'unread', 'read', 'cleared'])
  state = 'all';

  @IsIn(['all', 'pending', 'sending', 'accepted', 'failed', 'skipped'])
  pushStatus = 'all';
}

export class LogIdDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  id: number;
}
