import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class DeductPointDto {
    @ApiProperty({ description: "Points", example: 1 })
    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    points: number;

    @ApiProperty({ description: "Note", example: "Redeem Point" })
    @Type(() => String)
    @IsString()
    @IsNotEmpty()
    note: string;
}