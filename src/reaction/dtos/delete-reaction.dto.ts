import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsInt, Min, IsString, IsIn, IsNotEmpty } from "class-validator";

export class DeleteReactionDto {
    // reaction id
    @ApiProperty({description: "Post ID", example: 1})
    @Type(() => Number)
    @IsInt()
    @Min(1)
    postId: number;
}