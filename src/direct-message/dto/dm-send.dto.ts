// src/message/dto/send-message.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, MinLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: 'Hello!', description: 'The message content' })
  @Type(() => String)
  @IsString()
  @MinLength(1)
  content: string;
}
