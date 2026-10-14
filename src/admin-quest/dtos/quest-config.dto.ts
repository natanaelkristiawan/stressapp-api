import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmpty, IsString, IsNumber, IsOptional, IsEnum } from "class-validator";

export class QuestListFilterDto {
  @ApiPropertyOptional({ description: "Page number", default: 1, example: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: "Items per page", default: 10, example: 10 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({ description: "Search by title or action", example: "post" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Filter by status: 1 (active) or 0 (inactive)", example: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  status?: number;

  @ApiPropertyOptional({ description: "Filter by condition", enum: ["single", "multiple"], example: "single" })
  @IsOptional()
  @IsString()
  condition?: string;

  @ApiPropertyOptional({ description: "Filter by interval", enum: ["daily", "weekly", "once"], example: "daily" })
  @IsOptional()
  @IsString()
  interval?: string;

  @ApiPropertyOptional({ description: "Sort column field", default: "id", example: "id" })
  @IsOptional()
  @IsString()
  sortField?: string = "id";

  @ApiPropertyOptional({ description: "Sort direction", enum: ["asc", "desc"], default: "desc", example: "desc" })
  @IsOptional()
  @IsString()
  sortType?: "asc" | "desc" = "desc";
}

export class CreateQuestConfigDto {
  @ApiProperty({ description: "Quest Title", example: "Create Post" })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: "Quest Description", example: "Earn points by creating posts" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "Image URL or icon", example: "https://example.com/icon.png" })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({ description: "Points awarded", example: 20 })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  point: number;

  @ApiPropertyOptional({ description: "Condition type", enum: ["single", "multiple"], default: "single", example: "single" })
  @IsOptional()
  @IsEnum(["single", "multiple"])
  condition?: "single" | "multiple" = "single";

  @ApiPropertyOptional({ description: "Action key", example: "create_post" })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: "Interval", enum: ["daily", "weekly", "once"], default: "daily", example: "daily" })
  @IsOptional()
  @IsEnum(["daily", "weekly", "once"])
  interval?: "daily" | "weekly" | "once" = "daily";

  @ApiPropertyOptional({ description: "Start Date", example: "2025-01-01" })
  @IsOptional()
  @IsString()
  dateStart?: string;

  @ApiPropertyOptional({ description: "End Date", example: "2025-12-31" })
  @IsOptional()
  @IsString()
  dateEnd?: string;

  @ApiPropertyOptional({ description: "Status: 1 (active), 0 (inactive)", default: 1, example: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  status?: number = 1;

  @ApiPropertyOptional({ description: "Is main quest flag", default: 0, example: 0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  isMain?: number = 0;
}

export class UpdateQuestConfigDto {
  @ApiPropertyOptional({ description: "Quest Title", example: "Create Post" })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: "Quest Description", example: "Earn points by creating posts" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "Image URL or icon", example: "https://example.com/icon.png" })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ description: "Points awarded", example: 20 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  point?: number;

  @ApiPropertyOptional({ description: "Condition type", enum: ["single", "multiple"], example: "single" })
  @IsOptional()
  @IsEnum(["single", "multiple"])
  condition?: "single" | "multiple";

  @ApiPropertyOptional({ description: "Action key", example: "create_post" })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: "Interval", enum: ["daily", "weekly", "once"], example: "daily" })
  @IsOptional()
  @IsEnum(["daily", "weekly", "once"])
  interval?: "daily" | "weekly" | "once";

  @ApiPropertyOptional({ description: "Start Date", example: "2025-01-01" })
  @IsOptional()
  @IsString()
  dateStart?: string;

  @ApiPropertyOptional({ description: "End Date", example: "2025-12-31" })
  @IsOptional()
  @IsString()
  dateEnd?: string;

  @ApiPropertyOptional({ description: "Status: 1 (active), 0 (inactive)", example: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  status?: number;

  @ApiPropertyOptional({ description: "Is main quest flag", example: 0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  isMain?: number;
}

export class ToggleStatusQuestConfigDto {
  @ApiProperty({ description: "Quest ID", example: 1 })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  id: number;

  @ApiProperty({ description: "New Status (1 or 0)", example: 1 })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  status: number;
}
