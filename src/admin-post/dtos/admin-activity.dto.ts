import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDate, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export interface AdminActivityDto {
    userId: number;
    postId?: number;
    commentId?: number;
    reactionId?: number;
    action?: 'hide' | 'show' | 'move' | 'delete';
    targetType: 'admin-post';
    spaceId?: number;
    source?: string;
    hit_from?: string;
}
  

export class ActivityAnalyticsDto {
    @ApiProperty({description: "Start date (YYYY-MM-DD)", example: ""})
    @Type(() => Date)
    @IsDate()
    @IsNotEmpty()
    start_date: Date;

    @ApiProperty({description: "End date (YYYY-MM-DD)", example: ""})
    @Type(() => Date)
    @IsDate()
    @IsNotEmpty()
    end_date: Date;
}


export class NotificationDto {
  @ApiPropertyOptional({description: "After", example: ""})
  @IsString()
  @IsOptional()
  after: string;

  @ApiProperty({description: "Limit", example: 10})
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  limit: number;

}

export class MarkAsReadDto {
  @ApiProperty({description: "Notification ID", example: 1})
  @IsNumber()
  @IsNotEmpty()
  id: number;
}