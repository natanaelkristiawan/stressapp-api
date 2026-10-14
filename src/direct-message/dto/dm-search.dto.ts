// search conversation

import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsString } from "class-validator";

export class DmSearchDto {

    @ApiPropertyOptional({ description: 'Search query', required: false })
    @Type(() => String)
    @IsOptional()
    @IsString()
    search?: string;
}