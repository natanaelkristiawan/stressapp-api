// create-post-report.dto.ts
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportReason } from '../../entity/post-report.entity';

export class CreatePostReportDto {

  @ApiProperty({
    type: Number,
    description: 'The ID of the post to report',
    example: 1,
  })
  @IsNumber()
  postId: number;

  @ApiProperty({
    enum: ReportReason,
    description: 'Reason for reporting the post',
    example: ReportReason.SPAM,
  })
  @IsEnum(ReportReason)
  reason: ReportReason;

  @ApiPropertyOptional({
    type: String,
    description: 'Optional description providing more detail about the report',
    example: 'This post is promoting a scam investment site.',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
