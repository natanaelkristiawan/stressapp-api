import { IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { IsNumber } from "class-validator";
import { Type } from "class-transformer";



export class LeaderboardDTO {

    @ApiProperty({description: "Page", example: 1})
    @Type(() => Number)
    @IsNumber() 
    @IsNotEmpty()
    page: number;

    @ApiProperty({description: "Limit", example: 10})
    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    limit: number;
}

export class SendQuestSharePostDTO {
    @ApiProperty({description: "Post ID", example: 1})
    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    postId: number;
}

export class DecreasePointDTO {
    @ApiProperty({description: "Email", example: "user@example.com"})
    @IsNotEmpty()
    email: string;

    @ApiProperty({description: "Points to decrease", example: 10})
    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    points: number;

    @ApiProperty({description: "Reason for decrease", example: "Violation of community guidelines"})
    @IsNotEmpty()
    reason: string;
}