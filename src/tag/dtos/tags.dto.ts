import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsNumber, IsString } from "class-validator";
import { Type } from "class-transformer";

export class TagsDto {
    // limit
    @ApiProperty({
        description: 'Limit',
        required: false,
        default: 10,
    })
    @IsOptional()   
    @Type(() => Number)
    @IsNumber()
    limit: number;


    // search by name   
    @ApiProperty({
        description: 'Search by title',
        required: false,
    })
    @IsOptional()
    @IsString()
    title: string;
}