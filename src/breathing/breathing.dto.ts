import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class BreathingIdDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(2147483647) id: number;
}
export class BreathingSessionIdDto {
  @IsUUID('4') id: string;
}
export class SaveExerciseDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;
  @IsString() @IsNotEmpty() @MaxLength(50) tag: string;
  @IsString() @IsNotEmpty() @MaxLength(500) description: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @Matches(/\S/, { each: true })
  @MaxLength(500, { each: true })
  steps: string[];
  @IsInt() @Min(1) @Max(30) inhaleSeconds: number;
  @IsInt() @Min(0) @Max(30) hold1Seconds: number;
  @IsInt() @Min(1) @Max(30) exhaleSeconds: number;
  @IsInt() @Min(0) @Max(30) hold2Seconds: number;
  @Matches(/^#[a-fA-F0-9]{6}$/) themeColor: string;
  @IsIn(['relaxation', 'sleep', 'balance']) artwork:
    | 'relaxation'
    | 'sleep'
    | 'balance';
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(2048)
  @Matches(/^https?:\/\/[^\s]+$/)
  imageUrl: string | null;
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(2048)
  @Matches(/^https?:\/\/[^\s]+$/)
  guideImageUrl: string | null;
  @IsInt() @Min(0) @Max(10000) sortOrder: number;
  @IsIn(['draft', 'published']) status: 'draft' | 'published';
}
export class UpdateExerciseDto extends SaveExerciseDto {
  @IsInt() @Min(1) revision: number;
}
export class BreathingPageDto {
  @IsInt() @Min(1) revision: number;
  @IsString() @Matches(/\S/) @MaxLength(120) title: string;
  @IsString() @Matches(/\S/) @MaxLength(250) subtitle: string;
  @IsString() @Matches(/\S/) @MaxLength(150) educationTitle: string;
  @IsString() @Matches(/\S/) @MaxLength(10000) educationBody: string;
  @IsString() @Matches(/\S/) @MaxLength(150) preparationTitle: string;
  @IsString() @Matches(/\S/) @MaxLength(5000) preparationBody: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(30, { each: true })
  durationOptions: number[];
  @IsInt() @Min(1) @Max(30) defaultDuration: number;
}
export class StartBreathingDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{16,80}$/)
  requestId: string;
  @IsInt() @Min(1) @Max(2147483647) exerciseId: number;
  @IsInt() @Min(1) @Max(30) durationMinutes: number;
}
export class EndBreathingDto {
  @IsIn(['completed', 'stopped']) status: 'completed' | 'stopped';
  @IsInt() @Min(0) @Max(1800) elapsedSeconds: number;
}
export class BreathingListDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsIn(['title', 'sortOrder', 'updatedAt']) sort = 'sortOrder';
  @IsIn(['asc', 'desc']) order: 'asc' | 'desc' = 'asc';
}
export class BreathingReportDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  exerciseId?: number;
  @IsOptional()
  @IsIn(['in_progress', 'completed', 'stopped', 'unconfirmed'])
  status?: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) from: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) to: string;
  @IsIn(['startedAt', 'title', 'memberName', 'durationSeconds']) sort =
    'startedAt';
  @IsIn(['asc', 'desc']) order: 'asc' | 'desc' = 'desc';
}

export class DeleteExerciseDto {
  @IsInt() @Min(1) @Max(2147483647) revision: number;
}
