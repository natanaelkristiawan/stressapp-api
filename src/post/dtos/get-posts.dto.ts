import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsInt, Min, IsString, IsIn } from "class-validator";

export class GetPostsDto {
    @ApiProperty({description: "Limit post display", example: 15})
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit: number;


    @ApiPropertyOptional({description: "Token for next pagination, you can left empty for first request", example: '9b8c9f6a-bdcc-4fd3-8c35-78c257755a3f'})
    @IsOptional()
    @Type(() => String)
    @IsString()
    after?: string;


    @ApiPropertyOptional({
        description: "Order type of posts",
        example: "latest",
        enum: ["latest", "popular"],
        default: "latest"
    })
    @IsOptional()
    @IsString()
    @IsIn(["latest", "popular"])
    order?: "latest" | "popular";


}


export class GetPostHighlightDto extends GetPostsDto {
    @ApiProperty({description: "Limit post display", example: 15})
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit: number;


    @ApiPropertyOptional({description: "Token for next pagination, you can left empty for first request", example: '9b8c9f6a-bdcc-4fd3-8c35-78c257755a3f'})
    @IsOptional()
    @Type(() => String)
    @IsString()
    after?: string;


    @ApiPropertyOptional({
        description: "Order type of posts",
        example: "latest",
        enum: ["latest", "popular"],
        default: "latest"
    })
    @IsOptional()
    @IsString()
    @IsIn(["latest", "popular"])
    order?: "latest" | "popular";

    @ApiPropertyOptional({
        description: "Source of posts",
        example: "home-mmid",
        //  “home-mmid”, “home-mmid-trending-detail”, “home-mimate” dan “home-mimate-trending-detail”
        enum: ["home-mmid", "home-mmid-trending-detail", "home-mimate", "home-mimate-trending-detail"],
        default: "home-mimate"
    })
    @IsOptional()
    @IsString()
    @IsIn(["home-mmid", "home-mmid-trending-detail", "home-mimate", "home-mimate-trending-detail"])
    source?: "home-mmid" | "home-mmid-trending-detail" | "home-mimate" | "home-mimate-trending-detail";
}