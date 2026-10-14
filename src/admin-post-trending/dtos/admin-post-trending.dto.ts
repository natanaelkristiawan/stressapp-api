import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsNotEmpty, IsNumber, IsString, Min, ValidateNested } from "class-validator";

export class AdminPostTrendingDto {

    @ApiProperty({description: "Search", example: "Search"})
    @Type(() => String)
    @IsString()
    @IsNotEmpty()
    search: string;

    
}

export class AdminSetTrendingPostDto {
    @ApiProperty({description: "Post ID", example: 1})
    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    postId: number;

    @ApiProperty({description: "Order", example: 1})
    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    order: number;
}

export class AdminUnsetTrendingPostDto {
    @ApiProperty({description: "Post ID", example: 1})
    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    postId: number;
}


class PostTrendingOrderItemDto {
    @ApiProperty({ description: 'Post ID', example: 2 })
    @IsInt()
    id: number;
  
    @ApiProperty({ description: 'Order of the post', example: 3 })
    @IsInt()
    @Min(1)
    order: number;
}
  
export class PostTrendingUpdateOrderDto {
    @ApiProperty({
        description: 'Array of highlights with updated order',
        type: [PostTrendingOrderItemDto],
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PostTrendingOrderItemDto)
    order: PostTrendingOrderItemDto[];
} 
