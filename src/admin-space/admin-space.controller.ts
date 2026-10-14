import { Body, Controller, Delete, Get, Param, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminSpaceListDto } from './dtos/admin-space.dto';
import { AdminSpaceService } from './admin-space.service';
import { GlobalResponse } from 'src/interfaces/global.interface';
import { Datatable } from './interfaces/datatable.interface';
import { AdminPostExportDto, AdminPostListDto } from 'src/admin-post/dtos/admin-post.dto';
import { Datatable as DatatablePost } from 'src/admin-post/interfaces/datatable.interface';
import { AdminSpaceCreateDto, AdminSpaceViewDto, AdminSpaceUpdateDto, AdminSpaceDeleteDto } from './dtos/admin-space.dto';
import { DataSpace } from './interfaces/datatable.interface';
import { Response } from 'express';
import { AdminPostService } from 'src/admin-post/admin-post.service';

@Controller('admin-space')
@ApiTags('ADMIN SPACE')
@ApiBearerAuth('access-token')
export class AdminSpaceController {
    constructor(private readonly adminSpaceService: AdminSpaceService, private readonly adminPostService: AdminPostService) {}

    @Get('list')
    @ApiOperation({ summary: 'Get all space' })
    @ApiResponse({ status: 200, description: 'Success', example: {
        "success": true,
        "alert": {
            "code": 200,
            "message": "Success"
        },
        "data": {
            "items": [
                {
                    "id": 1,
                    "name": "Space 1",
                    "description": "Description 1",
                    "membersCount": 10,
                    "postsCount": 10
                }
            ],
            "recordsTotal": 0,
            "recordsFiltered": 0
        }
    }}) 
    @ApiResponse({ status: 400, description: 'Bad Request', example: {
        "success": false,
        "alert": {
            "code": 400,
            "message": "Bad Request"
        },
        "data": {}
      }})
    async getAllSpace(@Query() dto: AdminSpaceListDto): Promise<GlobalResponse<Datatable>> {
        const data = await this.adminSpaceService.getAllSpace(dto);
        return {
            message: 'Success',
            data: data,
        }
    }

