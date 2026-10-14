import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsInt, Min, IsString, IsIn, IsNotEmpty } from "class-validator";

export class GetReactionDto {

    @ApiProperty({description: "Comment ID", example: 1})
    @Type(() => Number)
    @IsInt()
    @Min(1)
    comment_id: number;

}