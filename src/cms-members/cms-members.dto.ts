import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

/** Trims a text boundary without coercing untrusted values. Returns the original non-string. */
function trim({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class MemberIdDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(2147483647) id: number;
}

export class MemberListDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(1000000) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(100) name?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(254) email?: string;
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  startDate?: string;
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  endDate?: string;
}

export class MemberVersionDto {
  @IsDateString({ strict: true }) updatedAt: string;
}

export class EditMemberDto extends MemberVersionDto {
  @Transform(trim) @IsString() @Length(1, 100) name: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(100) username?:
    | string
    | null;
  @IsOptional()
  @Transform(trim)
  @IsUrl({ protocols: ['https'], require_protocol: true, disallow_auth: true })
  @MaxLength(255)
  photoUrl?: string | null;
}

export class SuspendMemberDto extends MemberVersionDto {
  @IsBoolean() suspended: boolean;
  @ValidateIf(
    (input: SuspendMemberDto, value: unknown) =>
      input.suspended || value !== undefined,
  )
  @Transform(trim)
  @IsString()
  @Length(1, 255)
  reason?: string;
}

export class VerifyMemberDto extends MemberVersionDto {
  @IsBoolean() verified: boolean;
}
