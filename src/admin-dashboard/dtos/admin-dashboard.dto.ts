import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsDate, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";


export class AdminDashboardDto {

    @ApiProperty({description: "Start date", example: "2025-01-01"})
    @Type(() => Date)
    @IsDate()
    @IsOptional()
    start_date: Date;

    @ApiProperty({description: "End date", example: "2025-01-30"})
    @Type(() => Date)
    @IsDate()
    @IsOptional()
    end_date: Date;
    
}

export class DateRangeDto {
    @ApiProperty({ example: '2025-08-01', description: 'Start date (YYYY-MM-DD), local +08:00' })
    @IsDateString()
    start_date: string;
  
    @ApiProperty({ example: '2025-08-19', description: 'End date (YYYY-MM-DD), local +08:00' })
    @IsDateString()
    end_date: string;
  }



export class HistoryByDaysDto {
    @ApiProperty({description: "Type", example: "daily", enum: ['daily', 'monthly']})
    @IsString()
    @IsEnum(['daily', 'monthly'])
    @IsNotEmpty()
    type: 'daily' | 'monthly';
}

export class TopMemberDto {
    @ApiProperty({description: "Type", example: "post", enum: ['post', 'comment', 'reaction']})
    @IsString()
    @IsEnum(['post', 'comment', 'reaction'])
    @IsNotEmpty()
    type: 'post' | 'comment' | 'reaction';
}

export class TopSpacesDto {
    @ApiProperty({description: "Type", example: "post", enum: ['post', 'member']})
    @IsString()
    @IsEnum(['post', 'member'])
    @IsNotEmpty()
    type: 'post' | 'member';
}

export class TopPostDto {
    @ApiProperty({description: "Type", example: "view", enum: ['view', 'comment', 'reaction']})
    @IsString()
    @IsEnum(['view', 'comment', 'reaction'])
    @IsNotEmpty()
    type: 'view' | 'comment' | 'reaction';
}