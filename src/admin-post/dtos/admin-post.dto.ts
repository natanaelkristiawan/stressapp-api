import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDate, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsIn, IsBoolean } from "class-validator";

export class AdminPostListDto {

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


    // search_by enum with value select  title, author, space, tag, published_at, description
    @ApiPropertyOptional({description: "Search by", example: "title", enum: ["title", "author", "space", "published_at", "description", "tag"]})
    @IsString()
    @IsIn(["title", "author", "space", "published_at", "description", "tag"])
    @IsOptional()
    search_by?: "title" | "author" | "space" | "published_at" | "description" | "tag";


    // set optional 
    @ApiPropertyOptional({description: "Search", example: ""})
    @Type(() => String)
    @IsString()
    @IsOptional()
    search: string;

    @ApiPropertyOptional({
        description: "Sort",
        example: "",
        enum: [ "name", "created_at", "views", "reactions", "comments", "published_at"],
        default: ""
    })
    @IsOptional()
    @IsString()
    @IsIn(["name", "created_at", "views", "reactions", "comments", "published_at"])
    sort?: "name" | "created_at" | "views" | "reactions" | "comments" | "published_at";

    @ApiPropertyOptional({
        description: "Order",
        example: "asc",
        enum: ["asc", "desc"],
        default: "asc"
    })
    @IsOptional()
    @IsString()
    @IsIn(["asc", "desc"])
    order?: "asc" | "desc";
    
    
    // date string
    @ApiPropertyOptional({description: "Start date (YYYY-MM-DD)", example: ""})
    @Type(() => Date)
    @IsDate()
    @IsOptional()
    start_date: Date;

    @ApiPropertyOptional({description: "End date (YYYY-MM-DD)", example: ""})
    @Type(() => Date)
    @IsDate()
    @IsOptional()
    end_date: Date;
    
}

export class AdminAuditListDto {

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


export class AdminPostExportDto {



    // search_by enum with value select  title, author, space, tag, published_at, description
    @ApiPropertyOptional({description: "Search by", example: "title", enum: ["title", "author", "space", "published_at", "description"]})
    @IsString()
    @IsIn(["title", "author", "space", "published_at", "description"])
    @IsOptional()
    search_by?: "title" | "author" | "space" | "published_at" | "description";


    // set optional 
    @ApiPropertyOptional({description: "Search", example: ""})
    @Type(() => String)
    @IsString()
    @IsOptional()
    search: string;

    @ApiPropertyOptional({
        description: "Sort",
        example: "",
        enum: ["title", "created_at"],
        default: ""
    })
    @IsOptional()
    @IsString()
    @IsIn(["title", "created_at"])
    sort?: "title" | "created_at";

    @ApiPropertyOptional({
        description: "Order",
        example: "asc",
        enum: ["asc", "desc"],
        default: "asc"
    })
    @IsOptional()
    @IsString()
    @IsIn(["asc", "desc"])
    order?: "asc" | "desc";
    
    
    // date string
    @ApiPropertyOptional({description: "Start date (YYYY-MM-DD)", example: ""})
    @Type(() => Date)
    @IsDate()
    @IsOptional()
    start_date: Date;

    @ApiPropertyOptional({description: "End date (YYYY-MM-DD)", example: ""})
    @Type(() => Date)
    @IsDate()
    @IsOptional()
    end_date: Date;
    
}

export class CreatePostHighlightDto {
    @ApiProperty({description: "Post id", example: 1})
    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    post_id: number;

    @ApiProperty({description: "Is highlight", example: true})
    @Type(() => Boolean)
    @IsBoolean()
    @IsNotEmpty()
    is_highlight: boolean;
    
}

export class MovePostToSpaceDto {
    @ApiProperty({description: "Space id", example: 1})
    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    space_id: number;
}


export class AdminPostAnalyticsDto {
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