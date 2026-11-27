import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export const CONVERSATION_CARD_VISUALS = [
  'kuliner',
  'hobi',
  'film',
  'keseharian',
] as const;

export type ConversationCardVisualInput =
  (typeof CONVERSATION_CARD_VISUALS)[number];

/** Normalizes card titles consistently before validation. */
export function normalizeConversationCardTitle(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/gu, ' ');
}

export class ConversationCardInputDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeConversationCardTitle(value) : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  prompt: string;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  })
  @IsString()
  @MaxLength(500)
  subPrompt: string | null = null;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  color: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  textColor: string;

  @IsIn(CONVERSATION_CARD_VISUALS)
  visual: ConversationCardVisualInput;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  categoryId: number | null = null;

  @IsInt()
  @Min(0)
  @Max(100000)
  sortOrder: number;

  @IsBoolean()
  isActive: boolean;
}

export class ConversationCardRevisionDto {
  @IsInt()
  @Min(1)
  @Max(2147483647)
  revision: number;
}

export class UpdateConversationCardDto extends ConversationCardInputDto {
  @IsInt()
  @Min(1)
  @Max(2147483647)
  revision: number;
}

export class ConversationCardIdDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  id: number;
}

export class ConversationCardListDto {
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeConversationCardTitle(value) : value,
  )
  @IsString()
  @MaxLength(100)
  search = '';

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

  @IsIn(['all', 'active', 'inactive'])
  status: 'all' | 'active' | 'inactive' = 'all';

  @ValidateIf(
    (_object, value) => value !== undefined && value !== null && value !== '',
  )
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  categoryId?: number;

  @IsIn(['title', 'category', 'sortOrder', 'createdAt'])
  sortBy: 'title' | 'category' | 'sortOrder' | 'createdAt' = 'sortOrder';

  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'asc';
}
