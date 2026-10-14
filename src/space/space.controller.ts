import { Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PostService } from 'src/post/post.service';
import { SpaceService } from './space.service';
import { GlobalResponse } from 'src/interfaces/global.interface';
import { Space } from './interfaces/space.interface';
import { DetailSpaceDto } from './dto/detail-space.dto';
import {  PostCollectionResponse, Post as PostInterface } from 'src/post/interfaces/post.interface';
import { GetPostsDto } from 'src/post/dtos/get-posts.dto';
import { DefaultSpaceDto } from './dto/default-space.dto';
@Controller('space')
@ApiTags('SPACE')
@ApiBearerAuth('access-token')
export class SpaceController {
    constructor(
        private postService : PostService,
        private spaceService: SpaceService
    ){}


    // space followed
    @Get('followed')
    @ApiOperation({summary: 'Space Followed'})
    @ApiResponse({status: 200, description: "Success result", example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success get data"
      },
      "data": [
        {
          "id": 7,
          "name": "Warga MiMate",
          "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
          "image": "https://yes.sgp1.digitaloceanspaces.com/images/1745898503259-5f650392-5db5-4729-a0d6-75636c6e8449-icon%20warga.png",
          "banner": "https://yes.sgp1.digitaloceanspaces.com/images/1745898452537-6c75d0f2-8a6d-4cf4-adc7-2efc8d2f3cf6-warga%20mimate.jpeg",
          "inviteOnly": 0,
          "membersCount": 90786,
          "membersCountFormatted": "90,8K",
          "hidden": 0,
          "postsCount": 18470,
          "backup_space_id": 15,
          "is_dealer": false
        },
        {
          "id": 15,
          "name": "Home",
          "description": "",
          "image": "s1ROwBqpScbuPf39pzA4N",
          "banner": "QUpTj8f4CqMbyN4Z2afTL",
          "inviteOnly": 0,
          "membersCount": 91084,
          "membersCountFormatted": "91,1K",
          "hidden": 1,
          "postsCount": 0,
          "backup_space_id": 0,
          "is_dealer": false
        }
      ]
    }})

    async spaceFollowed(@Query() param:DefaultSpaceDto, @Req() request):Promise<GlobalResponse<Space[]>> {
     
      let spaceId = 7
     
      // spaceId is optional
      const {id:spaceIdParam} = param

      if(spaceIdParam) {
        spaceId = spaceIdParam
      }

      const {id:memberId} = request.userData

      let response = await this.spaceService.spaceFollowed(memberId, spaceId)
      return {
        message: "Success get data",
        data: response
      }
    }
    
    // Spaces
    @Get('/home')
    @ApiOperation({ summary: 'Get Space In Homepage' })
    @ApiResponse({status: 200, description: "List of space successfully retrieved", example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success get data"
      },
      "data": [
        {
          "id": 4,
          "name": "Mitsubishi Xforce",
          "description": "",
          "image": "https://yes.sgp1.digitaloceanspaces.com/images/1745898969793-9eaddcd6-39c8-414a-84a9-2ae54dfb8ae7-xforce.png",
          "banner": "https://yes.sgp1.digitaloceanspaces.com/images/1745898452537-6c75d0f2-8a6d-4cf4-adc7-2efc8d2f3cf6-warga%20mimate.jpeg",
          "inviteOnly": 0,
          "membersCount": 80109,
          "hidden": 0,
          "postsCount": 0,
          "backup_space_id": 15,
          "following": false,
          "notification": false,
          "is_dealer": false
        },
        {
          "id": 5,
          "name": "Dealers Corner",
          "description": null,
          "image": "https://yes.sgp1.digitaloceanspaces.com/images/1745898969793-9eaddcd6-39c8-414a-84a9-2ae54dfb8ae7-xforce.png",
          "banner": "https://yes.sgp1.digitaloceanspaces.com/images/1745898452537-6c75d0f2-8a6d-4cf4-adc7-2efc8d2f3cf6-warga%20mimate.jpeg",
          "inviteOnly": 0,
          "membersCount": 50,
          "hidden": 0,
          "postsCount": 1074,
          "backup_space_id": 15,
          "following": false,
          "notification": false,
          "is_dealer": true
        },
        {
          "id": 7,
          "name": "Warga MiMate",
          "description": null,
          "image": "https://yes.sgp1.digitaloceanspaces.com/images/1745898503259-5f650392-5db5-4729-a0d6-75636c6e8449-icon%20warga.png",
          "banner": "https://yes.sgp1.digitaloceanspaces.com/images/1745898452537-6c75d0f2-8a6d-4cf4-adc7-2efc8d2f3cf6-warga%20mimate.jpeg",
          "inviteOnly": 0,
          "membersCount": 91051,
          "hidden": 0,
          "postsCount": 18622,
          "backup_space_id": 15,
          "following": true,
          "notification": false,
          "is_dealer": false
        }
      ]
    }})
    @ApiResponse({ status: 404, description: 'Sample error message', example : {
      "success": false,
      "alert": {
        "code": 404,
        "message": "Not Found"
      },
      "data": null
    }})

    async getSpaceHome(@Req() request):Promise<GlobalResponse<Space[]>> {
        
      const {id:userId} = request.userData
      let response = await this.spaceService.getHomeSpaces(userId)
      return {
          message: "Success get data",
          data: response
      }
    }

    // Space Detail
    @Get(':id')
    @ApiOperation({summary: 'Detail Space'})
    @ApiResponse({status: 200, description: "Success result", example: {
        "success": true,
        alert : {
          "code" : 200,
          "message": "Success create data",
        },
        "data": {
          "id": 2,
          "name": "Ngobrol Santai",
          "description": null,
          "image": "https://yes.sgp1.digitaloceanspaces.com/images/1745898969793-9eaddcd6-39c8-414a-84a9-2ae54dfb8ae7-xforce.png",
          "banner": "https://yes.sgp1.digitaloceanspaces.com/images/1745898452537-6c75d0f2-8a6d-4cf4-adc7-2efc8d2f3cf6-warga%20mimate.jpeg",
          "inviteOnly": 0,
          "membersCount": 32627,
          "hidden": 0,
          "postsCount": 79,
          "backup_space_id": 4,
          "parent": {
            "id": 4,
            "name": "Mitsubishi Xforce",
            "description": "",
            "image": "PjVKcGHYYnZKq3dRYD9AK",
            "banner": "42kkiwMfHbKqfipIz0mB8",
            "inviteOnly": 0,
            "membersCount": 80109,
            "hidden": 0,
            "postsCount": 0,
            "backup_space_id": 15,
            "is_dealer": false
          },
          "group": [
            {
              "id": 1,
              "name": "Cerita Xforce",
              "description": null,
              "image": "https://yes.sgp1.digitaloceanspaces.com/images/1745898969793-9eaddcd6-39c8-414a-84a9-2ae54dfb8ae7-xforce.png",
              "banner": "https://yes.sgp1.digitaloceanspaces.com/images/1745898452537-6c75d0f2-8a6d-4cf4-adc7-2efc8d2f3cf6-warga%20mimate.jpeg",
              "inviteOnly": 0,
              "membersCount": 32642,
              "hidden": 0,
              "postsCount": 293,
              "backup_space_id": 4,
              "is_dealer": false
            },
            {
              "id": 2,
              "name": "Ngobrol Santai",
              "description": null,
              "image": "https://yes.sgp1.digitaloceanspaces.com/images/1745898969793-9eaddcd6-39c8-414a-84a9-2ae54dfb8ae7-xforce.png",
              "banner": "https://yes.sgp1.digitaloceanspaces.com/images/1745898452537-6c75d0f2-8a6d-4cf4-adc7-2efc8d2f3cf6-warga%20mimate.jpeg",
              "inviteOnly": 0,
              "membersCount": 32627,
              "hidden": 0,
              "postsCount": 79,
              "backup_space_id": 4,
              "is_dealer": false
            },
            {
              "id": 3,
              "name": "Berita Xforce",
              "description": "Uncover the latest in community support news and discoveries",
              "image": "https://yes.sgp1.digitaloceanspaces.com/images/1745898969793-9eaddcd6-39c8-414a-84a9-2ae54dfb8ae7-xforce.png",
              "banner": "https://yes.sgp1.digitaloceanspaces.com/images/1745898452537-6c75d0f2-8a6d-4cf4-adc7-2efc8d2f3cf6-warga%20mimate.jpeg",
              "inviteOnly": 0,
              "membersCount": 32626,
              "hidden": 0,
              "postsCount": 6,
              "backup_space_id": 4,
              "is_dealer": false
            },
            {
              "id": 6,
              "name": "Podcast",
              "description": "A podcast featuring conversations with leading experts",
              "image": "https://yes.sgp1.digitaloceanspaces.com/images/1745898969793-9eaddcd6-39c8-414a-84a9-2ae54dfb8ae7-xforce.png",
              "banner": "https://yes.sgp1.digitaloceanspaces.com/images/1745898452537-6c75d0f2-8a6d-4cf4-adc7-2efc8d2f3cf6-warga%20mimate.jpeg",
              "inviteOnly": 0,
              "membersCount": 32630,
              "hidden": 0,
              "postsCount": 5,
              "backup_space_id": 4,
              "is_dealer": false
            },
            {
              "id": 8,
              "name": "Events",
              "description": null,
              "image": "https://yes.sgp1.digitaloceanspaces.com/images/1745898969793-9eaddcd6-39c8-414a-84a9-2ae54dfb8ae7-xforce.png",
              "banner": "https://yes.sgp1.digitaloceanspaces.com/images/1745898452537-6c75d0f2-8a6d-4cf4-adc7-2efc8d2f3cf6-warga%20mimate.jpeg",
              "inviteOnly": 0,
              "membersCount": 32624,
              "hidden": 0,
              "postsCount": 22,
              "backup_space_id": 4,
              "is_dealer": false
            }
          ],
          "child": [],
          "following": true,
          "notification": true,
          "is_dealer": false
        }
      }})
    @ApiResponse({ status: 404, description: 'Sample error message', example : {
      "success": false,
      "alert": {
        "code": 404,
        "message": "Not Found"
      },
      "data": null
    }})
    async detailSpace(@Param() param:DetailSpaceDto, @Req() request):Promise<GlobalResponse<Space>>{
        const {id:spaceId} = param
        const {id:userId} = request.userData

        let response = await this.spaceService.detailSpace(spaceId, userId)
        return {
            message: "Success get data",
            data:response
        }
    }

    // Space Post
    @Get('/post/:id')
    @ApiOperation({summary: 'Posts Collection in Space'})
    @ApiResponse({status: 200, description: "Success result", example: {
  "success": true,
  "alert": {
    "code": 200,
    "message": "Success get data"
  },
  "data": {
    "totalData": 215,
    "hasNext": true,
    "page": 1,
    "limit": 15,
    "offset": 0,
    "after": "3a796300-12cf-11f1-935d-1f69722c8042",
    "data": [
      {
        "id": 23255,
        "title": "test",
        "description": "tedfff",
        "textContent": "tedfff",
        "image": "https://mimate-api.mymitsubishiapps.com/upload/files/IdRJx7xlIg6wcepskB2yh",
        "reaction": [
          {
            "reaction": "+1",
            "count": 3,
            "reacted": false
          },
          {
            "reaction": "heart",
            "count": 2,
            "reacted": false
          },
          {
            "reaction": "smile",
            "count": 1,
            "reacted": false
          }
        ],
        "tags": [],
        "repliesCount": 1,
        "reactionCount": 6,
        "member": {
          "id": 136208,
          "name": "Test V Mimate",
          "email": "mmid.qatesting22@tcid.co.id",
          "profilePictureUrl": "",
          "is_dealer": false
        },
        "space": {
          "id": 4,
          "name": "Mitsubishi Xforce",
          "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
          "postsCount": 297,
          "membersCount": 79858
        },
        "medias": [],
        "mmidUserId": 1605389,
        "totalRepliesCount": 1,
        "created_at": "2025-12-06 00:37:47",
        "published_at": "2025-12-05 16:43:40",
        "published_at_title": "6 December 2025",
        "type": "image",
        "post_type": "post",
        "vote_start": "",
        "vote_end": "",
        "total_vote": "",
        "is_post_owner": false,
        "votes": [],
        "my_vote_id": 0,
        "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=23255"
      },
      {
        "id": 22940,
        "title": "be a nice car",
        "description": "#destinator",
        "textContent": "#destinator",
        "image": "https://mimate-api.mymitsubishiapps.com/upload/files/617e0e2a-1951-4619-8157-689a336c85bb",
        "reaction": [
          {
            "reaction": "smile",
            "count": 1,
            "reacted": false
          },
          {
            "reaction": "+1",
            "count": 3,
            "reacted": true
          }
        ],
        "tags": [
          {
            "slug": "destinator",
            "id": 2908,
            "title": "#destinator"
          }
        ],
        "repliesCount": 1,
        "reactionCount": 4,
        "member": {
          "id": 30550,
          "name": "Rizki Harianto",
          "email": "rizkiharianto89@gmail.com",
          "profilePictureUrl": "",
          "is_dealer": false
        },
        "space": {
          "id": 4,
          "name": "Mitsubishi Xforce",
          "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
          "postsCount": 297,
          "membersCount": 79858
        },
        "medias": [
          {
            "id": 29416,
            "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1754547940671-9f0d44cc-1ee2-4fc9-85fa-9f1dfd71a422-1754547921369_image_picker_7B48E82E-A8E7-4079-924C-80525E25B91E-63509-0000167AC6602953.jpg.jpg",
            "type": "Image",
            "thumbnail": {
              "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1754547940671-9f0d44cc-1ee2-4fc9-85fa-9f1dfd71a422-1754547921369_image_picker_7B48E82E-A8E7-4079-924C-80525E25B91E-63509-0000167AC6602953.jpg.jpg",
              "width": 1080,
              "height": 1920,
              "type": "Image"
            }
          }
        ],
        "mmidUserId": 1842490,
        "totalRepliesCount": 1,
        "created_at": "2025-08-07 14:25:40",
        "published_at": "2025-08-08 12:29:02",
        "published_at_title": "7 August 2025",
        "type": "image",
        "post_type": "post",
        "vote_start": "",
        "vote_end": "",
        "total_vote": "",
        "is_post_owner": false,
        "votes": [],
        "my_vote_id": 0,
        "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=22940"
      },
      {
        "id": 22350,
        "title": "#Mitsubishi Connect #",
        "description": "Sudah memiliki Mitsubishi XForce,tertarik untuk switch ke Mitsubishi Destinator, dengan fitur Diamond sensor dan SoS.",
        "textContent": "Sudah memiliki Mitsubishi XForce,tertarik untuk switch ke Mitsubishi Destinator, dengan fitur Diamond sensor dan SoS.",
        "image": "https://mimate-api.mymitsubishiapps.com/upload/files/3af82911-c0df-4c8f-a33c-a87cf99c3706",
        "reaction": [
          {
            "reaction": "smile",
            "count": 1,
            "reacted": true
          },
          {
            "reaction": "+1",
            "count": 1,
            "reacted": false
          }
        ],
        "tags": [],
        "repliesCount": 1,
        "reactionCount": 2,
        "member": {
          "id": 22341,
          "name": "Johan",
          "email": "aminnose66@gmail.com",
          "profilePictureUrl": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1752761886228-da0d2736-6783-4204-b2e8-5d58278cbed3-23962b0c065531ef.jpg",
          "is_dealer": false
        },
        "space": {
          "id": 4,
          "name": "Mitsubishi Xforce",
          "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
          "postsCount": 297,
          "membersCount": 79858
        },
        "medias": [
          {
            "id": 28686,
            "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1753841750394-8b9d9cbf-679b-43af-a895-78f433be1dd3-1753841738718_1000026353.jpg.jpg",
            "type": "Image",
            "thumbnail": {
              "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1753841750394-8b9d9cbf-679b-43af-a895-78f433be1dd3-1753841738718_1000026353.jpg.jpg",
              "width": 1080,
              "height": 742,
              "type": "Image"
            }
          }
        ],
        "mmidUserId": 1908926,
        "totalRepliesCount": 1,
        "created_at": "2025-07-30 10:15:50",
        "published_at": "2025-08-06 01:35:44",
        "published_at_title": "30 July 2025",
        "type": "image",
        "post_type": "post",
        "vote_start": "",
        "vote_end": "",
        "total_vote": "",
        "is_post_owner": false,
        "votes": [],
        "my_vote_id": 0,
        "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=22350"
      },
      {
        "id": 21668,
        "title": "First Post",
        "description": "Xforce Ulti Ds,, we named it the X Car",
        "textContent": "Xforce Ulti Ds,, we named it the X Car",
        "image": "https://mimate-api.mymitsubishiapps.com/upload/files/5cfe7d26-223d-4cff-8d58-08fc7c699fee",
        "reaction": [
          {
            "reaction": "+1",
            "count": 7,
            "reacted": true
          },
          {
            "reaction": "heart",
            "count": 1,
            "reacted": false
          }
        ],
        "tags": [],
        "repliesCount": 2,
        "reactionCount": 8,
        "member": {
          "id": 348,
          "name": "Vida Hidayah",
          "email": "njb.alkatiri@gmail.com",
          "profilePictureUrl": "",
          "is_dealer": false
        },
        "space": {
          "id": 4,
          "name": "Mitsubishi Xforce",
          "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
          "postsCount": 297,
          "membersCount": 79858
        },
        "medias": [
          {
            "id": 27861,
            "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1753066417351-01441d21-e07c-4c17-800e-ded446a40e9d-1753066370520_7f506e20-e31f-4316-8452-c7f3e0730c10262687227065715076.jpg.jpg",
            "type": "Image",
            "thumbnail": {
              "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1753066417351-01441d21-e07c-4c17-800e-ded446a40e9d-1753066370520_7f506e20-e31f-4316-8452-c7f3e0730c10262687227065715076.jpg.jpg",
              "width": 1080,
              "height": 1920,
              "type": "Image"
            }
          }
        ],
        "mmidUserId": 2033612,
        "totalRepliesCount": 2,
        "created_at": "2025-07-21 10:53:37",
        "published_at": "2025-08-06 01:35:44",
        "published_at_title": "21 July 2025",
        "type": "image",
        "post_type": "post",
        "vote_start": "",
        "vote_end": "",
        "total_vote": "",
        "is_post_owner": false,
        "votes": [],
        "my_vote_id": 0,
        "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=21668"
      },
      {
        "id": 1850,
        "title": "MITSUBISHI MOTORS LARGE AUTO SHOW JOGJA CITY MALL 19-22 SEPTEMBER 2024",
        "description": "Hai Mitsubishi Family ? \nAyo segera kunjungi pameran kami \"Ayo ke GAS (Gebyar Auto Show)\" di Jogja City Mall pada:\nHari Jumat Sore Tgl 20 September 2024 dari pukul 16.00-22.00WIB dan\nHari Minggu Sore Tgl 22 September 2024 dari pukul 16.00-22.00WIB \nDan dapatkan informasi seputar kendaraan Mitsubishi terbaru dan program-program SPECIAL PROMO yang sangat menarik dan HANYA berlaku saat pameran ini berlangsung.",
        "textContent": "Hai Mitsubishi Family ? \nAyo segera kunjungi pameran kami \"Ayo ke GAS (Gebyar Auto Show)\" di Jogja City Mall pada:\nHari Jumat Sore Tgl 20 September 2024 dari pukul 16.00-22.00WIB dan\nHari Minggu Sore Tgl 22 September 2024 dari pukul 16.00-22.00WIB \nDan dapatkan informasi seputar kendaraan Mitsubishi terbaru dan program-program SPECIAL PROMO yang sangat menarik dan HANYA berlaku saat pameran ini berlangsung.",
        "image": "",
        "reaction": [],
        "tags": [
          {
            "slug": "pameranmitsubishiyogyakarta",
            "id": 1005,
            "title": "PameranMitsubishiYogyakarta"
          }
        ],
        "repliesCount": 0,
        "reactionCount": 0,
        "member": {
          "id": 86176,
          "name": "Mitsubishi Kolsug",
          "email": "email62df6da636a49@mmidn.co.jp",
          "profilePictureUrl": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1752761999245-6fbfa0a8-6d15-4ada-9401-e14a523370e1-b4959556d4bfb67d.jpg",
          "is_dealer": false
        },
        "space": {
          "id": 4,
          "name": "Mitsubishi Xforce",
          "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
          "postsCount": 297,
          "membersCount": 79858
        },
        "medias": [],
        "mmidUserId": 642469,
        "totalRepliesCount": 0,
        "created_at": "2024-09-19 11:52:26",
        "published_at": "2025-08-06 01:35:39",
        "published_at_title": "19 September 2024",
        "type": "image",
        "post_type": "post",
        "vote_start": "",
        "vote_end": "",
        "total_vote": "",
        "is_post_owner": false,
        "votes": [],
        "my_vote_id": 0,
        "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=1850"
      },
      {
        "id": 1885,
        "title": "One year driving the Xpander Cross",
        "description": "Our one year experience with the Mitsubishi Xpander Cross is amazing as it brings us to our destinations with comfort and with safety. There had been no mechanical concern with this car and it drives amazingly well. Apart from that, it is a cool vehicle.",
        "textContent": "Our one year experience with the Mitsubishi Xpander Cross is amazing as it brings us to our destinations with comfort and with safety. There had been no mechanical concern with this car and it drives amazingly well. Apart from that, it is a cool vehicle.",
        "image": "",
        "reaction": [
          {
            "reaction": "+1",
            "count": 1,
            "reacted": true
          }
        ],
        "tags": [
          {
            "slug": "mitsubishimotors",
            "id": 1,
            "title": "#mitsubishimotors"
          }
        ],
        "repliesCount": 0,
        "reactionCount": 1,
        "member": {
          "id": 64777,
          "name": "Patrick Lorenzo Carbonell",
          "email": "patrickcarbonell@gmail.com",
          "profilePictureUrl": "",
          "is_dealer": false
        },
        "space": {
          "id": 4,
          "name": "Mitsubishi Xforce",
          "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
          "postsCount": 297,
          "membersCount": 79858
        },
        "medias": [],
        "mmidUserId": 1240835,
        "totalRepliesCount": 0,
        "created_at": "2024-09-14 19:20:55",
        "published_at": "2025-08-06 01:35:39",
        "published_at_title": "14 September 2024",
        "type": "image",
        "post_type": "post",
        "vote_start": "",
        "vote_end": "",
        "total_vote": "",
        "is_post_owner": false,
        "votes": [],
        "my_vote_id": 0,
        "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=1885"
      },
      {
        "id": 1909,
        "title": "Yeayy Service 1000 Km! ?",
        "description": "Alhamdulillah gak sabar service ke dealer, kira2 daerah jakpus dealer mitsu mana ya yang OK",
        "textContent": "Alhamdulillah gak sabar service ke dealer, kira2 daerah jakpus dealer mitsu mana ya yang OK",
        "image": "",
        "reaction": [
          {
            "reaction": "+1",
            "count": 2,
            "reacted": true
          }
        ],
        "tags": [],
        "repliesCount": 0,
        "reactionCount": 2,
        "member": {
          "id": 90817,
          "name": "Binsky",
          "email": "promosindo.abi@gmail.com",
          "profilePictureUrl": "https://mitsubishimotorsid-mobileapp.com/storage/users/2025/XzEN5HEM4LsE3NC2uKoVySMeJc5WyN95OhMFJnmd.jpeg",
          "is_dealer": false
        },
        "space": {
          "id": 4,
          "name": "Mitsubishi Xforce",
          "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
          "postsCount": 297,
          "membersCount": 79858
        },
        "medias": [],
        "mmidUserId": 64993,
        "totalRepliesCount": 0,
        "created_at": "2024-09-11 16:52:21",
        "published_at": "2025-08-06 01:35:39",
        "published_at_title": "11 September 2024",
        "type": "image",
        "post_type": "post",
        "vote_start": "",
        "vote_end": "",
        "total_vote": "",
        "is_post_owner": false,
        "votes": [],
        "my_vote_id": 0,
        "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=1909"
      },
      {
        "id": 1929,
        "title": "Serah terima kendaraan",
        "description": "Terimakasih atas pelayanan terbaiknya",
        "textContent": "Terimakasih atas pelayanan terbaiknya",
        "image": "",
        "reaction": [
          {
            "reaction": "+1",
            "count": 1,
            "reacted": true
          }
        ],
        "tags": [],
        "repliesCount": 0,
        "reactionCount": 1,
        "member": {
          "id": 84542,
          "name": "Pt Csm Corporatama",
          "email": "lutfi.indorent@gmail.com",
          "profilePictureUrl": "",
          "is_dealer": false
        },
        "space": {
          "id": 4,
          "name": "Mitsubishi Xforce",
          "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
          "postsCount": 297,
          "membersCount": 79858
        },
        "medias": [],
        "mmidUserId": 174406,
        "totalRepliesCount": 0,
        "created_at": "2024-09-09 12:03:39",
        "published_at": "2025-08-06 01:35:39",
        "published_at_title": "9 September 2024",
        "type": "image",
        "post_type": "post",
        "vote_start": "",
        "vote_end": "",
        "total_vote": "",
        "is_post_owner": false,
        "votes": [],
        "my_vote_id": 0,
        "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=1929"
      },
      {
        "id": 1980,
        "title": "Closing Unit ke 2 di mitshubisi",
        "description": "Pengambilan unit ke 2 expander GLS",
        "textContent": "Pengambilan unit ke 2 expander GLS",
        "image": "",
        "reaction": [
          {
            "reaction": "+1",
            "count": 1,
            "reacted": true
          }
        ],
        "tags": [],
        "repliesCount": 0,
        "reactionCount": 1,
        "member": {
          "id": 68792,
          "name": "Rama Bertahan",
          "email": "ramabomber88@gmail.com",
          "profilePictureUrl": "",
          "is_dealer": false
        },
        "space": {
          "id": 4,
          "name": "Mitsubishi Xforce",
          "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
          "postsCount": 297,
          "membersCount": 79858
        },
        "medias": [],
        "mmidUserId": 1173826,
        "totalRepliesCount": 0,
        "created_at": "2024-08-31 20:42:45",
        "published_at": "2025-08-06 01:35:39",
        "published_at_title": "31 August 2024",
        "type": "image",
        "post_type": "post",
        "vote_start": "",
        "vote_end": "",
        "total_vote": "",
        "is_post_owner": false,
        "votes": [],
        "my_vote_id": 0,
        "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=1980"
      },
      {
        "id": 1982,
        "title": "#MitsubishiPastiSardana",
        "description": "",
        "textContent": "",
        "image": "",
        "reaction": [
          {
            "reaction": "+1",
            "count": 1,
            "reacted": true
          }
        ],
        "tags": [],
        "repliesCount": 0,
        "reactionCount": 1,
        "member": {
          "id": 88552,
          "name": "Reston Sirait",
          "email": "email6245bc5d4fa26@mmidn.co.jp",
          "profilePictureUrl": "",
          "is_dealer": false
        },
        "space": {
          "id": 4,
          "name": "Mitsubishi Xforce",
          "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
          "postsCount": 297,
          "membersCount": 79858
        },
        "medias": [],
        "mmidUserId": 538772,
        "totalRepliesCount": 0,
        "created_at": "2024-08-31 15:41:31",
        "published_at": "2025-08-06 01:35:39",
        "published_at_title": "31 August 2024",
        "type": "image",
        "post_type": "post",
        "vote_start": "",
        "vote_end": "",
        "total_vote": "",
        "is_post_owner": false,
        "votes": [],
        "my_vote_id": 0,
        "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=1982"
      },
      {
        "id": 2004,
        "title": "Yuni Zakinah Yulianto",
        "description": "Sales yg cekatan dan sangat ramah dalam pelayanan dan bantuan nya. Terima kasih MMPU MAKASSAR, semoga semakin jaya selalu.. Aamin",
        "textContent": "Sales yg cekatan dan sangat ramah dalam pelayanan dan bantuan nya. Terima kasih MMPU MAKASSAR, semoga semakin jaya selalu.. Aamin",
        "image": "",
        "reaction": [
          {
            "reaction": "+1",
            "count": 1,
            "reacted": true
          }
        ],
        "tags": [
          {
            "slug": "mitsubishimotors",
            "id": 1,
            "title": "#mitsubishimotors"
          },
          {
            "slug": "introduction",
            "id": 2,
            "title": "Introduction"
          },
          {
            "slug": "temansejalan",
            "id": 3,
            "title": "#temansejalan"
          },
          {
            "slug": "engineering",
            "id": 4,
            "title": "Engineering"
          },
          {
            "slug": "product-design",
            "id": 5,
            "title": "Product & Design"
          }
        ],
        "repliesCount": 0,
        "reactionCount": 1,
        "member": {
          "id": 61489,
          "name": "Elly",
          "email": "agusyalimsetiawan1997@gmail.com",
          "profilePictureUrl": "",
          "is_dealer": false
        },
        "space": {
          "id": 4,
          "name": "Mitsubishi Xforce",
          "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
          "postsCount": 297,
          "membersCount": 79858
        },
        "medias": [],
        "mmidUserId": 1831297,
        "totalRepliesCount": 0,
        "created_at": "2024-08-29 14:14:17",
        "published_at": "2025-08-06 01:35:39",
        "published_at_title": "29 August 2024",
        "type": "image",
        "post_type": "post",
        "vote_start": "",
        "vote_end": "",
        "total_vote": "",
        "is_post_owner": false,
        "votes": [],
        "my_vote_id": 0,
        "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=2004"
      },
      {
        "id": 2059,
        "title": "Macet",
        "description": "Kemacetan yang menyenangkan. Hujan gerimis pandangan tetap clear.",
        "textContent": "Kemacetan yang menyenangkan. Hujan gerimis pandangan tetap clear.",
        "image": "",
        "reaction": [
          {
            "reaction": "+1",
            "count": 1,
            "reacted": true
          }
        ],
        "tags": [],
        "repliesCount": 0,
        "reactionCount": 1,
        "member": {
          "id": 90823,
          "name": "Hengky Irawan Se",
          "email": "hengkyirawanse@gmail.com",
          "profilePictureUrl": "https://mitsubishimotorsid-mobileapp.com/storage/users/L2zY7hXjUuF4k4WvWrQmhZqdUBojrbjHMDcRAm2F.jpeg",
          "is_dealer": false
        },
        "space": {
          "id": 4,
          "name": "Mitsubishi Xforce",
          "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
          "postsCount": 297,
          "membersCount": 79858
        },
        "medias": [],
        "mmidUserId": 58977,
        "totalRepliesCount": 0,
        "created_at": "2024-08-20 11:15:17",
        "published_at": "2025-08-06 01:35:39",
        "published_at_title": "20 August 2024",
        "type": "image",
        "post_type": "post",
        "vote_start": "",
        "vote_end": "",
        "total_vote": "",
        "is_post_owner": false,
        "votes": [],
        "my_vote_id": 0,
        "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=2059"
      },
      {
        "id": 2060,
        "title": "Kemerdekaan diisi dengan kaca film baru l, pandangan merdeka",
        "description": "Memerdekakan pandangan dalam mengemudi.",
        "textContent": "Memerdekakan pandangan dalam mengemudi.",
        "image": "",
        "reaction": [
          {
            "reaction": "+1",
            "count": 1,
            "reacted": true
          }
        ],
        "tags": [],
        "repliesCount": 0,
        "reactionCount": 1,
        "member": {
          "id": 90823,
          "name": "Hengky Irawan Se",
          "email": "hengkyirawanse@gmail.com",
          "profilePictureUrl": "https://mitsubishimotorsid-mobileapp.com/storage/users/L2zY7hXjUuF4k4WvWrQmhZqdUBojrbjHMDcRAm2F.jpeg",
          "is_dealer": false
        },
        "space": {
          "id": 4,
          "name": "Mitsubishi Xforce",
          "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
          "postsCount": 297,
          "membersCount": 79858
        },
        "medias": [],
        "mmidUserId": 58977,
        "totalRepliesCount": 0,
        "created_at": "2024-08-20 11:13:28",
        "published_at": "2025-08-06 01:35:39",
        "published_at_title": "20 August 2024",
        "type": "image",
        "post_type": "post",
        "vote_start": "",
        "vote_end": "",
        "total_vote": "",
        "is_post_owner": false,
        "votes": [],
        "my_vote_id": 0,
        "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=2060"
      },
      {
        "id": 2109,
        "title": "Thankyou Mitsubishi",
        "description": "Hadiah dari acara GIIAS kemarin mendarat dengan selamat, thankyou Mitsubishi ???",
        "textContent": "Hadiah dari acara GIIAS kemarin mendarat dengan selamat, thankyou Mitsubishi ???",
        "image": "",
        "reaction": [
          {
            "reaction": "+1",
            "count": 1,
            "reacted": true
          }
        ],
        "tags": [
          {
            "slug": "mitsubishimotors",
            "id": 1,
            "title": "#mitsubishimotors"
          },
          {
            "slug": "temansejalan",
            "id": 3,
            "title": "#temansejalan"
          }
        ],
        "repliesCount": 0,
        "reactionCount": 1,
        "member": {
          "id": 85677,
          "name": "Yosef Riyanto",
          "email": "email62fc8c390dc29@mmidn.co.jp",
          "profilePictureUrl": "",
          "is_dealer": false
        },
        "space": {
          "id": 4,
          "name": "Mitsubishi Xforce",
          "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
          "postsCount": 297,
          "membersCount": 79858
        },
        "medias": [],
        "mmidUserId": 683531,
        "totalRepliesCount": 0,
        "created_at": "2024-08-09 23:34:47",
        "published_at": "2025-08-06 01:35:39",
        "published_at_title": "9 August 2024",
        "type": "image",
        "post_type": "post",
        "vote_start": "",
        "vote_end": "",
        "total_vote": "",
        "is_post_owner": false,
        "votes": [],
        "my_vote_id": 0,
        "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=2109"
      },
      {
        "id": 2119,
        "title": "PENYERAHAN KENDARAAN TERPADU ( PKT )",
        "description": "TERIMA KASIH MMPU MAKASSAR",
        "textContent": "TERIMA KASIH MMPU MAKASSAR",
        "image": "https://mimate-api.mymitsubishiapps.com/upload/files/8KSLlZvIbf3pyKOn7U7FV",
        "reaction": [
          {
            "reaction": "+1",
            "count": 1,
            "reacted": true
          }
        ],
        "tags": [],
        "repliesCount": 0,
        "reactionCount": 1,
        "member": {
          "id": 61489,
          "name": "Elly",
          "email": "agusyalimsetiawan1997@gmail.com",
          "profilePictureUrl": "",
          "is_dealer": false
        },
        "space": {
          "id": 4,
          "name": "Mitsubishi Xforce",
          "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
          "postsCount": 297,
          "membersCount": 79858
        },
        "medias": [
          {
            "id": 2756,
            "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1750665760491-97760f69-095f-436e-be21-e9ddf4cc304b-8KSLlZvIbf3pyKOn7U7FV.jpg",
            "type": "Image",
            "thumbnail": {
              "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1750665760491-97760f69-095f-436e-be21-e9ddf4cc304b-8KSLlZvIbf3pyKOn7U7FV.jpg",
              "width": 1280,
              "height": 960,
              "type": "Image"
            }
          }
        ],
        "mmidUserId": 1831297,
        "totalRepliesCount": 0,
        "created_at": "2024-08-07 15:34:21",
        "published_at": "2025-08-06 01:35:39",
        "published_at_title": "7 August 2024",
        "type": "image",
        "post_type": "post",
        "vote_start": "",
        "vote_end": "",
        "total_vote": "",
        "is_post_owner": false,
        "votes": [],
        "my_vote_id": 0,
        "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=2119"
      }
    ]
  }
}})
    @ApiResponse({ status: 404, description: 'Sample error message', example : {
      "success": false,
      "alert": {
        "code": 404,
        "message": "Not Found"
      },
      "data": null
    }})
    async getSpacePosts(@Param() space:DetailSpaceDto, @Query() param:GetPostsDto, @Req() request):Promise<GlobalResponse<PostCollectionResponse>> {

        const {id:spaceId} = space
        // check validation space
        await this.spaceService.isSpaceExist(spaceId);

        const { limit, after, order } = param;
        const {id:userId} = request.userData
        let response = await this.postService.collectPosts('space', limit, after, spaceId, order, userId)
        return {
            message: "Success get data",
            data: response
        }
    }


    // Space Follow
    @Post('follow/:id')
    @ApiOperation({summary: 'Follow Space'})
    @ApiResponse({status: 201, description: "Success result", example: {
        "success": true,
        alert : {
          "code" : 200,
          "message": "Success follow space",
        },
        "data" : {}
      }})
    @ApiResponse({ status: 404, description: 'Sample error message', example : {
      "success": false,
      "alert": {
        "code": 404,
        "message": "Not Found"
      },
      "data": null
    }})
    async followSpace(@Param() param:DetailSpaceDto, @Req() request):Promise<GlobalResponse<object>> {
      const {id:spaceId} = param
      const {id:memberId} = request.userData

      let response = await this.spaceService.follow(spaceId, memberId)
      return {
        message: response,
        data: {}
      }
    }


      // Space Follow
    @Post('unfollow/:id')
    @ApiOperation({summary: 'Unfollow Space'})
    @ApiResponse({status: 201, description: "Success result", example: {
        "success": true,
        alert : {
          "code" : 201,
          "message": "Success unfollow space",
        },
        "data" : {}
    }})
    @ApiResponse({ status: 404, description: 'Sample error message', example : {
      "success": false,
      "alert": {
        "code": 404,
        "message": "Not Found"
      },
      "data": null
    }})

    async unFollowSpace(@Param() param:DetailSpaceDto, @Req() request):Promise<GlobalResponse<object>> {
      const {id:spaceId} = param
      const {id:memberId} = request.userData

      let response = await this.spaceService.unfollow(spaceId, memberId)
      return {
        message: response,
        data: {}
      }
    }


    // space notification
    @Post('notif-on/:id')
    @ApiOperation({summary: 'Notification On Space'})
    @ApiResponse({status: 201, description: "Success result", example: {
        "success": true,
        alert : {
          "code" : 201,
          "message": "Success turn on notification space",
        },
       
        "data" : {}
    }})
    @ApiResponse({ status: 404, description: 'Sample error message', example : {
      "success": false,
      "alert": {
        "code": 404,
        "message": "Not Found"
      },
      "data": null
    }})

    async notifOn(@Param() param:DetailSpaceDto, @Req() request):Promise<GlobalResponse<object>> {
      const {id:spaceId} = param
      const {id:memberId} = request.userData

      let response = await this.spaceService.notification(spaceId, memberId, true)
      return {
        message: response,
        data: {}
      }
    }

    // space notification
    @Post('notif-off/:id')
    @ApiOperation({summary: 'Notification Off Space'})
    @ApiResponse({status: 201, description: "Success result", example: {
        "success": true,
        alert : {
          "code" : 201,
          "message": "Success turn on notification space",
        },
        
        "data" : {}
    }})
    @ApiResponse({ status: 404, description: 'Sample error message', example : {
      "success": false,
      "alert": {
        "code": 404,
        "message": "Not Found"
      },
      "data": null
    }})

    async notifOff(@Param() param:DetailSpaceDto, @Req() request):Promise<GlobalResponse<object>> {
      const {id:spaceId} = param
      const {id:memberId} = request.userData

     
      let response = await this.spaceService.notification(spaceId, memberId, false)
      return {
        message: response,
        data: {}
      }
    }


} 
