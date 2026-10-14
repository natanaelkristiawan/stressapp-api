import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsNumber, IsString, IsIn } from "class-validator";

export class LogResetDto {
  @ApiPropertyOptional({ description: "Page number", example: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: "Items per page", example: 10, default: 10 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({ description: "Member ID", example: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  memberId?: number;

  @ApiPropertyOptional({ description: "Sort field", example: "created_at" })
  @IsOptional()
  @IsString()
  sortField?: string = 'created_at';

  @ApiPropertyOptional({ description: "Sort direction", example: "desc", enum: ["asc", "desc", "ASC", "DESC"] })
  @IsOptional()
  @IsString()
  @IsIn(["asc", "desc", "ASC", "DESC"])
  sortType?: "asc" | "desc" | "ASC" | "DESC" = 'desc';
}
