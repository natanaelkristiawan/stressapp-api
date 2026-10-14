import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsString, IsNumber, IsIn } from "class-validator";

export class HistoryUserDto {
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

  @ApiPropertyOptional({ description: "Filter by member email", example: "user@example.com" })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: "Filter by campaign name or source", example: "Create Post" })
  @IsOptional()
  @IsString()
  campaign?: string;

  @ApiPropertyOptional({ description: "Start date (YYYY-MM-DD)", example: "2026-01-01" })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: "End date (YYYY-MM-DD)", example: "2026-12-31" })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: "Field to sort by", example: "created_at" })
  @IsOptional()
  @IsString()
  sortField?: string = 'created_at';

  @ApiPropertyOptional({ description: "Sort direction", example: "desc", enum: ["asc", "desc", "ASC", "DESC"] })
  @IsOptional()
  @IsString()
  @IsIn(["asc", "desc", "ASC", "DESC"])
  sortType?: "asc" | "desc" | "ASC" | "DESC" = 'desc';
}
