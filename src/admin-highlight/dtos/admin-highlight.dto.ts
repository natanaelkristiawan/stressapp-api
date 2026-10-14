import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from "class-validator";

export class HighlightCreateDto {

    @ApiProperty({description: "name", example: "name"})
    @Type(() => String)
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({description: "image", example: "image"})
    @Type(() => String)
    @IsString()
    @IsNotEmpty()
    image: string;

    @ApiProperty({description: "order", example: 1})
    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    order: number;

    @ApiProperty({description: "link", example: "link"})
    @Type(() => String)
    @IsString()
    @IsNotEmpty()
    link: string;

    @ApiProperty({description: "need_token", example: 0, required: false, default: 0})
    @Type(() => Number)
    @IsOptional()
    @IsIn([0, 1])
    need_token?: number;
}


// input order

// sample data input
    // [
    //     {
    //         id: 1,
    //         order: 1
    //     },
    //     {
    //         id: 2,
    //         order: 2
    //     },
        
    // ]

    class HighlightOrderItemDto {
        @ApiProperty({ description: 'Highlight ID', example: 2 })
        @IsInt()
        id: number;
      
        @ApiProperty({ description: 'Order of the highlight', example: 3 })
        @IsInt()
        @Min(1)
        order: number;
    }
      
    export class HighlightUpdateOrderDto {
        @ApiProperty({
            description: 'Array of highlights with updated order',
            type: [HighlightOrderItemDto],
        })
        @IsArray()
        @ValidateNested({ each: true })
        @Type(() => HighlightOrderItemDto)
        order: HighlightOrderItemDto[];
    } 
    