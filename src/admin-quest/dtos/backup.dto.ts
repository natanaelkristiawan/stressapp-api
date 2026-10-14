import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";
import { Type } from "class-transformer";

export enum BackupMode {
    BACKUP = 'backup',
    RESET = 'reset',
}

export class BackupQuestPointDTO {
    @ApiPropertyOptional({ description: "Target year (e.g. 2026). Defaults to current year.", example: 2026 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    year?: number;

    @ApiPropertyOptional({ description: "Target month (1-12). Defaults to current month.", example: 9 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(12)
    month?: number;

    @ApiPropertyOptional({
        description: "Backup mode: 'backup' (or 'replace') to replace existing points, 'append' to calculate/add to existing points. Defaults to 'backup'.",
        enum: BackupMode,
        default: BackupMode.BACKUP,
        example: BackupMode.BACKUP,
    })
    @IsOptional()
    @IsEnum(BackupMode)
    mode?: BackupMode;
}


export class CheckPeriodResetDTO {
    @ApiPropertyOptional({ description: "Target year (e.g. 2026). Defaults to current year.", example: 2026 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    year?: number;

    @ApiPropertyOptional({ description: "Target month 1-12 (defaults to current month)", example: 9 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(12)
    month?: number;
}
