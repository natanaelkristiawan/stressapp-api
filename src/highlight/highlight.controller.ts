import { Controller, Get, Query, Req } from '@nestjs/common';
import { GlobalResponse } from 'src/interfaces/global.interface';
import { HighlightService } from './highlight.service';
import {
  Highlight as HighlightInterface,
  HighlightV2 as HighlightV2Interface,
} from './interfaces/highlight.interface';
import { GetHighlightDto } from './dtos/get-highlight.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('HIGHLIGHT')
@ApiBearerAuth('access-token')
@Controller('highlight')
export class HighlightController {

  constructor(
    private readonly highlightService: HighlightService,
  ) { }

  // get all highlight (v1 default)
  @Get('/')
  @ApiOperation({ summary: 'Get all highlight' })
  @ApiResponse({
    status: 200, description: 'Success', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success"
      },
      "data": [
        {
          "id": 1,
          "name": "QUIZ MIMATE",
          "image": "https://yes.sgp1.digitaloceanspaces.com/images/1748402341784-6ce46c4a-ea5c-45e3-a9bc-803237503b6c-mimatequiz.png",
          "order": 0,
          "link": "mmksi://mimate?page="
        },
        {
          "id": 2,
          "name": "IIMS 2025",
          "image": "https://yes.sgp1.digitaloceanspaces.com/images/1748402363559-0b3683f5-6506-4b46-98d6-cd3f6a5027d3-imms.png",
          "order": 0,
          "link": "mmksi://mimate?page="
        },
        {
          "id": 3,
          "name": "MITSHUBISHI MOTOR",
          "image": "https://yes.sgp1.digitaloceanspaces.com/images/1748402383048-92a438a5-4c81-4981-8ee0-d821c26d7abd-mitshu.png",
          "order": 0,
          "link": "mmksi://mimate?page="
        },
        {
          "id": 4,
          "name": "MITSHUBISHI RALLY MOTOR",
          "image": "https://yes.sgp1.digitaloceanspaces.com/images/1748402400166-01fea245-19c5-4af5-ba4f-50f97da06d27-rally.png",
          "order": 0,
          "link": "mmksi://mimate?page="
        }
      ]
    }
  })
  async getAllHighlight(
    @Query() dto?: GetHighlightDto,
  ): Promise<GlobalResponse<HighlightInterface[]>> {

    // get data     
    const data = await this.highlightService.getAllHighlight(dto);

    // return data
    return {
      message: 'Success',
      data: data,
    }
  }


  // get all highlight (v2)
  @Get('/v2')
  @ApiOperation({ summary: 'Get all highlight (v2)' })
  @ApiResponse({
    status: 200, description: 'Success', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success"
      },
      "data": [
        {
          "id": 1,
          "name": "QUIZ MIMATE",
          "file": "https://yes.sgp1.digitaloceanspaces.com/images/1748402341784-6ce46c4a-ea5c-45e3-a9bc-803237503b6c-mimatequiz.png",
          "type": "image",
          "order": 0,
          "link": "mmksi://mimate?page=&token=eyJhbGciOi...",
          "need_token": 1
        },
        {
          "id": 2,
          "name": "IIMS 2025",
          "file": "https://yes.sgp1.digitaloceanspaces.com/lotties/1748402363559-0b3683f5-6506-4b46-98d6-cd3f6a5027d3-imms.json",
          "type": "lottie",
          "order": 0,
          "link": "mmksi://mimate?page=",
          "need_token": 0
        },
        {
          "id": 3,
          "name": "MITSHUBISHI MOTOR",
          "file": "https://yes.sgp1.digitaloceanspaces.com/images/1748402383048-92a438a5-4c81-4981-8ee0-d821c26d7abd-mitshu.png",
          "type": "image",
          "order": 0,
          "link": "mmksi://mimate?page=",
          "need_token": 0
        },
        {
          "id": 4,
          "name": "MITSHUBISHI RALLY MOTOR",
          "file": "https://yes.sgp1.digitaloceanspaces.com/images/1748402400166-01fea245-19c5-4af5-ba4f-50f97da06d27-rally.png",
          "type": "image",
          "order": 0,
          "link": "mmksi://mimate?page=",
          "need_token": 0
        }
      ]
    }
  })
  async getAllHighlightV2(
    @Req() req: any,
    @Query() dto?: GetHighlightDto,
  ): Promise<GlobalResponse<HighlightV2Interface[]>> {
    const rawAuth = (req.headers?.authorization || req.headers?.Authorization || req.query?.token || '') as string;
    const token = rawAuth.replace(/^Bearer\s+/i, '').trim();

    // get data     
    const data = await this.highlightService.getAllHighlightV2(dto, token);

    // return data
    return {
      message: 'Success',
      data: data,
    }
  }
}