    @Get('posts/:spaceId')
    @ApiOperation({ summary: 'Get post by space id' })
    @ApiResponse({ status: 200, description: 'Success', example: {
        "success": true,
        "alert": {
          "code": 200,
          "message": "Success"
        },
        "data": {
          "items": [
            {
              "id": 1850,
              "backup_member_id": 86176,
              "backup_space_id": 4,
              "title": "MITSUBISHI MOTORS LARGE AUTO SHOW JOGJA CITY MALL 19-22 SEPTEMBER 2024",
              "description": "Hai Mitsubishi Family ? \nAyo segera kunjungi pameran kami \"Ayo ke GAS (Gebyar Auto Show)\" di Jogja City Mall pada:\nHari Jumat Sore Tgl 20 September 2024 dari pukul 16.00-22.00WIB dan\nHari Minggu Sore Tgl...",
              "image": "",
              "status": "PUBLISHED",
              "type": "image",
              "reactionsCount": 0,
              "created_at": "2024-09-19T03:52:26.000Z",
              "updated_at": "2024-09-19T03:52:26.000Z",
              "published_at": "2024-09-19T03:52:27.000Z",
              "deleted_at": "",
              "space": {
                "id": 4,
                "name": "Mitsubishi Xforce",
                "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!"
              },
              "author": {
                "id": 86176,
                "name": "Mitsubishi Kolsug",
                "email": "email62df6da636a49@mmidn.co.jp",
                "profilePictureUrl": "https://tribe-s3-production.imgix.net/bfilvzh5ZCsHytz8djSXX?auto=compress,format",
                "userId": 642469
              }
            },
            {
              "id": 1885,
              "backup_member_id": 64777,
              "backup_space_id": 4,
              "title": "One year driving the Xpander Cross",
              "description": "Our one year experience with the Mitsubishi Xpander Cross is amazing as it brings us to our destinations with comfort and with safety. There had been no mechanical concern with this car and it drives ...",
              "image": "",
              "status": "PUBLISHED",
              "type": "image",
              "reactionsCount": 1,
              "created_at": "2024-09-14T11:20:55.000Z",
              "updated_at": "2024-09-14T11:20:55.000Z",
              "published_at": "2024-09-14T11:20:55.000Z",
              "deleted_at": "",
              "space": {
                "id": 4,
                "name": "Mitsubishi Xforce",
                "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!"
              },
              "author": {
                "id": 64777,
                "name": "Patrick Lorenzo Carbonell",
                "email": "patrickcarbonell@gmail.com",
                "profilePictureUrl": "",
                "userId": 1240835
              }
            },
            {
              "id": 1909,
              "backup_member_id": 90817,
              "backup_space_id": 4,
              "title": "Yeayy Service 1000 Km! ?",
              "description": "Alhamdulillah gak sabar service ke dealer, kira2 daerah jakpus dealer mitsu mana ya yang OK",
              "image": "",
              "status": "PUBLISHED",
              "type": "image",
              "reactionsCount": 2,
              "created_at": "2024-09-11T08:52:21.000Z",
              "updated_at": "2024-09-11T08:52:21.000Z",
              "published_at": "2024-09-11T08:52:21.000Z",
              "deleted_at": "",
              "space": {
                "id": 4,
                "name": "Mitsubishi Xforce",
                "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!"
              },
              "author": {
                "id": 90817,
                "name": "Binsky",
                "email": "email6184b24488782@mmidn.co.jp",
                "profilePictureUrl": "https://tribe-s3-production.imgix.net/I4QrNynGXWZLaMb6gOhKy?auto=compress,format",
                "userId": 64993
              }
            },
            {
              "id": 1929,
              "backup_member_id": 84542,
              "backup_space_id": 4,
              "title": "Serah terima kendaraan",
              "description": "Terimakasih atas pelayanan terbaiknya",
              "image": "",
              "status": "PUBLISHED",
              "type": "image",
              "reactionsCount": 1,
              "created_at": "2024-09-09T04:03:39.000Z",
              "updated_at": "2024-09-09T04:03:39.000Z",
              "published_at": "2024-09-09T04:03:39.000Z",
              "deleted_at": "",
              "space": {
                "id": 4,
                "name": "Mitsubishi Xforce",
                "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!"
              },
              "author": {
                "id": 84542,
                "name": "PT CSM",
                "email": "email6364db025fd38@mmidn.co.jp",
                "profilePictureUrl": "",
                "userId": 174406
              }
            },
            {
              "id": 1980,
              "backup_member_id": 68792,
              "backup_space_id": 4,
              "title": "Closing Unit ke 2 di mitshubisi",
              "description": "Pengambilan unit ke 2 expander GLS",
              "image": "",
              "status": "PUBLISHED",
              "type": "image",
              "reactionsCount": 1,
              "created_at": "2024-08-31T12:42:45.000Z",
              "updated_at": "2024-08-31T12:42:45.000Z",
              "published_at": "2024-08-31T12:42:45.000Z",
              "deleted_at": "",
              "space": {
                "id": 4,
                "name": "Mitsubishi Xforce",
                "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!"
              },
              "author": {
                "id": 68792,
                "name": "Rama Bertahan",
                "email": "ramabomber88@gmail.com",
                "profilePictureUrl": "",
                "userId": 1173826
              }
            },
            {
              "id": 1982,
              "backup_member_id": 88552,
              "backup_space_id": 4,
              "title": "#MitsubishiPastiSardana",
              "description": "",
              "image": "",
              "status": "PUBLISHED",
              "type": "image",
              "reactionsCount": 1,
              "created_at": "2024-08-31T07:41:31.000Z",
              "updated_at": "2024-08-31T07:41:31.000Z",
              "published_at": "2024-08-31T07:41:31.000Z",
              "deleted_at": "",
              "space": {
                "id": 4,
                "name": "Mitsubishi Xforce",
                "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!"
              },
              "author": {
                "id": 88552,
                "name": "RESTON SIRAIT",
                "email": "email6245bc5d4fa26@mmidn.co.jp",
                "profilePictureUrl": "",
                "userId": 538772
              }
            },
            {
              "id": 2004,
              "backup_member_id": 61489,
              "backup_space_id": 4,
              "title": "Yuni Zakinah Yulianto",
              "description": "Sales yg cekatan dan sangat ramah dalam pelayanan dan bantuan nya. Terima kasih MMPU MAKASSAR, semoga semakin jaya selalu.. Aamin",
              "image": "",
              "status": "PUBLISHED",
              "type": "image",
              "reactionsCount": 1,
              "created_at": "2024-08-29T06:14:17.000Z",
              "updated_at": "2024-08-29T06:14:17.000Z",
              "published_at": "2024-08-29T06:14:17.000Z",
              "deleted_at": "",
              "space": {
                "id": 4,
                "name": "Mitsubishi Xforce",
                "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!"
              },
              "author": {
                "id": 61489,
                "name": "Elly",
                "email": "agusyalimsetiawan1997@gmail.com",
                "profilePictureUrl": "",
                "userId": 1831297
              }
            },
            {
              "id": 2059,
              "backup_member_id": 90823,
              "backup_space_id": 4,
              "title": "Macet",
              "description": "Kemacetan yang menyenangkan. Hujan gerimis pandangan tetap clear.",
              "image": "",
              "status": "PUBLISHED",
              "type": "image",
              "reactionsCount": 1,
              "created_at": "2024-08-20T03:15:17.000Z",
              "updated_at": "2024-08-20T03:15:17.000Z",
              "published_at": "2024-08-20T03:15:18.000Z",
              "deleted_at": "",
              "space": {
                "id": 4,
                "name": "Mitsubishi Xforce",
                "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!"
              },
              "author": {
                "id": 90823,
                "name": "mobilku_xpander",
                "email": "email61837a1836a53@mmidn.co.jp",
                "profilePictureUrl": "https://tribe-s3-production.imgix.net/0E03PKgjV8e8tyFiBimCg?auto=compress,format",
                "userId": 58977
              }
            },
            {
              "id": 2060,
              "backup_member_id": 90823,
              "backup_space_id": 4,
              "title": "Kemerdekaan diisi dengan kaca film baru l, pandangan merdeka",
              "description": "Memerdekakan pandangan dalam mengemudi.",
              "image": "",
              "status": "PUBLISHED",
              "type": "image",
              "reactionsCount": 1,
              "created_at": "2024-08-20T03:13:28.000Z",
              "updated_at": "2024-08-20T03:13:28.000Z",
              "published_at": "2024-08-20T03:13:28.000Z",
              "deleted_at": "",
              "space": {
                "id": 4,
                "name": "Mitsubishi Xforce",
                "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!"
              },
              "author": {
                "id": 90823,
                "name": "mobilku_xpander",
                "email": "email61837a1836a53@mmidn.co.jp",
                "profilePictureUrl": "https://tribe-s3-production.imgix.net/0E03PKgjV8e8tyFiBimCg?auto=compress,format",
                "userId": 58977
              }
            },
            {
              "id": 2109,
              "backup_member_id": 85677,
              "backup_space_id": 4,
              "title": "Thankyou Mitsubishi",
              "description": "Hadiah dari acara GIIAS kemarin mendarat dengan selamat, thankyou Mitsubishi ???",
              "image": "",
              "status": "PUBLISHED",
              "type": "image",
              "reactionsCount": 1,
              "created_at": "2024-08-09T15:34:47.000Z",
              "updated_at": "2024-08-09T15:34:47.000Z",
              "published_at": "2024-08-09T15:34:47.000Z",
              "deleted_at": "",
              "space": {
                "id": 4,
                "name": "Mitsubishi Xforce",
                "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!"
              },
              "author": {
                "id": 85677,
                "name": "Yosef Riyanto",
                "email": "email62fc8c390dc29@mmidn.co.jp",
                "profilePictureUrl": "",
                "userId": 683531
              }
            }
          ],
          "recordsTotal": 303,
          "recordsFiltered": 303
        }
      }})
    @ApiResponse({ status: 400, description: 'Bad Request', example: {
        "success": false,
        "alert": {
            "code": 400,
            "message": "Bad Request"
        },
        "data": {}
      }})
    async getPostBySpaceId(@Query() dto: AdminPostListDto, @Param('spaceId') spaceId: number): Promise<GlobalResponse<DatatablePost>> {
        const data = await this.adminSpaceService.getPostBySpaceId(dto, spaceId);
        return {
            message: 'Success',
            data: data,
        }
    }

