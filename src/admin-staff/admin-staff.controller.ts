import { Body, Controller, Delete, Get, Param, Post, Query, Put } from '@nestjs/common';
import { GlobalResponse } from 'src/interfaces/global.interface';
import { AdminStaffService } from './admin-staff.service';
import { Datatable, DataUser } from './interfaces/datatable.interface';
import { AdminStaffCreateDto, AdminStaffListDto, AdminStaffEditDto } from './dtos/admin-staff.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@Controller('admin-staff')
@ApiTags('ADMIN STAFF')
@ApiBearerAuth('access-token')
export class AdminStaffController {

    constructor(
        private readonly adminStaffService: AdminStaffService
    ){}

    @Get('list')
    @ApiOperation({ summary: 'Get staff list' })
    @ApiResponse({ status: 200, description: 'Success', example: {}})
    @ApiResponse({ status: 400, description: 'Bad Request', example: {
        "success": false,
        "alert": {
          "code": 400,
          "message": "Bad Request"
        },
        "data": {}
      }})
    async getUserList(@Query() adminStaffListDto: AdminStaffListDto): Promise<GlobalResponse<Datatable>> {
        
        // get data
        
        const data = await this.adminStaffService.getAllUserAdmin(adminStaffListDto);

        // return data
        return {
            message: 'Success',
            data: data,
        }
    }
    
    @Post('create')
    @ApiOperation({ summary: 'Create user staff - select member and set password/role' })
    @ApiResponse({ status: 200, description: 'Success', example: {}})
    @ApiResponse({ status: 400, description: 'Bad Request', example: {
        "success": false,
        "alert": {
            "code": 400,
            "message": "Bad Request"
        },
        "data": {}
    }})
    async createUserAdmin(@Body() adminStaffCreateDto: AdminStaffCreateDto): Promise<GlobalResponse<{ message: string }>> {
        // create user admin
        const data = await this.adminStaffService.createUserAdmin(adminStaffCreateDto);

        // return data
        return {
            message: 'Success',
            data: data,
        }
    }

    @Get('detail/:id')
    @ApiOperation({ summary: 'Get staff detail' })
    @ApiResponse({ status: 200, description: 'Success', example: {}})
    @ApiResponse({ status: 400, description: 'Bad Request', example: {
        "success": false,
        "alert": {
            "code": 400,
            "message": "Bad Request"
        },
        "data": {}
    }}) 
    async detailUserAdmin(@Param('id') id: number): Promise<GlobalResponse<DataUser>> {
        // get detail user admin
        const data = await this.adminStaffService.detailUserAdmin(id);

        // return data
        return {
            message: 'Success',
            data: data,
        }
    }

    @Post('edit')
    @ApiOperation({ summary: 'Edit user staff - select member and update role/password' })
    @ApiResponse({ status: 200, description: 'Success', example: {}})
    @ApiResponse({ status: 400, description: 'Bad Request', example: {
        "success": false,
        "alert": {
            "code": 400,
            "message": "Bad Request"
        },
        "data": {}
    }})
    async editUserAdmin(@Body() adminStaffEditDto: AdminStaffEditDto): Promise<GlobalResponse<{ message: string }>> {
        // edit user admin
        const data = await this.adminStaffService.editUserAdmin(adminStaffEditDto);

        // return data
        return {
            message: 'Success',
            data: data,
        }
    }

    @Delete('delete/:id')   
    @ApiOperation({ summary: 'Delete user staff' })
    @ApiResponse({ status: 200, description: 'Success', example: {}})
    @ApiResponse({ status: 400, description: 'Bad Request', example: {
        "success": false,
        "alert": {
            "code": 400,
            "message": "Bad Request"
        },  
        "data": {}
    }})
    async deleteUserAdmin(@Param('id') id: number): Promise<GlobalResponse<{ message: string }>> {
        // delete user admin
        const data = await this.adminStaffService.deleteUserAdmin(id);

        // return data
        return {
            message: 'Success',
            data: data,
        }
    }
}
