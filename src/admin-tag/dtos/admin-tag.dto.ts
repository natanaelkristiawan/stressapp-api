import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class AdminTagListDto {

    @ApiProperty({description: "Page", example: 1})
    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    page: number;

    @ApiProperty({description: "Limit", example: 10})
    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    limit: number;

    // set optional 
    @ApiPropertyOptional({description: "Search", example: ""})
    @Type(() => String)
    @IsString()
    @IsOptional()
    search: string;

   

    
}      

export class AdminTagExportDto {

    // set optional
    @ApiPropertyOptional({description: "Search", example: ""})
    @Type(() => String)
    @IsString()
    @IsOptional()
    search: string;
}