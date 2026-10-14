import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class DetailProfileDto {
    @ApiProperty({description: "Insert with memberId", example: '10245'})
    @Type(() => Number)
    @IsNotEmpty()
    @IsNumber()
    id: number;
}   
