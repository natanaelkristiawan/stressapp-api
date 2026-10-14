import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class DefaultSpaceDto {
    // optional
    @ApiPropertyOptional({description: "For default space in first position", example: '7'})
    @Type(() => Number)
    @IsOptional()
    @IsNumber()
    id: number;
}   