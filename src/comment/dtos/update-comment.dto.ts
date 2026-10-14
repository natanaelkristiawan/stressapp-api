import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsInt, Min, IsString, IsIn, IsNotEmpty } from "class-validator";

export class UpdateCommentDto {
    
    @ApiProperty({description: "Comment content", example: "This is a comment"})
    @Type(() => String)
    @IsString()
    @IsNotEmpty()
    content: string;
}