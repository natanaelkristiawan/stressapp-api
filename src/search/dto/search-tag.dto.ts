import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString } from "class-validator";


export class SearchTagDto {
     // limit
     @ApiProperty({description: "Limit for pagination, default is 10", example: 10})
     @Type(() => Number)
     @IsNumber()
     limit?: number;
 
     @ApiProperty({description: "Token for next pagination, you can left empty for first request", example: '9b8c9f6a-bdcc-4fd3-8c35-78c257755a3f'})
     @IsOptional()
     @Type(() => String)
     @IsString()
     after?: string;
}