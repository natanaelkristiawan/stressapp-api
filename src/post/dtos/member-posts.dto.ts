import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsInt, Min, IsString } from "class-validator";

export class MemberPostsDto {

    @ApiProperty({description: "Limit post display", example: 15})
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit: number;


    @ApiProperty({description: "Token for next pagination, you can left empty for first request", example: '9b8c9f6a-bdcc-4fd3-8c35-78c257755a3f'})
    @IsOptional()
    @Type(() => String)
    @IsString()
    after?: string;
}