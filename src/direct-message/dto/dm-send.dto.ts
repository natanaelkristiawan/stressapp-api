import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

/** Trims a string input while preserving non-string values for validator rejection.
 * @returns Trimmed string or original value.
 */
function trimMessageContent(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  return value.trim();
}

export class SendMessageDto {
  @ApiProperty({
    example: 'Halo, apa kabar?',
    description: 'The message content',
  })
  @Transform(({ value }) => trimMessageContent(value))
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;
}
