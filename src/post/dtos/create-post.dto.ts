import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsNotEmpty, IsOptional, IsString, IsNumber, IsBoolean, IsEnum, ValidateNested } from "class-validator";
import { PostType } from "../../entity/post.entity";

export class VoteOptionDto {
  @ApiProperty({ description: "Vote option label", example: "vote 1" })
  @IsString()
  vote: string;
}

/** For update: include id to update existing, omit id to create new. */
export class UpdateVoteOptionDto {
  @ApiPropertyOptional({ description: "Vote option id (omit to create new)", example: 1 })
  @IsOptional()
  @IsNumber()
  id?: number;

  @ApiProperty({ description: "Vote option label", example: "lorem" })
  @IsString()
  vote: string;
}

export class CreatePostDto {
    @ApiProperty({ description: "Title Post", example: "Ada baret di mobil? Panik nggak tuh, Warga?" })
    @Type(() => String)
    @IsNotEmpty()
    @IsString()
    title: string;

    @ApiPropertyOptional({ description: "Content", example: "Mobil kesayangan tergores? Jangan panik! Temukan cara mudah dan cepat untuk menghilangkan baret di mobil tanpa harus ke bengkel." })
    @Type(() => String)
    @IsOptional() // M
    @IsString()
    content: string;
    

    @ApiPropertyOptional({ description: "space ID", example: 2 })
    @Type(() => Number)
    @IsOptional() // M
    @IsNumber()
    spaceId: number;


    @ApiPropertyOptional({
        description: "For asset image or video (Set ID from upload response)",
        example: [5122,5123,5124],
        type: [Number],
    })
    @IsOptional() // Makes the field optional
    @IsArray()
    mediaIds?: number[];

    @ApiPropertyOptional({
        description: "Tags for the post",
        example: ["car", "scratch", "panic"],
        type: [String],
    })
    @IsOptional() // Makes the field optional
    @IsArray()
    @IsString({ each: true }) // Ensures each element in the array is a string
    tags?: string[];


    // create type with enum image or video default is image
    @ApiPropertyOptional({
        description: "Type of the post",
        example: "image",
        type: String,
    })
    @IsOptional() // Makes the field optional
    @IsString()
    type?: string;

    @ApiPropertyOptional({
        description: "Post type: post or vote",
        example: "post",
        enum: PostType,
        default: PostType.Post,
    })
    @IsOptional()
    @IsEnum(PostType)
    post_type?: PostType = PostType.Post;

    @ApiPropertyOptional({
      description: "Vote options. Create: [{ vote: string }]. Update: include id to update, omit id to create new.",
      example: [{ id: 1, vote: "lorem" }, { vote: "hedon" }],
      type: [UpdateVoteOptionDto],
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UpdateVoteOptionDto)
    votes?: UpdateVoteOptionDto[];

    @ApiPropertyOptional({
      description: "Vote ids to delete (update post only)",
      example: [1, 2, 3],
      type: [Number],
    })
    @IsOptional()
    @IsArray()
    @IsNumber({}, { each: true })
    voteDeleted?: number[];

    @ApiPropertyOptional({
      description: "Vote period start (YYYY-MM-DD HH:mm:ss). Voting allowed only between vote_start and vote_end.",
      example: "2025-02-01 00:00:00",
      type: String,
    })
    @IsOptional()
    @IsString()
    vote_start?: string;

    @ApiPropertyOptional({
      description: "Vote period end (YYYY-MM-DD HH:mm:ss). Voting allowed only between vote_start and vote_end.",
      example: "2025-02-28 23:59:59",
      type: String,
    })
    @IsOptional()
    @IsString()
    vote_end?: string;

    // notif title
    @ApiPropertyOptional({
        description: "Notif title",
        example: "New Post",
        type: String,
    })
    @IsOptional() // Makes the field optional
    @IsString()
    notifTitle?: string;

    // notif message
    @ApiPropertyOptional({
        description: "Notif message",
        example: "New Post",
        type: String,
    })
    @IsOptional() // Makes the field optional
    @IsString()
    notifMessage?: string;

     // notif message
     @ApiPropertyOptional({
        description: "Is notification",
        example: true,
        type: String,
    })
    @IsOptional() // Makes the field optional
    @IsBoolean()
    isNotification?: boolean;
}
