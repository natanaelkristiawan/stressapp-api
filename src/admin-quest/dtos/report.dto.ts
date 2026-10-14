import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

// ponytail: single lightweight DTO for date range query filtering
export class ReportFilterDto {
  @ApiPropertyOptional({ description: "Start date (YYYY-MM-DD)", example: "2026-01-01" })
  @IsOptional()
  @IsString()
  date_start?: string;

  @ApiPropertyOptional({ description: "End date (YYYY-MM-DD)", example: "2026-12-31" })
  @IsOptional()
  @IsString()
  date_end?: string;
}

export class ReportDto extends ReportFilterDto {}
