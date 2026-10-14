import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsInt, Min, IsString, IsIn } from "class-validator";

export class GetCommentsDto {

    @ApiProperty({description: "Post ID", example: 1})
    @Type(() => Number)
    @IsInt()
    @Min(1)
    post_id: number;

    @ApiProperty({description: "Limit comment display", example: 15})
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit: number;

    @ApiPropertyOptional({description: "Token for next pagination, you can left empty for first request", example: '9b8c9f6a-bdcc-4fd3-8c35-78c257755a3f'})
    @IsOptional()
    @Type(() => String)
    @IsString()
    after?: string;
}