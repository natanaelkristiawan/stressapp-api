import { BadRequestException, Body, Controller, Post, Req, UnauthorizedException } from '@nestjs/common';
import { ChangePasswordDto, LoginDto } from './dtos/auth.dto';
import { JwtService } from '@nestjs/jwt';
import { AdminAuthService } from './admin-auth.service';
import { GlobalResponse } from 'src/interfaces/global.interface';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ApiOperation } from '@nestjs/swagger';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Admin Auth')
@Controller('admin-auth')
export class AdminAuthController {
    constructor(
        private readonly adminAuthService: AdminAuthService
    ) {}

    @Post('login')
    @ApiOperation({ summary: 'Login' })
    @ApiResponse({ status: 200, description: 'Login successful', example:{
        "success": true,
        "alert": {
          "code": 201,
          "message": "Login successful"
        },
        "data": {
          "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL21pbWF0ZS5vdGVzdXRvLmNvbS9hZG1pbi1hdXRoL2xvZ2luIiwiaWF0IjoxNzQ4ODMxNDE4LCJleHAiOjE3NDg5MTc4MTgsIm5iZiI6MTc0ODgzMTQxOCwianRpIjoiYWY2OTZiNzctMGJlYy00NCIsImVtYWlsIjoiYWRtaW5AbWltYXRlLmNvbSIsInBob25lIjoiIiwic3ViIjoiZjJhOGUxMGU1ZmExOWM5NzRkNWQxNmNkOWRiNzNkMmIzMDZhZjk4MDI3NGQ4ODYzYzMwY2Q4NWJkMWNjYmU2OCIsImlkIjoyM30.2qZ4_7F-E4MDu-CedaVNQqRo0bD6iAVgaMrYSUxQn-Q"
        }
      }})
    async login(@Body() loginDto: LoginDto): Promise<GlobalResponse<any>> {

        // split email and password
        const { email, password } = loginDto

        const user = await this.adminAuthService.validateUser(email, password)

   

        if(!user) {
            throw new UnauthorizedException('Invalid credentials')
        }

        // token
        const token = await this.adminAuthService.login(user)
        
        return {
            message: 'Login successful',
            data: {
                access_token: token,
                user: user.userMimate,
            }
        }
       
    }

    @Post('change-password')
    @ApiOperation({ summary: 'Change password' })
    @ApiResponse({ status: 200, description: 'Password changed successfully', example:{}})
    @ApiBearerAuth('access-token')
    async changePassword(@Body() changePasswordDto: ChangePasswordDto, @Req() req: any): Promise<GlobalResponse<{ message: string }>> {
        // change password
        let user = req['userData']


        const data = await this.adminAuthService.changePassword(changePasswordDto, user.id);

        // return data
        return {
            message: 'Password changed successfully',
            data: data,
        }
    }
}