    @Get('post-highlight/:spaceId')
    @ApiOperation({ summary: 'Get post by space id' })
    @ApiResponse({ status: 200, description: 'Success', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success"
      },
      "data": {
        "items": [
          {
            "id": 21,
            "backup_member_id": 11830,
            "backup_space_id": 7,
            "title": "A Day at IIMS 2025 with Mitsubishi Motors",
            "description": "*Ngungsi ke Pameran* ?\nYuppss..\nJudulnya emang ngungsi, soalnya rumah kita sedang di renov.\nRenov garasi biar lebih gedean. Siapa tau kan yaa abis pameran, kita bisa boyong Dakar Ultimate 4x2 ?\nHari ini ...",
            "image": "https://tribe-s3-production.imgix.net/Ti03qd5f6dLuPOoL7gLOs?auto=compress,format",
            "status": "PUBLISHED",
            "type": "image",
            "reactionsCount": 7,
            "created_at": "2025-02-22T14:36:08.000Z",
            "updated_at": "2025-06-03T05:21:19.000Z",
            "published_at": "2025-02-22T14:36:08.000Z",
            "deleted_at": "",
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!"
            },
            "author": {
              "id": 11830,
              "name": "ARIF PURNOMO",
              "email": "arifpurnomo.pbm@gmail.com",
              "profilePictureUrl": "https://tribe-s3-production.imgix.net/GHVLKgsiLy4Gx7NVzKOSs?auto=compress,format",
              "userId": 1970317
            }
          },
          {
            "id": 33,
            "backup_member_id": 12423,
            "backup_space_id": 7,
            "title": "Morning Ride",
            "description": "Selamat Pagi warga MiMate_ID dari bumi Serambi Mekkah ??",
            "image": "https://tribe-s3-production.imgix.net/0RzT24fxOxqVvXDkkvwbZ?auto=compress,format",
            "status": "PUBLISHED",
            "type": "image",
            "reactionsCount": 7,
            "created_at": "2025-02-22T00:18:43.000Z",
            "updated_at": "2025-06-03T05:21:19.000Z",
            "published_at": "2025-02-22T00:18:43.000Z",
            "deleted_at": "",
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!"
            },
            "author": {
              "id": 12423,
              "name": "Heryanto",
              "email": "heryanto.ery@gmail.com",
              "profilePictureUrl": "https://tribe-s3-production.imgix.net/lPw3hCPkOxicJNJYfPjBl?auto=compress,format",
              "userId": 1971435
            }
          },
          {
            "id": 86,
            "backup_member_id": 25827,
            "backup_space_id": 7,
            "title": "Service 6 bulan",
            "description": "Alhamdulillah baru selesai service rutin 6 bulan di Sun Star Motor Cibinong.\nService OK, ruang tunggu nyaman, dan kopinya enak ?",
            "image": "https://tribe-s3-production.imgix.net/v8kZmW5ce815Qj27jeQfj?auto=compress,format",
            "status": "PUBLISHED",
            "type": "image",
            "reactionsCount": 6,
            "created_at": "2025-02-15T04:12:36.000Z",
            "updated_at": "2025-06-03T05:21:19.000Z",
            "published_at": "2025-02-15T04:12:36.000Z",
            "deleted_at": "",
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!"
            },
            "author": {
              "id": 25827,
              "name": "Lukmanul Hakim",
              "email": "hakim8luqmanul@gmail.com",
              "profilePictureUrl": "",
              "userId": 1835922
            }
          }
        ],
        "recordsTotal": 3,
        "recordsFiltered": 3
      }
    }})
    @ApiResponse({ status: 400, description: 'Bad Request', example: {
        "success": false,
        "alert": {
            "code": 400,
            "message": "Bad Request"
        },
        "data": {}
      }})
    async getPostHighlightBySpaceId(@Param('spaceId') spaceId: number): Promise<GlobalResponse<DatatablePost>> {
        const data = await this.adminSpaceService.getPostHighlightBySpaceId(spaceId);
        return {
            message: 'Success',
            data: data,
        }
    }

    // create space
    @Post('create')
    @ApiOperation({ summary: 'Create space' })
    @ApiResponse({ status: 200, description: 'Success', example: {
      "success": true,
      "alert": {
        "code": 201,
        "message": "Success"
      },
      "data": {
        "id": 16,
        "name": "Sample Space",
        "image": "https://yes.sgp1.digitaloceanspaces.com/images/1745898969793-9eaddcd6-39c8-414a-84a9-2ae54dfb8ae7-xforce.png",
        "membersCount": 0,
        "postsCount": 0,
        "created_at": "2025-06-10T13:41:13.000Z"
      }
    }})
    @ApiResponse({ status: 400, description: 'Bad Request', example: {
        "success": false,
        "alert": { 
            "code": 400,
            "message": "Bad Request"
        },
        "data": {}
      }})
    async createSpace(@Body() dto: AdminSpaceCreateDto): Promise<GlobalResponse<DataSpace>> {
        const data = await this.adminSpaceService.createSpace(dto);
        return {
            message: 'Success',
            data: data,
        }
    }

    // get all post highlight
    @Get('post-highlight')
    @ApiOperation({ summary: 'Get all post highlight' })
    @ApiResponse({ status: 200, description: 'Success', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success"
      },
      "data": {
        "items": [
          {
            "id": 21,
            "backup_member_id": 11830,
            "backup_space_id": 7,
            "title": "A Day at IIMS 2025 with Mitsubishi Motors",
            "description": "*Ngungsi ke Pameran* ?\nYuppss..\nJudulnya emang ngungsi, soalnya rumah kita sedang di renov.\nRenov garasi biar lebih gedean. Siapa tau kan yaa abis pameran, kita bisa boyong Dakar Ultimate 4x2 ?\nHari ini ...",
            "image": "https://tribe-s3-production.imgix.net/Ti03qd5f6dLuPOoL7gLOs?auto=compress,format",
            "status": "PUBLISHED",
            "type": "image",
            "reactionsCount": 7,
            "created_at": "2025-02-22T14:36:08.000Z",
            "updated_at": "2025-06-03T05:21:19.000Z",
            "published_at": "2025-02-22T14:36:08.000Z",
            "deleted_at": "",
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!"
            },
            "author": {
              "id": 11830,
              "name": "ARIF PURNOMO",
              "email": "arifpurnomo.pbm@gmail.com",
              "profilePictureUrl": "https://tribe-s3-production.imgix.net/GHVLKgsiLy4Gx7NVzKOSs?auto=compress,format",
              "userId": 1970317
            }
          },
          {
            "id": 33,
            "backup_member_id": 12423,
            "backup_space_id": 7,
            "title": "Morning Ride",
            "description": "Selamat Pagi warga MiMate_ID dari bumi Serambi Mekkah ??",
            "image": "https://tribe-s3-production.imgix.net/0RzT24fxOxqVvXDkkvwbZ?auto=compress,format",
            "status": "PUBLISHED",
            "type": "image",
            "reactionsCount": 7,
            "created_at": "2025-02-22T00:18:43.000Z",
            "updated_at": "2025-06-03T05:21:19.000Z",
            "published_at": "2025-02-22T00:18:43.000Z",
            "deleted_at": "",
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!"
            },
            "author": {
              "id": 12423,
              "name": "Heryanto",
              "email": "heryanto.ery@gmail.com",
              "profilePictureUrl": "https://tribe-s3-production.imgix.net/lPw3hCPkOxicJNJYfPjBl?auto=compress,format",
              "userId": 1971435
            }
          },
          {
            "id": 86,
            "backup_member_id": 25827,
            "backup_space_id": 7,
            "title": "Service 6 bulan",
            "description": "Alhamdulillah baru selesai service rutin 6 bulan di Sun Star Motor Cibinong.\nService OK, ruang tunggu nyaman, dan kopinya enak ?",
            "image": "https://tribe-s3-production.imgix.net/v8kZmW5ce815Qj27jeQfj?auto=compress,format",
            "status": "PUBLISHED",
            "type": "image",
            "reactionsCount": 6,
            "created_at": "2025-02-15T04:12:36.000Z",
            "updated_at": "2025-06-03T05:21:19.000Z",
            "published_at": "2025-02-15T04:12:36.000Z",
            "deleted_at": "",
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!"
            },
            "author": {
              "id": 25827,
              "name": "Lukmanul Hakim",
              "email": "hakim8luqmanul@gmail.com",
              "profilePictureUrl": "",
              "userId": 1835922
            }
          }
        ],
        "recordsTotal": 3,
        "recordsFiltered": 3
      }
    }})
    @ApiResponse({ status: 400, description: 'Bad Request', example: {
        "success": false,
        "alert": {  
            "code": 400,
            "message": "Bad Request"
        },
        "data": {}
      }})
    async getAllPostHighlight(): Promise<GlobalResponse<DatatablePost>> {
        const data = await this.adminSpaceService.getPostHighlightBySpaceId();
        return {
            message: 'Success',
            data: data,
        }
    }

    // export post by space id
    @Get('post-export/:spaceId')
    @ApiOperation({ summary: 'Export post by space id' })
    @ApiResponse({ status: 200, description: 'Success', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success"
      },
      "data": {
        "buffer": "base64",
        "filename": "post.xlsx"
      }
    }})
    @ApiResponse({ status: 400, description: 'Bad Request', example: {
        "success": false,
        "alert": {
            "code": 400,
            "message": "Bad Request"
        },
        "data": {}
      }}) 
      async export(@Query() adminPostListDto: AdminPostExportDto, @Res() res: Response, @Param('spaceId') spaceId: number): Promise<void> {
        const { buffer, filename } = await this.adminPostService.export(adminPostListDto, spaceId);
        
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': buffer.length,
        });
        
        res.end(buffer);
    }

    // view space by id
    @Get('view/:id')
    @ApiOperation({ summary: 'View space by id' })
    @ApiResponse({ status: 200, description: 'Success', type: AdminSpaceViewDto })
    @ApiResponse({ status: 404, description: 'Not Found', schema: { example: { success: false, alert: { code: 404, message: 'Not Found' }, data: {} } } })
    async viewSpace(@Param('id') id: number): Promise<GlobalResponse<AdminSpaceViewDto>> {
        const data = await this.adminSpaceService.viewSpace(id);
        return {
            message: 'Success',
            data: data,
        };
    }

    // update space
    @Post('update')
    @ApiOperation({ summary: 'Update space' })
    @ApiResponse({ status: 200, description: 'Success', type: AdminSpaceViewDto })
    @ApiResponse({ status: 400, description: 'Bad Request', schema: { example: { success: false, alert: { code: 400, message: 'Bad Request' }, data: {} } } })
    async updateSpace(@Body() dto: AdminSpaceUpdateDto): Promise<GlobalResponse<AdminSpaceViewDto>> {
        const data = await this.adminSpaceService.updateSpace(dto);
        return {
            message: 'Success',
            data: data,
        };
    }

    // delete space
    @Delete('delete')
    @ApiOperation({ summary: 'Delete space' })
    @ApiResponse({ status: 200, description: 'Success', schema: { example: { success: true, alert: { code: 200, message: 'Deleted' }, data: { deleted: true } } } })
    @ApiResponse({ status: 400, description: 'Bad Request', schema: { example: { success: false, alert: { code: 400, message: 'Bad Request' }, data: {} } } })
    async deleteSpace(@Body() dto: AdminSpaceDeleteDto): Promise<GlobalResponse<{ deleted: boolean }>> {
        const data = await this.adminSpaceService.deleteSpace(dto);
        return {
            message: data.deleted ? 'Deleted' : 'Not Found',
            data: data,
        };
    }

}
