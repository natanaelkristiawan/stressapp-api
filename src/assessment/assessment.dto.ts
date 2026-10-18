import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  IsBoolean,
  IsInt,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

/** Trims human-readable text without coercion. Returns non-strings unchanged. */
function trim({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class AssessmentOptionDto {
  @IsInt() @Min(1) @Max(4) value: number;
  @Transform(trim) @IsString() @Length(1, 100) label: string;
}

export class AssessmentQuestionDto {
  @IsString() @Matches(/^[a-zA-Z0-9_-]{1,40}$/) id: string;
  @Transform(trim) @IsString() @Length(1, 1000) text: string;
  @IsBoolean() reverseScored: boolean;
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => AssessmentOptionDto)
  options: AssessmentOptionDto[];
}

export class AssessmentCategoryDto {
  @IsString() @Matches(/^[a-zA-Z0-9_-]{1,40}$/) id: string;
  @Transform(trim) @IsString() @Length(1, 100) label: string;
  @IsInt() @Min(6) @Max(24) min: number;
  @IsInt() @Min(6) @Max(24) max: number;
  @Transform(trim) @IsString() @Length(1, 2000) interpretation: string;
}

export class AssessmentDefinitionDto {
  @Transform(trim) @IsString() @Length(1, 200) title: string;
  @Transform(trim) @IsString() @Length(1, 2000) disclaimer: string;
  @Transform(trim) @IsString() @Length(1, 1000) sourceReference: string;
  @Transform(trim) @IsString() @Length(1, 2000) scoringNotes: string;
  @IsArray()
  @ArrayMinSize(6)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => AssessmentQuestionDto)
  questions: AssessmentQuestionDto[];
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => AssessmentCategoryDto)
  categories: AssessmentCategoryDto[];
}

export class AssessmentRevisionDto {
  @IsInt() @Min(1) @Max(2147483647) revision: number;
}

export class EditAssessmentDto extends AssessmentDefinitionDto {
  @IsInt() @Min(1) @Max(2147483647) revision: number;
}

export class PublishAssessmentDto extends AssessmentRevisionDto {
  @Equals(true) scoringApproved: boolean;
}

export class AssessmentIdDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(2147483647) id: number;
}

export class AssessmentListDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(1000000) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
}

export class InitialMoodDto {
  @IsInt() @Min(1) @Max(5) score: number;
}

export class AssessmentAnswerDto {
  @IsString() @Matches(/^[a-zA-Z0-9_-]{1,40}$/) questionId: string;
  @IsInt() @Min(1) @Max(4) value: number;
}

export class SubmitAssessmentDto {
  @IsInt() @Min(1) @Max(2147483647) versionId: number;
  @IsArray()
  @ArrayMinSize(6)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => AssessmentAnswerDto)
  answers: AssessmentAnswerDto[];
}
