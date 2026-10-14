import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDate, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsIn, IsEmail } from "class-validator";

export class AdminUserListDto {

    @ApiProperty({ description: "Page", example: 1 })
    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    page: number;

    @ApiProperty({ description: "Limit", example: 10 })
    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    limit: number;

    // set optional 
    @ApiPropertyOptional({ description: "Search", example: "" })
    @Type(() => String)
    @IsString()
    @IsOptional()
    search: string;

    // filter
    @ApiPropertyOptional({ description: "Filter", example: "" })
    @Type(() => String)
    @IsString()
    @IsOptional()
    filter?: string;

    @ApiPropertyOptional({
        description: "Sort",
        example: "",
        enum: ['name', 'created_at', 'updated_at', 'posts', 'comments', 'mimate_point', 'shares'],
        default: ""
    })
    @IsOptional()
    @IsString()
    @IsIn(["name", "created_at", "updated_at", "posts", "comments", "mimate_point", "shares"])
    sort?: "name" | "created_at" | "updated_at" | "posts" | "comments" | "mimate_point" | "shares";

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
    @ApiPropertyOptional({ description: "Start date (YYYY-MM-DD)", example: "" })
    @Type(() => Date)
    @IsDate()
    @IsOptional()
    start_date: Date;

    @ApiPropertyOptional({ description: "End date (YYYY-MM-DD)", example: "" })
    @Type(() => Date)
    @IsDate()
    @IsOptional()
    end_date: Date;




}


export class AdminUserExportDto {

    @ApiPropertyOptional({ description: "Search", example: "" })
    @Type(() => String)
    @IsString()
    @IsOptional()
    search: string;

    @ApiPropertyOptional({ description: "Start date (YYYY-MM-DD)", example: "" })
    @Type(() => Date)
    @IsDate()
    @IsOptional()
    start_date: Date;

    @ApiPropertyOptional({ description: "End date (YYYY-MM-DD)", example: "" })
    @Type(() => Date)
    @IsDate()
    @IsOptional()
    end_date: Date;

    @ApiPropertyOptional({ 
        description: "Export format", 
        example: "excel",
        enum: ['excel', 'csv'],
        default: 'excel'
    })
    @IsOptional()
    @IsString()
    @IsIn(['excel', 'csv'])
    format?: 'excel' | 'csv';

}


export class AdminUserAnalyticsDto {

    @ApiPropertyOptional({ description: "Start date (YYYY-MM-DD)", example: "2025-05-01" })
    @Type(() => Date)
    @IsDate()
    @IsOptional()
    start_date: Date;

    @ApiPropertyOptional({ description: "End date (YYYY-MM-DD)", example: "2025-05-30" })
    @Type(() => Date)
    @IsDate()
    @IsOptional()
    end_date: Date;

}


// suspend user
export class AdminUserSuspendDto {

    @ApiPropertyOptional({ description: "Suspend reason", example: "Suspend reason" })
    @Type(() => String)
    @IsString()
    @IsOptional()
    suspend_reason: string;
}


// update user
export class AdminUserUpdateDto {

    @ApiPropertyOptional({ description: "Name", example: "John Doe" })
    @Type(() => String)
    @IsString()
    @IsOptional()
    name: string;

    // username
    @ApiPropertyOptional({ description: "Username", example: "john_doe" })
    @Type(() => String)
    @IsString()
    @IsOptional()
    username: string;

    // birth_date
    @ApiPropertyOptional({ description: "Birth date", example: "2000-01-01" })
    @Type(() => Date)
    @IsDate()
    @IsOptional()
    dob: Date;

    // gender option male or female
    @ApiPropertyOptional({ description: "Gender", example: "male", enum: ["male", "female"] })
    @IsOptional()
    @IsString()
    @IsIn(["male", "female"])
    gender?: "male" | "female";

}


export class AdminUserAuditListDto {

    @ApiPropertyOptional({ description: "Page", example: 1 })
    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    page: number;

    @ApiPropertyOptional({ description: "Limit", example: 10 })
    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    limit: number;
}

export class AdminUserUpdateQuizWinnerDto {

    @ApiPropertyOptional({ description: "Quiz winner", example: 1 })
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    quiz_winner: number;
}

export class AdminUserQuestDetailDto {

    @ApiPropertyOptional({ description: "Page", example: 1 })
    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    page: number;

    @ApiPropertyOptional({ description: "Limit", example: 10 })
    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    limit: number;
}