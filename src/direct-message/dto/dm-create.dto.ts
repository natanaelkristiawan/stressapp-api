import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class FindOrCreateConversationDto {
  @ApiProperty({ example: 2, description: 'ID of the target friend member' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  memberId: number;
}

export class ConversationIdParamDto {
  @ApiProperty({ example: 1, description: 'ID of the conversation' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  conversationId: number;
}
