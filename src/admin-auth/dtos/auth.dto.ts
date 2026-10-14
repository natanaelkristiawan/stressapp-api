import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
    @ApiProperty({description: "Email", example: "admin@mimate.com"})
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({description: "Password", example: "password"})
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    password: string;
}


export class ChangePasswordDto {
    @ApiProperty({description: "Old Password", example: "password"})
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    oldPassword: string;

    @ApiProperty({description: "New Password", example: "password"})
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    newPassword: string;

    @ApiProperty({description: "Confirm New Password", example: "password"})
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    confirmNewPassword: string;
    
}