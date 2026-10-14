import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class DetailPostDto {
    @ApiProperty({description: "Required postId", example: '1'})
    @Type(() => Number)
    @IsNotEmpty()
    @IsNumber()
    id: number;
}   