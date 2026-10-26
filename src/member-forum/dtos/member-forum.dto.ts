import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/** Query parameters for fetching posts across forum tabs. */
export class MemberForumFeedQueryDto {
  @ApiPropertyOptional({
    description: 'Tab selection: untuk-anda, following, komunitas, mine',
    example: 'untuk-anda',
    enum: ['untuk-anda', 'following', 'komunitas', 'mine'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['untuk-anda', 'following', 'komunitas', 'mine'])
  tab?: 'untuk-anda' | 'following' | 'komunitas' | 'mine';

  @ApiPropertyOptional({ description: 'Community / Space ID for komunitas tab', example: 7 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @IsPositive()
  spaceId?: number;

  @ApiPropertyOptional({ description: 'Pagination limit', example: 15, default: 15 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 15;

  @ApiPropertyOptional({ description: 'Pagination cursor', example: '' })
  @IsOptional()
  @IsString()
  after?: string;

  @ApiPropertyOptional({ description: 'Sorting order', example: 'latest', enum: ['latest', 'popular'] })
  @IsOptional()
  @IsString()
  @IsIn(['latest', 'popular'])
  order?: string;
}

/** Payload for member forum post creation. */
export class CreateMemberForumPostDto {
  @ApiProperty({ description: 'Post title', example: 'Berbagi pengalaman kesehatan mental' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @ApiProperty({ description: 'Post body text / caption', example: 'Hari ini saya belajar meluangkan waktu untuk diri sendiri...' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  caption: string;

  @ApiPropertyOptional({ description: 'Selected community ID', example: 7 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @IsPositive()
  spaceId?: number;

  @ApiPropertyOptional({ description: 'Attached image URL', example: 'https://example.com/photo.jpg' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ description: 'Display author as anonymous', example: false })
  @IsOptional()
  @IsBoolean()
  anonymous?: boolean;
}

/** Payload for creating a comment or replying to a comment. */
export class CreateMemberForumCommentDto {
  @ApiProperty({ description: 'Comment text', example: 'Terima kasih atas sarannya!' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;

  @ApiPropertyOptional({ description: 'Parent comment ID if this is a reply', example: 12 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @IsPositive()
  commentId?: number;
}

/** Payload for toggling like / reaction on a post. */
export class ToggleReactionDto {
  @ApiPropertyOptional({ description: 'Reaction type', example: 'heart', default: 'heart' })
  @IsOptional()
  @IsString()
  reaction?: string = 'heart';
}

/** Payload for reporting an inappropriate post. */
export class ReportMemberForumPostDto {
  @ApiProperty({ description: 'Reason for reporting', example: 'Spam' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  reason: string;

  @ApiPropertyOptional({ description: 'Additional details', example: 'Konten berulang dan tidak relevan.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

/** Query parameters for retrieving post comments. */
export class MemberForumCommentsQueryDto {
  @ApiPropertyOptional({ description: 'Pagination limit', example: 15, default: 15 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 15;

  @ApiPropertyOptional({ description: 'Pagination cursor', example: '' })
  @IsOptional()
  @IsString()
  after?: string;
}
