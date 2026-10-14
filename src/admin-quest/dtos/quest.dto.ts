import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmpty, IsString, IsEnum, IsDate, IsArray, ValidateNested, IsNumber, IsOptional } from "class-validator";

export enum QuestAction {
    CREATE_POST = "create_post",
    RECEIVE_LIKE = "receive_like",
    SEND_LIKE = "send_like",
    SEND_COMMENT = "send_comment",
    SHARE_POST = "share_post",
    RECIVE_FOLLOWER = "recive_follower",
    COMPLETE_PROFILE = "complete_profile",
    JOIN_SPACES = "join_spaces",
    VIEW_POST = "view_post",
    REACTION_POST = "reaction_post",
    POST_WITH_VIDEO = "post_with_video",
}


export enum QuestParameter {
    USE_HASHTAG = "use_hashtag",
    RECEIVER_LIKE = "receiver_like",
    RECEIVER_COMMENT = "receiver_comment",
    RECEIVER_FOLLOWER = "receiver_follower",
    RECEIVER_SHARE = "receiver_share",
    RECEIVER_VIEW = "receiver_view",
}

export enum QuestAggregate {
    SUM = "sum",
    COUNT = "count",
    MAX = "max",
    MIN = "min",
    AVG = "avg",
    EQUAL = "equal"
}

// can select multiple target
export enum QuestTarget {
    USER = "user",
    POST = "post",
    COMMENT = "comment",
    LIKE = "like",
    SHARE = "share",
    SPACE = "space",
    HASHTAG = "hashtag",

}

export class CreateQuestDetailDto {
  
    @ApiProperty({ 
        description: "Parameter type", 
        example: "create_post", 
        enum: QuestParameter 
      })
    @IsEnum(QuestParameter)
    @Type(() => String)
    @IsNotEmpty()
    parameter: QuestParameter
  
    @ApiProperty({ description: "Aggregate", example: "sum", enum: QuestAggregate })
    @IsEnum(QuestAggregate)
    @Type(() => String)
    @IsNotEmpty()
    aggregate: QuestAggregate;
  
    @ApiProperty({ description: "Value", example: "100" })
    @IsNumber()
    @IsNotEmpty()
    @Type(() => Number)
    value: number;
    

    // can select multiple target
    @ApiProperty({ description: "Target", example: "user", enum: QuestTarget })
    @IsEnum(QuestTarget, { each: true })
    @IsNotEmpty()
    @Type(() => String)
    target: QuestTarget[];
  }
  
export class CreatedQuestDto {
  @ApiProperty({ description: "Title", example: "Quest 1" })
  @IsString()
  @IsNotEmpty()
  @Type(() => String)
  title: string;

  @ApiProperty({ description: "Image", example: "Image" })
  @IsString()
  @IsNotEmpty()
  @Type(() => String)
  image: string;

  @ApiProperty({ description: "Description", example: "Quest 1 Description" })
  @IsString()
  @IsNotEmpty()
  @Type(() => String)
  description: string;

  @ApiProperty({ description: "Condition", example: "single", enum: ["single", "multiple"] })
  @IsEnum(["single", "multiple"])
  @IsNotEmpty()
  @Type(() => String)
  condition: "single" | "multiple";

  @ApiProperty({ 
    description: "Action", 
    example: "create_post", 
    enum: QuestAction 
  })
  @IsEnum(QuestAction)
  @Type(() => String)
  @IsNotEmpty()
  action: QuestAction;

  @ApiProperty({ description: "Interval", example: "daily", enum: ["daily", "weekly"] })
  @IsEnum(["daily", "weekly"])
  @IsNotEmpty()
  @Type(() => String)
  interval: "daily" | "weekly";

  @ApiProperty({ description: "Date Start", example: "2025-01-01" })
  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  dateStart: Date;

  @ApiProperty({ description: "Date End", example: "2025-01-01" })
  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  dateEnd: Date;

  @ApiProperty({ description: "Status", example: 1, enum: [0, 1] })
  @IsEnum([0, 1])
  @IsNotEmpty()
  @Type(() => Number)
  status: number;

  @ApiProperty({
    description: "Quest Details",
    type: [CreateQuestDetailDto],
    example: [
      {
        parameter: "use_hashtag",
        aggregate: "sum",
        value: 100,
        target: ["user", "post"]
      }
    ]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestDetailDto)
  questDetails: CreateQuestDetailDto[];
}


export class OnOffStatusQuestDto {
  @ApiProperty({ description: "Id", example: 1 })
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  id: number;

  @ApiProperty({ description: "Status", example: 1, enum: [0, 1] })
  @IsEnum([0, 1])
  @IsNotEmpty()
  @Type(() => Number)
  status: number;
}
