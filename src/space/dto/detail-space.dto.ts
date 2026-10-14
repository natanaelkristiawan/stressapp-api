import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class DetailSpaceDto {
    @ApiProperty({description: "Insert with SpaceId", example: '4'})
    @Type(() => Number)
    @IsNotEmpty()
    @IsNumber()
    id: number;
}   