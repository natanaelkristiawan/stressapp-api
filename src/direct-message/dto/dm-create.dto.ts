// src/conversation/dto/find-or-create-conversation.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class FindOrCreateConversationDto {

  @ApiProperty({ example: 2, description: 'ID of the  member' })
  @Type(() => Number)
  @IsInt()
  memberId: number;
}
