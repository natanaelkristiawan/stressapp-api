import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsInt, Min, IsString, IsIn, IsNotEmpty } from "class-validator";

export class CreateReactionPostDto {

    @ApiProperty({description: "Post ID", example: 1})
    @Type(() => Number)
    @IsInt()
    @Min(1)
    post_id: number;

    @ApiProperty({
        description: "Reaction type",
        example: "+1",
        enum: ['+1',
            'heart',
            'tada',
            'smile',
            'open_mouth',
            'cry'],
        default: "+1"
    })
    @IsOptional()
    @IsString()
    @IsIn([ '+1',
        'heart',
        'tada',
        'smile',
        'open_mouth',
        'cry'])
    reaction?: "+1" | "heart" | "tada" | "smile" | "open_mouth" | "cry";

}