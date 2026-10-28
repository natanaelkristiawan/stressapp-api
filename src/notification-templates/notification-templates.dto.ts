import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { NotificationType } from '../entity/member-notification.entity';

export class NotificationTemplateTypeDto {
  @IsEnum(NotificationType)
  type: NotificationType;
}

export class SaveNotificationTemplateDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  body: string;

  @IsInt()
  @Min(0)
  @Max(2147483646)
  revision: number;
}
