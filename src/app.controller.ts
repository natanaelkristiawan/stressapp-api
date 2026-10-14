import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { GlobalResponse } from 'src/interfaces/global.interface';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@Controller()
@ApiTags('Config')
@ApiBearerAuth('access-token')  
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('is-live')
  @ApiOperation({ summary: 'Check if the server is live' })
  @ApiResponse({ status: 200, description: 'Server is live', example: {
    "success": true,
    "alert": {
      "code": 200,
      "message": "Success"
    },
    "data": {
      "isLive": true
    }
  } })
  getStatus(): GlobalResponse<{isLive: boolean}> {
    return {
      message: 'success',
      data: {
        isLive: true
      }
    }
  }
}
