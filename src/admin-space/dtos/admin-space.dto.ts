import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDate, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsIn, IsBoolean } from "class-validator";

export class AdminSpaceListDto {

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

    // set optional 
    @ApiPropertyOptional({description: "Search", example: ""})
    @Type(() => String)
    @IsString()
    @IsOptional()
    search: string;

    @ApiPropertyOptional({
        description: "Sort",
        example: "",
        enum: ["created_at"],
        default: ""
    })
    @IsOptional()
    @IsString()
    @IsIn(["created_at"])
    sort?: "created_at";

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
    
    
}


export class AdminSpaceCreateDto {

    @ApiPropertyOptional({description: "Image", example: "https://yes.sgp1.digitaloceanspaces.com/images/1745898969793-9eaddcd6-39c8-414a-84a9-2ae54dfb8ae7-xforce.png"})
    @Type(() => String)
    @IsString()
    @IsOptional()
    image: string;

    @ApiPropertyOptional({description: "Banner", example: "https://yes.sgp1.digitaloceanspaces.com/images/banner.png"})
    @Type(() => String)
    @IsString()
    @IsOptional()
    banner: string;

    @ApiProperty({description: "Space Name", example: "Sample Space"})
    @Type(() => String)
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({description: "Description", example: "Deskripsi komunitas"})
    @Type(() => String)
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({
        description: "Is Dealer",
        example: false,
        default: false
    })
    @IsOptional()
    @IsBoolean()
    is_dealer?: boolean;
}

// DTO for viewing a single space (response)
export class AdminSpaceViewDto {
    id: number;
    name: string;
    description?: string;
    image: string;
    banner: string;
    membersCount: number;
    postsCount: number;
    backup_space_id: number;
    is_dealer?: boolean;
    created_at: Date;
}

// DTO for updating a space
export class AdminSpaceUpdateDto {
    @ApiProperty({ description: 'Space ID', example: 1 })
    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    id: number;

    @ApiPropertyOptional({ description: 'Space Name', example: 'Updated Space' })
    @Type(() => String)
    @IsString()
    @IsOptional()
    name?: string;

    @ApiPropertyOptional({ description: 'Description', example: 'Updated description' })
    @Type(() => String)
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ description: 'Image URL', example: 'https://example.com/image.png' })
    @Type(() => String)
    @IsString()
    @IsOptional()
    image?: string;

    @ApiPropertyOptional({ description: 'Banner URL', example: 'https://example.com/banner.png' })
    @Type(() => String)
    @IsString()
    @IsOptional()
    banner?: string;

    @ApiPropertyOptional({ description: 'Is Dealer', example: false })
    @IsOptional()
    @IsBoolean()
    is_dealer?: boolean;
}

// DTO for deleting a space
export class AdminSpaceDeleteDto {
    @ApiProperty({ description: 'Space ID', example: 1 })
    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    id: number;
}