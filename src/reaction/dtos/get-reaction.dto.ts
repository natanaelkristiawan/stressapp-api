import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsInt, Min, IsString, IsIn, IsNotEmpty } from "class-validator";

export class GetReactionDto {

    @ApiProperty({description: "Post ID", example: 1})
    @Type(() => Number)
    @IsInt()
    @Min(1)
    post_id: number;

    @ApiProperty({
        description: "Reaction type",
        example: "all",
        enum: [
            'all',
            '+1',
            'heart',
            'tada',
            'smile',
            'open_mouth',
            'cry'],
        default: "all"
    })
    @IsString()
    @IsIn([ 'all',
        '+1',
        'heart',
        'tada',
        'smile',
        'open_mouth',
        'cry'])
    reaction?: "all" | "+1" | "heart" | "tada" | "smile" | "open_mouth" | "cry";

}