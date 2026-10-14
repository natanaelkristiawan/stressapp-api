import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsOptional, IsString, IsBoolean, IsDateString, IsNumber, IsUrl, IsNotEmpty } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ description: 'Full name of the user', example: 'Abid Putra' })
  @IsNotEmpty()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Photo URL', example: '' })
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiProperty({ description: 'Email address of the user', example: 'abidramadhan0698@gmail.com' })
  @IsNotEmpty()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Gender of the user', example: 'male' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ description: 'Date of birth (YYYY-MM-DD)', example: '1998-01-06' })
  @IsOptional()
  @IsDateString()
  dob?: string;

  @ApiPropertyOptional({ description: 'User tagline', example: 'Living life one code at a time' })
  @IsOptional()
  @IsString()
  tagline?: string;

  @ApiPropertyOptional({ description: 'Short biography of the user', example: 'Software developer from Jakarta' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ description: 'Hobbies of the user', example: 'Gaming, Reading' })
  @IsOptional()
  @IsString()
  hobby?: string;

  @ApiPropertyOptional({ description: 'Monthly income in USD', example: 1200 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  income?: number;

  @ApiPropertyOptional({ description: 'Personal or social media link', example: 'https://instagram.com/abidputra' })
  @IsOptional()
  @IsUrl()
  link?: string;

  @ApiPropertyOptional({ description: 'Postal code with area info', example: '13450 - Pondok Kelapa, Duren Sawit, Jakarta Timur' })
  @IsOptional()
  @IsString()
  postCode?: string;

  @ApiPropertyOptional({ description: 'Full address or location', example: 'Pondok Kelapa' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'SIM expiration date', example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  SIMExpired?: string;
}
