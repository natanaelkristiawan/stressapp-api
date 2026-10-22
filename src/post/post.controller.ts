import { CmsMembersGuard } from '../cms-members/cms-members.guard';
import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Query, Req, UseGuards, UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { GetPostHighlightDto, GetPostsDto } from './dtos/get-posts.dto';
import { PostService } from './post.service';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GlobalResponse } from 'src/interfaces/global.interface';
import { PostCollectionResponse, Post as PostInterface } from './interfaces/post.interface';
import { DetailPostDto } from './dtos/detail-post.dto';
import { CreatePostDto } from './dtos/create-post.dto';
import { VoteService } from './vote.service';
import { PostType } from 'src/entity/post.entity';
import { ActivityService } from 'src/activity/activity.service';
import { ProfileService } from 'src/profile/profile.service';
import { QueueService } from 'src/queue/queue.service';
import { MoengageService } from 'src/moengage/moengage.service';
import * as fs from 'fs';
@Controller('post')
@ApiTags('POST')
@ApiBearerAuth('access-token')
export class PostController {

  constructor(
    private postService: PostService,
    private voteService: VoteService,
    private activityService: ActivityService,
    private profileService: ProfileService,
    private queueService: QueueService,
    private moengageService: MoengageService
  ) { }

  // clean all post
  @Get('clean-all-post')
  async cleanAllPost(): Promise<GlobalResponse<Boolean>> {
    const data = await this.postService.cleanAllPost();
    return { message: 'Success', data: data };
  }



  // post followers
  @Get('following')
  @ApiOperation({ summary: 'Post Following' })
  @ApiResponse({
    status: 200, description: "Success result", example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success get data"
      },
      "data": {
        "totalData": 3,
        "hasNext": false,
        "page": 1,
        "limit": 15,
        "offset": 0,
        "after": "62cee7d0-3071-11f0-a436-a96fe6ebe9d1",
        "data": [
          {
            "id": 21,
            "title": "A Day at IIMS 2025 with Mitsubishi Motors",
            "description": "*Ngungsi ke Pameran* ?\nYuppss..\nJudulnya emang ngungsi, soalnya rumah kita sedang di renov.\nRenov garasi biar lebih gedean. Siapa tau kan yaa abis pameran, kita bisa boyong Dakar Ultimate 4x2 ?\nHari ini ...",
            "textContent": "*Ngungsi ke Pameran* ?\nYuppss..\nJudulnya emang ngungsi, soalnya rumah kita sedang di renov.\nRenov garasi biar lebih gedean. Siapa tau kan yaa abis pameran, kita bisa boyong Dakar Ultimate 4x2 ?\nHari ini 22 feb 2025, kita sekeluarga gass ke IIMS dari Depok to Kemayoran.\nMayan banget Jaraknya, plus Mayan banget Macetnya. Poll dah!\nUntung banget bawa Xpander Ultimate; Nyaman, Lega, Empuk lg ?\nSuasana macet bawaannya jd Nyantuy ?\nApalagi momentnya jd petcha banget waktu kita sekeluarga sampe di JIExpo. Secara ini pertama kita ke IIMS ? dan pertama jg main ke JIExpo nya ?.\nHari2 cuma lewat doang, ga pernah niat mampir ke JIExpo wkwkw\nBela2in ke JIExpo karena semangat pengen liat Xforce terbaru, Ultimate with Diamond Sense (DS), gacor emang!\nTapi Sumpah...\nwaktu pertama sampe kek semua booth mau kita samperin.\nTapi sorry sorry banget...\nBooth lain mah mungkin bisa kita ampirin.\nTapi, booth nya Mitsubishi...\nKUDU MUSTI pake HARUS jadi yang Pertama!\n*Soalnya kita bangga jadi bagian keluarga Mitsubishi Indonesia ?*\nNih guys sebongkah serpihan moment keseruan kita di IIMS 2025.\nSerpihan lainnya di Bongkahan moment selanjutnya yaa. Wkwk buanyak emang ?\nPokoknya Petcha dan Nagih!\nSee you di IIMS 2026 ya Mitsubishi.\nJaya selalu Mitsubishi ?\nDitunggu produk-produk barunya yaa\nSenggol DST Concept?\nColek Eclipse Cross ?\nCubit Xpander HEV ?\n#MiMateIIMS2025",
            "image": "https://tribe-s3-production.imgix.net/Ti03qd5f6dLuPOoL7gLOs?auto=compress,format",
            "reaction": [
              {
                "reaction": "+1",
                "count": 4,
                "reacted": false
              },
              {
                "reaction": "heart",
                "count": 2,
                "reacted": false
              },
              {
                "reaction": "tada",
                "count": 1,
                "reacted": false
              }
            ],
            "tags": [],
            "repliesCount": 2,
            "reactionCount": 7,
            "member": {
              "id": 11830,
              "name": "ARIF PURNOMO",
              "email": "arifpurnomo.pbm@gmail.com",
              "profilePictureUrl": "https://tribe-s3-production.imgix.net/GHVLKgsiLy4Gx7NVzKOSs?auto=compress,format",
              "is_dealer": false
            },
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
              "postsCount": 18622,
              "membersCount": 90786
            },
            "medias": [
              {
                "id": 32,
                "url": "https://tribe-s3-production.imgix.net/Ti03qd5f6dLuPOoL7gLOs?auto=compress,format",
                "type": "Image",
                "thumbnail": {
                  "url": "https://tribe-s3-production.imgix.net/Ti03qd5f6dLuPOoL7gLOs?auto=compress,format",
                  "width": 595,
                  "height": 860,
                  "type": ""
                }
              }
            ],
            "mmidUserId": 1970317,
            "totalRepliesCount": 2,
            "created_at": "2025-02-22 22:36:08",
            "published_at": "2025-02-22 22:36:08",
            "published_at_title": "22 February 2025",
            "type": "image",
            "is_post_owner": false
          },
          {
            "id": 33,
            "title": "Morning Ride",
            "description": "Selamat Pagi warga MiMate_ID dari bumi Serambi Mekkah ??",
            "textContent": "Selamat Pagi warga MiMate_ID dari bumi Serambi Mekkah ??",
            "image": "https://tribe-s3-production.imgix.net/0RzT24fxOxqVvXDkkvwbZ?auto=compress,format",
            "reaction": [
              {
                "reaction": "+1",
                "count": 4,
                "reacted": false
              },
              {
                "reaction": "heart",
                "count": 3,
                "reacted": false
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
              },
              {
                "slug": "xpcross-id",
                "id": 2211,
                "title": "xpcross.id"
              }
            ],
            "repliesCount": 3,
            "reactionCount": 7,
            "member": {
              "id": 12423,
              "name": "Heryanto",
              "email": "heryanto.ery@gmail.com",
              "profilePictureUrl": "https://tribe-s3-production.imgix.net/lPw3hCPkOxicJNJYfPjBl?auto=compress,format",
              "is_dealer": false
            },
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
              "postsCount": 18622,
              "membersCount": 90786
            },
            "medias": [
              {
                "id": 51,
                "url": "https://tribe-s3-production.imgix.net/0RzT24fxOxqVvXDkkvwbZ?auto=compress,format",
                "type": "Image",
                "thumbnail": {
                  "url": "https://tribe-s3-production.imgix.net/0RzT24fxOxqVvXDkkvwbZ?auto=compress,format",
                  "width": 4032,
                  "height": 3024,
                  "type": ""
                }
              },
              {
                "id": 52,
                "url": "https://tribe-s3-production.imgix.net/AYMdL9voHJWwq2fPjoVuQ?auto=compress,format",
                "type": "Image",
                "thumbnail": {
                  "url": "https://tribe-s3-production.imgix.net/AYMdL9voHJWwq2fPjoVuQ?auto=compress,format",
                  "width": 4032,
                  "height": 3024,
                  "type": ""
                }
              }
            ],
            "mmidUserId": 1971435,
            "totalRepliesCount": 4,
            "created_at": "2025-02-22 08:18:43",
            "published_at": "2025-02-22 08:18:43",
            "published_at_title": "22 February 2025",
            "type": "image",
            "is_post_owner": false
          },
          {
            "id": 86,
            "title": "Service 6 bulan",
            "description": "Alhamdulillah baru selesai service rutin 6 bulan di Sun Star Motor Cibinong.\nService OK, ruang tunggu nyaman, dan kopinya enak ?",
            "textContent": "Alhamdulillah baru selesai service rutin 6 bulan di Sun Star Motor Cibinong.\nService OK, ruang tunggu nyaman, dan kopinya enak ?",
            "image": "https://tribe-s3-production.imgix.net/v8kZmW5ce815Qj27jeQfj?auto=compress,format",
            "reaction": [
              {
                "reaction": "+1",
                "count": 5,
                "reacted": false
              },
              {
                "reaction": "heart",
                "count": 1,
                "reacted": false
              }
            ],
            "tags": [],
            "repliesCount": 1,
            "reactionCount": 6,
            "member": {
              "id": 25827,
              "name": "Lukmanul Hakim",
              "email": "hakim8luqmanul@gmail.com",
              "profilePictureUrl": "",
              "is_dealer": false
            },
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
              "postsCount": 18622,
              "membersCount": 90786
            },
            "medias": [
              {
                "id": 127,
                "url": "https://tribe-s3-production.imgix.net/v8kZmW5ce815Qj27jeQfj?auto=compress,format",
                "type": "Image",
                "thumbnail": {
                  "url": "https://tribe-s3-production.imgix.net/v8kZmW5ce815Qj27jeQfj?auto=compress,format",
                  "width": 2296,
                  "height": 4080,
                  "type": ""
                }
              }
            ],
            "mmidUserId": 1835922,
            "totalRepliesCount": 1,
            "created_at": "2025-02-15 12:12:36",
            "published_at": "2025-02-15 12:12:36",
            "published_at_title": "15 February 2025",
            "type": "image",
            "is_post_owner": false
          }
        ]
      }
    }
  })
  @ApiResponse({
    status: 404, description: 'Sample error message', example: {
      "success": false,
      "alert": {
        "code": 404,
        "message": "Not Found"
      },
      "data": null
    }
  })
  async postFollowers(@Query() param: GetPostsDto, @Req() request): Promise<GlobalResponse<PostCollectionResponse>> {
    const { limit, after, order } = param;
    const { id: userId } = request.userData


    let response = await this.postService.collectPosts('following', limit, after, null, order, userId)
    return {
      message: "Success get data",
      data: response
    }
  }

  // post highlight   
  @Get('highlight')
  @ApiOperation({ summary: 'Post Highlight' })
  @ApiResponse({
    status: 200, description: "Success result", example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success get data"
      },
      "data": {
        "totalData": 3,
        "hasNext": false,
        "page": 1,
        "limit": 15,
        "offset": 0,
        "after": "9a7238e0-3071-11f0-8f4a-c7d5a00ee7ba",
        "data": [
          {
            "id": 21,
            "title": "A Day at IIMS 2025 with Mitsubishi Motors",
            "description": "*Ngungsi ke Pameran* ?\nYuppss..\nJudulnya emang ngungsi, soalnya rumah kita sedang di renov.\nRenov garasi biar lebih gedean. Siapa tau kan yaa abis pameran, kita bisa boyong Dakar Ultimate 4x2 ?\nHari ini ...",
            "textContent": "*Ngungsi ke Pameran* ?\nYuppss..\nJudulnya emang ngungsi, soalnya rumah kita sedang di renov.\nRenov garasi biar lebih gedean. Siapa tau kan yaa abis pameran, kita bisa boyong Dakar Ultimate 4x2 ?\nHari ini 22 feb 2025, kita sekeluarga gass ke IIMS dari Depok to Kemayoran.\nMayan banget Jaraknya, plus Mayan banget Macetnya. Poll dah!\nUntung banget bawa Xpander Ultimate; Nyaman, Lega, Empuk lg ?\nSuasana macet bawaannya jd Nyantuy ?\nApalagi momentnya jd petcha banget waktu kita sekeluarga sampe di JIExpo. Secara ini pertama kita ke IIMS ? dan pertama jg main ke JIExpo nya ?.\nHari2 cuma lewat doang, ga pernah niat mampir ke JIExpo wkwkw\nBela2in ke JIExpo karena semangat pengen liat Xforce terbaru, Ultimate with Diamond Sense (DS), gacor emang!\nTapi Sumpah...\nwaktu pertama sampe kek semua booth mau kita samperin.\nTapi sorry sorry banget...\nBooth lain mah mungkin bisa kita ampirin.\nTapi, booth nya Mitsubishi...\nKUDU MUSTI pake HARUS jadi yang Pertama!\n*Soalnya kita bangga jadi bagian keluarga Mitsubishi Indonesia ?*\nNih guys sebongkah serpihan moment keseruan kita di IIMS 2025.\nSerpihan lainnya di Bongkahan moment selanjutnya yaa. Wkwk buanyak emang ?\nPokoknya Petcha dan Nagih!\nSee you di IIMS 2026 ya Mitsubishi.\nJaya selalu Mitsubishi ?\nDitunggu produk-produk barunya yaa\nSenggol DST Concept?\nColek Eclipse Cross ?\nCubit Xpander HEV ?\n#MiMateIIMS2025",
            "image": "https://tribe-s3-production.imgix.net/Ti03qd5f6dLuPOoL7gLOs?auto=compress,format",
            "reaction": [
              {
                "reaction": "+1",
                "count": 4,
                "reacted": false
              },
              {
                "reaction": "heart",
                "count": 2,
                "reacted": false
              },
              {
                "reaction": "tada",
                "count": 1,
                "reacted": false
              }
            ],
            "tags": [],
            "repliesCount": 2,
            "reactionCount": 7,
            "member": {
              "id": 11830,
              "name": "ARIF PURNOMO",
              "email": "arifpurnomo.pbm@gmail.com",
              "profilePictureUrl": "https://tribe-s3-production.imgix.net/GHVLKgsiLy4Gx7NVzKOSs?auto=compress,format",
              "is_dealer": false
            },
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
              "postsCount": 18622,
              "membersCount": 90786
            },
            "medias": [
              {
                "id": 32,
                "url": "https://tribe-s3-production.imgix.net/Ti03qd5f6dLuPOoL7gLOs?auto=compress,format",
                "type": "Image",
                "thumbnail": {
                  "url": "https://tribe-s3-production.imgix.net/Ti03qd5f6dLuPOoL7gLOs?auto=compress,format",
                  "width": 595,
                  "height": 860,
                  "type": ""
                }
              }
            ],
            "mmidUserId": 1970317,
            "totalRepliesCount": 2,
            "created_at": "2025-02-22 22:36:08",
            "published_at": "2025-02-22 22:36:08",
            "published_at_title": "22 February 2025",
            "type": "image",
            "is_post_owner": false
          },
          {
            "id": 33,
            "title": "Morning Ride",
            "description": "Selamat Pagi warga MiMate_ID dari bumi Serambi Mekkah ??",
            "textContent": "Selamat Pagi warga MiMate_ID dari bumi Serambi Mekkah ??",
            "image": "https://tribe-s3-production.imgix.net/0RzT24fxOxqVvXDkkvwbZ?auto=compress,format",
            "reaction": [
              {
                "reaction": "+1",
                "count": 4,
                "reacted": false
              },
              {
                "reaction": "heart",
                "count": 3,
                "reacted": false
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
              },
              {
                "slug": "xpcross-id",
                "id": 2211,
                "title": "xpcross.id"
              }
            ],
            "repliesCount": 3,
            "reactionCount": 7,
            "member": {
              "id": 12423,
              "name": "Heryanto",
              "email": "heryanto.ery@gmail.com",
              "profilePictureUrl": "https://tribe-s3-production.imgix.net/lPw3hCPkOxicJNJYfPjBl?auto=compress,format",
              "is_dealer": false
            },
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
              "postsCount": 18622,
              "membersCount": 90786
            },
            "medias": [
              {
                "id": 51,
                "url": "https://tribe-s3-production.imgix.net/0RzT24fxOxqVvXDkkvwbZ?auto=compress,format",
                "type": "Image",
                "thumbnail": {
                  "url": "https://tribe-s3-production.imgix.net/0RzT24fxOxqVvXDkkvwbZ?auto=compress,format",
                  "width": 4032,
                  "height": 3024,
                  "type": ""
                }
              },
              {
                "id": 52,
                "url": "https://tribe-s3-production.imgix.net/AYMdL9voHJWwq2fPjoVuQ?auto=compress,format",
                "type": "Image",
                "thumbnail": {
                  "url": "https://tribe-s3-production.imgix.net/AYMdL9voHJWwq2fPjoVuQ?auto=compress,format",
                  "width": 4032,
                  "height": 3024,
                  "type": ""
                }
              }
            ],
            "mmidUserId": 1971435,
            "totalRepliesCount": 4,
            "created_at": "2025-02-22 08:18:43",
            "published_at": "2025-02-22 08:18:43",
            "published_at_title": "22 February 2025",
            "type": "image",
            "is_post_owner": false
          },
          {
            "id": 86,
            "title": "Service 6 bulan",
            "description": "Alhamdulillah baru selesai service rutin 6 bulan di Sun Star Motor Cibinong.\nService OK, ruang tunggu nyaman, dan kopinya enak ?",
            "textContent": "Alhamdulillah baru selesai service rutin 6 bulan di Sun Star Motor Cibinong.\nService OK, ruang tunggu nyaman, dan kopinya enak ?",
            "image": "https://tribe-s3-production.imgix.net/v8kZmW5ce815Qj27jeQfj?auto=compress,format",
            "reaction": [
              {
                "reaction": "+1",
                "count": 5,
                "reacted": false
              },
              {
                "reaction": "heart",
                "count": 1,
                "reacted": false
              }
            ],
            "tags": [],
            "repliesCount": 1,
            "reactionCount": 6,
            "member": {
              "id": 25827,
              "name": "Lukmanul Hakim",
              "email": "hakim8luqmanul@gmail.com",
              "profilePictureUrl": "",
              "is_dealer": false
            },
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
              "postsCount": 18622,
              "membersCount": 90786
            },
            "medias": [
              {
                "id": 127,
                "url": "https://tribe-s3-production.imgix.net/v8kZmW5ce815Qj27jeQfj?auto=compress,format",
                "type": "Image",
                "thumbnail": {
                  "url": "https://tribe-s3-production.imgix.net/v8kZmW5ce815Qj27jeQfj?auto=compress,format",
                  "width": 2296,
                  "height": 4080,
                  "type": ""
                }
              }
            ],
            "mmidUserId": 1835922,
            "totalRepliesCount": 1,
            "created_at": "2025-02-15 12:12:36",
            "published_at": "2025-02-15 12:12:36",
            "published_at_title": "15 February 2025",
            "type": "image",
            "is_post_owner": false
          }
        ]
      }
    }
  })
  async postHighlight(@Query() param: GetPostHighlightDto, @Req() request): Promise<GlobalResponse<PostCollectionResponse>> {
    const { limit, after, order, source } = param;
    const { id: userId } = request.userData

    let response = await this.postService.collectPosts('highlight', limit, after, userId, order, userId, source)
    return {
      message: "Success get data",
      data: response
    }
  }

  // Latest Post
  @Get('latest')
  @ApiOperation({ summary: 'Latest Post' })
  @ApiResponse({
    status: 200, description: "Success result", example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success get data"
      },
      "data": {
        "totalData": 22937,
        "hasNext": true,
        "page": 1,
        "limit": 15,
        "offset": 0,
        "after": "d61545b0-12cd-11f1-8b85-edc19222595a",
        "data": [
          {
            "id": 23267,
            "title": "coba vote",
            "description": "coba vote",
            "textContent": "coba vote",
            "image": "",
            "reaction": [],
            "tags": [],
            "repliesCount": 0,
            "reactionCount": 0,
            "member": {
              "id": 79916,
              "name": "User_79916",
              "email": "crm.cx@mitsubishi-motors.co.id",
              "profilePictureUrl": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1752761986929-66210768-3a86-44a7-b67a-83be974d2040-c95a165dcdd82a77.jpg",
              "is_dealer": false
            },
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
              "postsCount": 21430,
              "membersCount": 92303
            },
            "medias": [],
            "mmidUserId": 1086558,
            "totalRepliesCount": 0,
            "created_at": "2026-02-12 10:46:00",
            "published_at": "2026-02-23 14:42:41",
            "published_at_title": "12 February 2026",
            "type": "image",
            "post_type": "vote",
            "vote_start": "2026-02-11T16:00:00.000Z",
            "vote_end": "2026-02-13T15:59:00.000Z",
            "total_vote": 1,
            "is_post_owner": true,
            "votes": [
              {
                "id": 7,
                "vote": "Vote 2 dong",
                "total_vote": 0,
                "percentage": 0
              },
              {
                "id": 8,
                "vote": "Vote 3 ok",
                "total_vote": 1,
                "percentage": 100
              },
              {
                "id": 9,
                "vote": "Vote 4 coba",
                "total_vote": 0,
                "percentage": 0
              },
              {
                "id": 10,
                "vote": "Vote 16 hello",
                "total_vote": 0,
                "percentage": 0
              },
              {
                "id": 11,
                "vote": "coba vote lagi dong",
                "total_vote": 0,
                "percentage": 0
              }
            ],
            "my_vote_id": 8,
            "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=23267"
          },
          {
            "id": 23266,
            "title": "test Post Notif",
            "description": "test notif",
            "textContent": "test notif",
            "image": "https://mimate-api.otesuto.com/upload/files/28dc51ad-f18a-4c6a-99a5-a3439d2f6f9c",
            "reaction": [
              {
                "reaction": "+1",
                "count": 2,
                "reacted": false
              }
            ],
            "tags": [],
            "repliesCount": 4,
            "reactionCount": 2,
            "member": {
              "id": 136069,
              "name": "Test C",
              "email": "mmid.qatesting3@tcid.co.id",
              "profilePictureUrl": "",
              "is_dealer": false
            },
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
              "postsCount": 21430,
              "membersCount": 92303
            },
            "medias": [
              {
                "id": 29831,
                "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1770688781357-89ee6db8-04c6-496e-a086-d41044f8cede-1770688777290_3291.jpg.jpg",
                "type": "Image",
                "thumbnail": {
                  "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1770688781357-89ee6db8-04c6-496e-a086-d41044f8cede-1770688777290_3291.jpg.jpg",
                  "width": 1080,
                  "height": 1440,
                  "type": "Image"
                }
              }
            ],
            "mmidUserId": 1605116,
            "totalRepliesCount": 4,
            "created_at": "2026-02-10 17:59:43",
            "published_at": "2026-02-12 11:54:08",
            "published_at_title": "10 February 2026",
            "type": "image",
            "post_type": "post",
            "vote_start": "",
            "vote_end": "",
            "total_vote": "",
            "is_post_owner": false,
            "votes": [],
            "my_vote_id": 0,
            "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=23266"
          },
          {
            "id": 23265,
            "title": "test push notif 1",
            "description": "test push notif 1",
            "textContent": "test push notif 1",
            "image": "https://mimate-api.mymitsubishiapps.com/upload/files/IdRJx7xlIg6wcepskB2yh",
            "reaction": [
              {
                "reaction": "+1",
                "count": 2,
                "reacted": false
              }
            ],
            "tags": [],
            "repliesCount": 4,
            "reactionCount": 2,
            "member": {
              "id": 10726,
              "name": "Gsm",
              "email": "gs@agung.pw",
              "profilePictureUrl": "",
              "is_dealer": false
            },
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
              "postsCount": 21430,
              "membersCount": 92303
            },
            "medias": [],
            "mmidUserId": 1604995,
            "totalRepliesCount": 4,
            "created_at": "2026-02-06 21:12:36",
            "published_at": "2026-02-06 16:33:17",
            "published_at_title": "6 February 2026",
            "type": "image",
            "post_type": "post",
            "vote_start": "",
            "vote_end": "",
            "total_vote": "",
            "is_post_owner": false,
            "votes": [],
            "my_vote_id": 0,
            "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=23265"
          },
          {
            "id": 23264,
            "title": "Test MiMate",
            "description": "Push notif mantap",
            "textContent": "Push notif mantap",
            "image": "https://mimate-api.otesuto.com/upload/files/ca0f16d2-45f7-4b28-9ea8-958462ccc51a",
            "reaction": [
              {
                "reaction": "+1",
                "count": 1,
                "reacted": false
              }
            ],
            "tags": [],
            "repliesCount": 7,
            "reactionCount": 1,
            "member": {
              "id": 136069,
              "name": "Test C",
              "email": "mmid.qatesting3@tcid.co.id",
              "profilePictureUrl": "",
              "is_dealer": false
            },
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
              "postsCount": 21430,
              "membersCount": 92303
            },
            "medias": [
              {
                "id": 29828,
                "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1770197327563-fdecb4b7-b6e7-43d4-b7cd-b7711c07a671-1770197325775_2599.jpg.jpg",
                "type": "Image",
                "thumbnail": {
                  "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1770197327563-fdecb4b7-b6e7-43d4-b7cd-b7711c07a671-1770197325775_2599.jpg.jpg",
                  "width": 1080,
                  "height": 1440,
                  "type": "Image"
                }
              }
            ],
            "mmidUserId": 1605116,
            "totalRepliesCount": 7,
            "created_at": "2026-02-05 01:28:49",
            "published_at": "2026-02-06 16:39:11",
            "published_at_title": "5 February 2026",
            "type": "image",
            "post_type": "post",
            "vote_start": "",
            "vote_end": "",
            "total_vote": "",
            "is_post_owner": false,
            "votes": [],
            "my_vote_id": 0,
            "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=23264"
          },
          {
            "id": 23263,
            "title": "haha",
            "description": "hahah",
            "textContent": "hahah",
            "image": "https://mimate-api.mymitsubishiapps.com/upload/files/IdRJx7xlIg6wcepskB2yh",
            "reaction": [],
            "tags": [],
            "repliesCount": 2,
            "reactionCount": 0,
            "member": {
              "id": 76972,
              "name": "Natanael Kristiawan",
              "email": "natanaelkristiawan@maxsol.id",
              "profilePictureUrl": "",
              "is_dealer": false
            },
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
              "postsCount": 21430,
              "membersCount": 92303
            },
            "medias": [],
            "mmidUserId": 64704,
            "totalRepliesCount": 2,
            "created_at": "2026-02-05 00:24:56",
            "published_at": "2026-02-06 16:35:34",
            "published_at_title": "5 February 2026",
            "type": "image",
            "post_type": "post",
            "vote_start": "",
            "vote_end": "",
            "total_vote": "",
            "is_post_owner": false,
            "votes": [],
            "my_vote_id": 0,
            "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=23263"
          },
          {
            "id": 23262,
            "title": "test 5",
            "description": "test 5",
            "textContent": "test 5",
            "image": "https://mimate-api.mymitsubishiapps.com/upload/files/IdRJx7xlIg6wcepskB2yh",
            "reaction": [
              {
                "reaction": "tada",
                "count": 1,
                "reacted": false
              }
            ],
            "tags": [],
            "repliesCount": 6,
            "reactionCount": 1,
            "member": {
              "id": 10726,
              "name": "Gsm",
              "email": "gs@agung.pw",
              "profilePictureUrl": "",
              "is_dealer": false
            },
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
              "postsCount": 21430,
              "membersCount": 92303
            },
            "medias": [],
            "mmidUserId": 1604995,
            "totalRepliesCount": 6,
            "created_at": "2026-02-04 23:17:55",
            "published_at": "2026-02-04 16:23:30",
            "published_at_title": "4 February 2026",
            "type": "image",
            "post_type": "post",
            "vote_start": "",
            "vote_end": "",
            "total_vote": "",
            "is_post_owner": false,
            "votes": [],
            "my_vote_id": 0,
            "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=23262"
          },
          {
            "id": 23261,
            "title": "test 4",
            "description": "test 4",
            "textContent": "test 4",
            "image": "https://mimate-api.mymitsubishiapps.com/upload/files/IdRJx7xlIg6wcepskB2yh",
            "reaction": [
              {
                "reaction": "heart",
                "count": 1,
                "reacted": false
              }
            ],
            "tags": [],
            "repliesCount": 2,
            "reactionCount": 1,
            "member": {
              "id": 10726,
              "name": "Gsm",
              "email": "gs@agung.pw",
              "profilePictureUrl": "",
              "is_dealer": false
            },
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
              "postsCount": 21430,
              "membersCount": 92303
            },
            "medias": [],
            "mmidUserId": 1604995,
            "totalRepliesCount": 2,
            "created_at": "2026-02-04 19:51:55",
            "published_at": "2026-02-04 15:05:39",
            "published_at_title": "4 February 2026",
            "type": "image",
            "post_type": "post",
            "vote_start": "",
            "vote_end": "",
            "total_vote": "",
            "is_post_owner": false,
            "votes": [],
            "my_vote_id": 0,
            "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=23261"
          },
          {
            "id": 23260,
            "title": "testing push notif",
            "description": "push notif testing",
            "textContent": "push notif testing",
            "image": "https://mimate-api.otesuto.com/upload/files/53991a08-9ac3-49d6-a843-24bbba5d77a3",
            "reaction": [
              {
                "reaction": "+1",
                "count": 2,
                "reacted": false
              }
            ],
            "tags": [],
            "repliesCount": 6,
            "reactionCount": 2,
            "member": {
              "id": 136061,
              "name": "Testing A Mimate",
              "email": "mmid.qatesting1@tcid.co.id",
              "profilePictureUrl": "",
              "is_dealer": false
            },
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
              "postsCount": 21430,
              "membersCount": 92303
            },
            "medias": [
              {
                "id": 29827,
                "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1770172544834-90f62318-45df-4e8b-878f-d6e557435d99-1770172535913_3e51a01f-9d2f-4888-a789-16e0bedd26cc5541128082933228293.jpg.jpg",
                "type": "Image",
                "thumbnail": {
                  "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1770172544834-90f62318-45df-4e8b-878f-d6e557435d99-1770172535913_3e51a01f-9d2f-4888-a789-16e0bedd26cc5541128082933228293.jpg.jpg",
                  "width": 1080,
                  "height": 1440,
                  "type": "Image"
                }
              }
            ],
            "mmidUserId": 1605114,
            "totalRepliesCount": 6,
            "created_at": "2026-02-04 18:35:49",
            "published_at": "2026-02-04 16:03:41",
            "published_at_title": "4 February 2026",
            "type": "image",
            "post_type": "post",
            "vote_start": "",
            "vote_end": "",
            "total_vote": "",
            "is_post_owner": false,
            "votes": [],
            "my_vote_id": 0,
            "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=23260"
          },
          {
            "id": 23259,
            "title": "Test Upload Video",
            "description": "Test Upload Video",
            "textContent": "Test Upload Video",
            "image": "https://mimate-api.otesuto.com/upload/files/87ff52ee-0131-4d15-8880-e6ebadae77dd",
            "reaction": [],
            "tags": [],
            "repliesCount": 1,
            "reactionCount": 0,
            "member": {
              "id": 77638,
              "name": "Tester Baim",
              "email": "rizkiakbar31@gmail.com",
              "profilePictureUrl": "https://ktb.otesuto.com/storage/users/cyAsSgPqISB9Rr3pi5qVD8A1ImLqd9Y1xnm5266w.jpeg",
              "is_dealer": false
            },
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
              "postsCount": 21430,
              "membersCount": 92303
            },
            "medias": [
              {
                "id": 29826,
                "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/videos/1767755950472-e1474eb9-95ed-45b2-b56c-a86394a7151c-VID_2026-01-07 10-17-291085215435.mp4",
                "type": "Video",
                "thumbnail": {
                  "type": "Image",
                  "width": 209,
                  "height": 512,
                  "url": "https://mimate-api.otesuto.com/upload/files/87ff52ee-0131-4d15-8880-e6ebadae77dd",
                  "url_new": "https://mimate-api.otesuto.com/upload/files/87ff52ee-0131-4d15-8880-e6ebadae77dd",
                  "url_open": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1767755949668-f28dfbef-0cb1-4100-9883-2d23c81d7de7-VID_2026-01-07 10-17-291085215435.jpg"
                }
              }
            ],
            "mmidUserId": 64028,
            "totalRepliesCount": 1,
            "created_at": "2026-01-07 19:19:15",
            "published_at": "2026-02-04 11:28:26",
            "published_at_title": "7 January 2026",
            "type": "video",
            "post_type": "post",
            "vote_start": "",
            "vote_end": "",
            "total_vote": "",
            "is_post_owner": false,
            "votes": [],
            "my_vote_id": 0,
            "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=23259"
          },
          {
            "id": 23258,
            "title": "test",
            "description": "test",
            "textContent": "test",
            "image": "https://mimate-api.otesuto.com/upload/files/58d552f6-6176-426e-82d2-8143f89ad933",
            "reaction": [
              {
                "reaction": "+1",
                "count": 1,
                "reacted": false
              }
            ],
            "tags": [],
            "repliesCount": 0,
            "reactionCount": 1,
            "member": {
              "id": 136136,
              "name": "Luthfi",
              "email": "amali.luthfi19@gmail.com",
              "profilePictureUrl": "",
              "is_dealer": false
            },
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
              "postsCount": 21430,
              "membersCount": 92303
            },
            "medias": [
              {
                "id": 29825,
                "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1765956319521-92e26633-65c1-4790-9601-ab6cbde1e99e-1765956315740_461a419c-4dcc-4ae3-ad22-6be00de8d71c542947601302861469.jpg.jpg",
                "type": "Image",
                "thumbnail": {
                  "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1765956319521-92e26633-65c1-4790-9601-ab6cbde1e99e-1765956315740_461a419c-4dcc-4ae3-ad22-6be00de8d71c542947601302861469.jpg.jpg",
                  "width": 1080,
                  "height": 1440,
                  "type": "Image"
                }
              }
            ],
            "mmidUserId": 1605343,
            "totalRepliesCount": 0,
            "created_at": "2025-12-17 23:25:21",
            "published_at": "2026-01-09 16:03:34",
            "published_at_title": "17 December 2025",
            "type": "image",
            "post_type": "post",
            "vote_start": "",
            "vote_end": "",
            "total_vote": "",
            "is_post_owner": false,
            "votes": [],
            "my_vote_id": 0,
            "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=23258"
          },
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
            "id": 23253,
            "title": "test 2",
            "description": "test",
            "textContent": "test",
            "image": "https://mimate-api.mymitsubishiapps.com/upload/files/IdRJx7xlIg6wcepskB2yh",
            "reaction": [
              {
                "reaction": "+1",
                "count": 4,
                "reacted": true
              }
            ],
            "tags": [],
            "repliesCount": 1,
            "reactionCount": 4,
            "member": {
              "id": 18430,
              "name": "Test T Mimate",
              "email": "mmid.qatesting20@tcid.co.id",
              "profilePictureUrl": "",
              "is_dealer": false
            },
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
              "postsCount": 21430,
              "membersCount": 92303
            },
            "medias": [],
            "mmidUserId": 1605387,
            "totalRepliesCount": 1,
            "created_at": "2025-12-05 20:03:20",
            "published_at": "2025-12-10 17:13:48",
            "published_at_title": "5 December 2025",
            "type": "image",
            "post_type": "post",
            "vote_start": "",
            "vote_end": "",
            "total_vote": "",
            "is_post_owner": false,
            "votes": [],
            "my_vote_id": 0,
            "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=23253"
          },
          {
            "id": 23252,
            "title": "Test Create Post",
            "description": "title",
            "textContent": "title",
            "image": "https://mimate-api.mymitsubishiapps.com/upload/files/IdRJx7xlIg6wcepskB2yh",
            "reaction": [
              {
                "reaction": "tada",
                "count": 2,
                "reacted": false
              },
              {
                "reaction": "smile",
                "count": 1,
                "reacted": false
              },
              {
                "reaction": "+1",
                "count": 4,
                "reacted": false
              },
              {
                "reaction": "heart",
                "count": 2,
                "reacted": false
              }
            ],
            "tags": [],
            "repliesCount": 2,
            "reactionCount": 9,
            "member": {
              "id": 136063,
              "name": "Test B Mimate",
              "email": "mmid.qatesting2@tcid.co.id",
              "profilePictureUrl": "",
              "is_dealer": false
            },
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
              "postsCount": 21430,
              "membersCount": 92303
            },
            "medias": [],
            "mmidUserId": 1605115,
            "totalRepliesCount": 2,
            "created_at": "2025-12-01 19:15:22",
            "published_at": "2025-12-10 16:50:56",
            "published_at_title": "1 December 2025",
            "type": "image",
            "post_type": "post",
            "vote_start": "",
            "vote_end": "",
            "total_vote": "",
            "is_post_owner": false,
            "votes": [],
            "my_vote_id": 0,
            "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=23252"
          },
          {
            "id": 23251,
            "title": "Cavs days",
            "description": "hype",
            "textContent": "hype",
            "image": "https://mimate-api.otesuto.com/upload/files/f65a6b77-1641-4aa2-9d86-807c73b7cd27",
            "reaction": [
              {
                "reaction": "+1",
                "count": 4,
                "reacted": false
              }
            ],
            "tags": [],
            "repliesCount": 5,
            "reactionCount": 4,
            "member": {
              "id": 90884,
              "name": "The King",
              "email": "mmid.qatesting97@gmail.com",
              "profilePictureUrl": "https://ktb.otesuto.com/storage/users/2025/yXeMNeVGBCla6wLYQ20hkCcjYdYkbOTx70mzsqzS.png",
              "is_dealer": false
            },
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
              "postsCount": 21430,
              "membersCount": 92303
            },
            "medias": [
              {
                "id": 29818,
                "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1764554484795-016ad7bd-0362-47ab-a065-7b5a78385623-1764554470179_1000049066.jpg.jpg",
                "type": "Image",
                "thumbnail": {
                  "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1764554484795-016ad7bd-0362-47ab-a065-7b5a78385623-1764554470179_1000049066.jpg.jpg",
                  "width": 1080,
                  "height": 1080,
                  "type": "Image"
                }
              }
            ],
            "mmidUserId": 1604966,
            "totalRepliesCount": 5,
            "created_at": "2025-12-01 18:01:25",
            "published_at": "2025-12-23 10:22:11",
            "published_at_title": "1 December 2025",
            "type": "image",
            "post_type": "post",
            "vote_start": "",
            "vote_end": "",
            "total_vote": "",
            "is_post_owner": false,
            "votes": [],
            "my_vote_id": 0,
            "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=23251"
          },
          {
            "id": 23250,
            "title": "4 Rings",
            "description": "The Title",
            "textContent": "The Title",
            "image": "https://mimate-api.otesuto.com/upload/files/1c50837a-bcd4-47a1-8357-c5bb2906abde",
            "reaction": [
              {
                "reaction": "+1",
                "count": 5,
                "reacted": false
              },
              {
                "reaction": "tada",
                "count": 1,
                "reacted": false
              },
              {
                "reaction": "heart",
                "count": 1,
                "reacted": false
              }
            ],
            "tags": [],
            "repliesCount": 2,
            "reactionCount": 7,
            "member": {
              "id": 90884,
              "name": "The King",
              "email": "mmid.qatesting97@gmail.com",
              "profilePictureUrl": "https://ktb.otesuto.com/storage/users/2025/yXeMNeVGBCla6wLYQ20hkCcjYdYkbOTx70mzsqzS.png",
              "is_dealer": false
            },
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
              "postsCount": 21430,
              "membersCount": 92303
            },
            "medias": [
              {
                "id": 29817,
                "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1764552178340-60d2b9d8-e151-4312-9422-58d4d4e2e3d4-1764552175670_1000049053.jpg.jpg",
                "type": "Image",
                "thumbnail": {
                  "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1764552178340-60d2b9d8-e151-4312-9422-58d4d4e2e3d4-1764552175670_1000049053.jpg.jpg",
                  "width": 640,
                  "height": 480,
                  "type": "Image"
                }
              }
            ],
            "mmidUserId": 1604966,
            "totalRepliesCount": 2,
            "created_at": "2025-12-01 17:22:59",
            "published_at": "2025-12-23 10:24:37",
            "published_at_title": "1 December 2025",
            "type": "image",
            "post_type": "post",
            "vote_start": "",
            "vote_end": "",
            "total_vote": "",
            "is_post_owner": false,
            "votes": [],
            "my_vote_id": 0,
            "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=23250"
          }
        ]
      }
    }
  })
  @ApiResponse({
    status: 404, description: 'Sample error message', example: {
      "success": false,
      "alert": {
        "code": 404,
        "message": "Not Found"
      },
      "data": null
    }
  })
  async latestPosts(@Query() param: GetPostsDto, @Req() request): Promise<GlobalResponse<PostCollectionResponse>> {
    const { limit, after, order } = param;
    const { id: userId } = request.userData
    let response = await this.postService.collectPosts('latest', limit, after, null, order, userId)


    // set event data
    const eventData = {
      type: 'event',
      customer_id: userId,
      device_id: '',
      actions: [
        {
          action: 'Home Mimate - Screen',
          attributes: request.userData,
          platform: 'mobile',
          app_version: '3.2.0',
          current_time: new Date().toISOString(),
          user_timezone_offset: 25200,
        }
      ]
    }

    // send to moengage
    await this.moengageService.sendEventData(eventData)

    const result = {
      message: "Success get data",
      data: response
    };



    return result;
  }


  // get member post
  @Get('member')
  @ApiOperation({ summary: 'Member Posts Collection' })
  @ApiResponse({
    status: 200, description: "Success result", example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success get data"
      },
      "data": {
        "totalData": 382,
        "hasNext": true,
        "page": 1,
        "limit": 15,
        "offset": 0,
        "after": "dc59fc40-12c8-11f1-9cee-ab4b8a092cb8",
        "data": [
          {
            "id": 23267,
            "title": "coba vote",
            "description": "coba vote",
            "textContent": "coba vote",
            "image": "",
            "reaction": [],
            "tags": [],
            "repliesCount": 0,
            "reactionCount": 0,
            "member": {
              "id": 79916,
              "name": "User_79916",
              "email": "crm.cx@mitsubishi-motors.co.id",
              "profilePictureUrl": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1752761986929-66210768-3a86-44a7-b67a-83be974d2040-c95a165dcdd82a77.jpg",
              "is_dealer": false
            },
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
              "postsCount": 21430,
              "membersCount": 92303
            },
            "medias": [],
            "mmidUserId": 1086558,
            "totalRepliesCount": 0,
            "created_at": "2026-02-12 10:46:00",
            "published_at": "2026-02-23 14:42:41",
            "published_at_title": "12 February 2026",
            "type": "image",
            "post_type": "vote",
            "vote_start": "2026-02-11T16:00:00.000Z",
            "vote_end": "2026-02-13T15:59:00.000Z",
            "total_vote": 1,
            "is_post_owner": true,
            "votes": [
              {
                "id": 7,
                "vote": "Vote 2 dong",
                "total_vote": 0,
                "percentage": 0
              },
              {
                "id": 8,
                "vote": "Vote 3 ok",
                "total_vote": 1,
                "percentage": 100
              },
              {
                "id": 9,
                "vote": "Vote 4 coba",
                "total_vote": 0,
                "percentage": 0
              },
              {
                "id": 10,
                "vote": "Vote 16 hello",
                "total_vote": 0,
                "percentage": 0
              },
              {
                "id": 11,
                "vote": "coba vote lagi dong",
                "total_vote": 0,
                "percentage": 0
              }
            ],
            "my_vote_id": 8,
            "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=23267"
          },
          {
            "id": 23240,
            "title": "Test",
            "description": "Test",
            "textContent": "Test",
            "image": "https://mimate-api.otesuto.com/upload/files/47feeca3-1d64-4b0c-9ca5-3ffe83c7be57",
            "reaction": [
              {
                "reaction": "+1",
                "count": 2,
                "reacted": false
              }
            ],
            "tags": [],
            "repliesCount": 3,
            "reactionCount": 2,
            "member": {
              "id": 79916,
              "name": "User_79916",
              "email": "crm.cx@mitsubishi-motors.co.id",
              "profilePictureUrl": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1752761986929-66210768-3a86-44a7-b67a-83be974d2040-c95a165dcdd82a77.jpg",
              "is_dealer": false
            },
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
              "postsCount": 21430,
              "membersCount": 92303
            },
            "medias": [
              {
                "id": 29805,
                "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1756958490487-548dc9d6-ed00-46da-a229-e72cc33b9a61-icon-clc-money-hand.png",
                "type": "Image",
                "thumbnail": {
                  "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1756958490487-548dc9d6-ed00-46da-a229-e72cc33b9a61-icon-clc-money-hand.png",
                  "width": 350,
                  "height": 350,
                  "type": "Image"
                }
              }
            ],
            "mmidUserId": 1086558,
            "totalRepliesCount": 3,
            "created_at": "2025-09-04 20:01:33",
            "published_at": "2026-01-14 16:26:26",
            "published_at_title": "4 September 2025",
            "type": "image",
            "post_type": "post",
            "vote_start": "",
            "vote_end": "",
            "total_vote": "",
            "is_post_owner": true,
            "votes": [],
            "my_vote_id": 0,
            "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=23240"
          },
          {
            "id": 23239,
            "title": "Ini adalah Title Content, melihat ini berarti.....",
            "description": "anda berhasil masuk ke dalam detail post. di post pada 03/09/25 13:26",
            "textContent": "anda berhasil masuk ke dalam detail post. di post pada 03/09/25 13:26",
            "image": "https://mimate-api.otesuto.com/upload/files/93847329-1fe6-4cd8-8be8-757a44ea575d",
            "reaction": [
              {
                "reaction": "+1",
                "count": 1,
                "reacted": false
              }
            ],
            "tags": [],
            "repliesCount": 3,
            "reactionCount": 1,
            "member": {
              "id": 79916,
              "name": "User_79916",
              "email": "crm.cx@mitsubishi-motors.co.id",
              "profilePictureUrl": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1752761986929-66210768-3a86-44a7-b67a-83be974d2040-c95a165dcdd82a77.jpg",
              "is_dealer": false
            },
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
              "postsCount": 21430,
              "membersCount": 92303
            },
            "medias": [
              {
                "id": 29803,
                "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1756880831949-89809f46-5f94-427a-89d9-699cc16eeb07-peakpx.jpg",
                "type": "Image",
                "thumbnail": {
                  "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1756880831949-89809f46-5f94-427a-89d9-699cc16eeb07-peakpx.jpg",
                  "width": 2880,
                  "height": 1800,
                  "type": "Image"
                }
              }
            ],
            "mmidUserId": 1086558,
            "totalRepliesCount": 3,
            "created_at": "2025-09-03 22:28:02",
            "published_at": "2025-12-01 10:17:56",
            "published_at_title": "3 September 2025",
            "type": "image",
            "post_type": "post",
            "vote_start": "",
            "vote_end": "",
            "total_vote": "",
            "is_post_owner": true,
            "votes": [],
            "my_vote_id": 0,
            "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=23239"
          },
          {
            "id": 23238,
            "title": "Ini adalah post title",
            "description": "ini adalah content title pada 03/09/2025 di jam 10:22 WIB ",
            "textContent": "ini adalah content title pada 03/09/2025 di jam 10:22 WIB ",
            "image": "https://mimate-api.otesuto.com/upload/files/7f059b1d-03ca-48d0-a34d-cb6855835de7",
            "reaction": [
              {
                "reaction": "tada",
                "count": 1,
                "reacted": false
              }
            ],
            "tags": [],
            "repliesCount": 1,
            "reactionCount": 1,
            "member": {
              "id": 79916,
              "name": "User_79916",
              "email": "crm.cx@mitsubishi-motors.co.id",
              "profilePictureUrl": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1752761986929-66210768-3a86-44a7-b67a-83be974d2040-c95a165dcdd82a77.jpg",
              "is_dealer": false
            },
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
              "postsCount": 21430,
              "membersCount": 92303
            },
            "medias": [
              {
                "id": 29802,
                "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1756869775673-d3ad3ade-1bb2-4449-9bdb-c255ce149a06-mimate 1.png",
                "type": "Image",
                "thumbnail": {
                  "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1756869775673-d3ad3ade-1bb2-4449-9bdb-c255ce149a06-mimate 1.png",
                  "width": 103,
                  "height": 68,
                  "type": "Image"
                }
              }
            ],
            "mmidUserId": 1086558,
            "totalRepliesCount": 1,
            "created_at": "2025-09-03 19:23:35",
            "published_at": "2025-11-27 09:27:19",
            "published_at_title": "3 September 2025",
            "type": "image",
            "post_type": "post",
            "vote_start": "",
            "vote_end": "",
            "total_vote": "",
            "is_post_owner": true,
            "votes": [],
            "my_vote_id": 0,
            "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=23238"
          },
          {
            "id": 23237,
            "title": "ini adalah title untuk postingan di jam 09:17",
            "description": "ini adalah isi content untuk postingan pada jam tersebut",
            "textContent": "ini adalah isi content untuk postingan pada jam tersebut",
            "image": "https://mimate-api.otesuto.com/upload/files/8b22ea20-cf9f-4e07-a3b3-ebadcc9f4b21",
            "reaction": [
              {
                "reaction": "open_mouth",
                "count": 1,
                "reacted": false
              }
            ],
            "tags": [],
            "repliesCount": 1,
            "reactionCount": 1,
            "member": {
              "id": 79916,
              "name": "User_79916",
              "email": "crm.cx@mitsubishi-motors.co.id",
              "profilePictureUrl": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1752761986929-66210768-3a86-44a7-b67a-83be974d2040-c95a165dcdd82a77.jpg",
              "is_dealer": false
            },
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
              "postsCount": 21430,
              "membersCount": 92303
            },
            "medias": [
              {
                "id": 29801,
                "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1756865884463-d8d35984-cf3c-4422-aaf2-a6459ef75fbf-f1 logo.png",
                "type": "Image",
                "thumbnail": {
                  "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1756865884463-d8d35984-cf3c-4422-aaf2-a6459ef75fbf-f1 logo.png",
                  "width": 3840,
                  "height": 2160,
                  "type": "Image"
                }
              }
            ],
            "mmidUserId": 1086558,
            "totalRepliesCount": 1,
            "created_at": "2025-09-03 18:18:41",
            "published_at": "2025-11-26 15:02:08",
            "published_at_title": "3 September 2025",
            "type": "image",
            "post_type": "post",
            "vote_start": "",
            "vote_end": "",
            "total_vote": "",
            "is_post_owner": true,
            "votes": [],
            "my_vote_id": 0,
            "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=23237"
          },
          {
            "id": 23236,
            "title": "ini adalah titlenya loh",
            "description": "ini berisi konten yang akan di share kapada warga mimate",
            "textContent": "ini berisi konten yang akan di share kapada warga mimate",
            "image": "https://mimate-api.otesuto.com/upload/files/17fc5aec-0776-4364-8a23-b72bd9b437db",
            "reaction": [
              {
                "reaction": "smile",
                "count": 1,
                "reacted": false
              }
            ],
            "tags": [],
            "repliesCount": 0,
            "reactionCount": 1,
            "member": {
              "id": 79916,
              "name": "User_79916",
              "email": "crm.cx@mitsubishi-motors.co.id",
              "profilePictureUrl": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1752761986929-66210768-3a86-44a7-b67a-83be974d2040-c95a165dcdd82a77.jpg",
              "is_dealer": false
            },
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
              "postsCount": 21430,
              "membersCount": 92303
            },
            "medias": [
              {
                "id": 29800,
                "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1756799923774-c914584b-0621-46c5-8901-7c2936e41c37-Frame 29091.png",
                "type": "Image",
                "thumbnail": {
                  "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1756799923774-c914584b-0621-46c5-8901-7c2936e41c37-Frame 29091.png",
                  "width": 391,
                  "height": 895,
                  "type": "Image"
                }
              }
            ],
            "mmidUserId": 1086558,
            "totalRepliesCount": 0,
            "created_at": "2025-09-02 23:59:26",
            "published_at": "2025-11-27 14:40:14",
            "published_at_title": "2 September 2025",
            "type": "image",
            "post_type": "post",
            "vote_start": "",
            "vote_end": "",
            "total_vote": "",
            "is_post_owner": true,
            "votes": [],
            "my_vote_id": 0,
            "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=23236"
          },
          {
            "id": 23235,
            "title": "ini adalah title post",
            "description": "ini adalah content post",
            "textContent": "ini adalah content post",
            "image": "https://mimate-api.otesuto.com/upload/files/e078eef8-7942-42b8-aeec-8be6f24dd77a",
            "reaction": [
              {
                "reaction": "heart",
                "count": 1,
                "reacted": false
              }
            ],
            "tags": [],
            "repliesCount": 1,
            "reactionCount": 1,
            "member": {
              "id": 79916,
              "name": "User_79916",
              "email": "crm.cx@mitsubishi-motors.co.id",
              "profilePictureUrl": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1752761986929-66210768-3a86-44a7-b67a-83be974d2040-c95a165dcdd82a77.jpg",
              "is_dealer": false
            },
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
              "postsCount": 21430,
              "membersCount": 92303
            },
            "medias": [
              {
                "id": 29799,
                "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1756799170834-8beead58-4337-485a-91c6-47b6c15594a6-1bce8009-e57e-4ce6-8b4d-0aec56a67a4e.jpg",
                "type": "Image",
                "thumbnail": {
                  "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1756799170834-8beead58-4337-485a-91c6-47b6c15594a6-1bce8009-e57e-4ce6-8b4d-0aec56a67a4e.jpg",
                  "width": 1179,
                  "height": 786,
                  "type": "Image"
                }
              }
            ],
            "mmidUserId": 1086558,
            "totalRepliesCount": 1,
            "created_at": "2025-09-02 23:46:24",
            "published_at": "2025-11-27 09:26:47",
            "published_at_title": "2 September 2025",
            "type": "image",
            "post_type": "post",
            "vote_start": "",
            "vote_end": "",
            "total_vote": "",
            "is_post_owner": true,
            "votes": [],
            "my_vote_id": 0,
            "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=23235"
          },
          {
            "id": 23234,
            "title": "ini adalah title konten",
            "description": "ini adalah isi konten",
            "textContent": "ini adalah isi konten",
            "image": "https://mimate-api.otesuto.com/upload/files/851af12b-0075-4745-95da-00f3b6eb9b29",
            "reaction": [
              {
                "reaction": "cry",
                "count": 1,
                "reacted": false
              }
            ],
            "tags": [],
            "repliesCount": 0,
            "reactionCount": 1,
            "member": {
              "id": 79916,
              "name": "User_79916",
              "email": "crm.cx@mitsubishi-motors.co.id",
              "profilePictureUrl": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1752761986929-66210768-3a86-44a7-b67a-83be974d2040-c95a165dcdd82a77.jpg",
              "is_dealer": false
            },
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
              "postsCount": 21430,
              "membersCount": 92303
            },
            "medias": [
              {
                "id": 29798,
                "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1756795924701-db66334a-5172-4232-ab11-0f8e70e918a3-Daniel_Ricciardo.jpg",
                "type": "Image",
                "thumbnail": {
                  "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1756795924701-db66334a-5172-4232-ab11-0f8e70e918a3-Daniel_Ricciardo.jpg",
                  "width": 1280,
                  "height": 720,
                  "type": "Image"
                }
              }
            ],
            "mmidUserId": 1086558,
            "totalRepliesCount": 0,
            "created_at": "2025-09-02 23:43:38",
            "published_at": "2025-11-26 15:02:37",
            "published_at_title": "2 September 2025",
            "type": "image",
            "post_type": "post",
            "vote_start": "",
            "vote_end": "",
            "total_vote": "",
            "is_post_owner": true,
            "votes": [],
            "my_vote_id": 0,
            "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=23234"
          },
          {
            "id": 23233,
            "title": "TES 3",
            "description": "halo kawan",
            "textContent": "halo kawan",
            "image": "https://mimate-api.otesuto.com/upload/files/71f5e796-8cff-4dd8-bd81-cc99e52c936b",
            "reaction": [
              {
                "reaction": "tada",
                "count": 1,
                "reacted": false
              }
            ],
            "tags": [],
            "repliesCount": 0,
            "reactionCount": 1,
            "member": {
              "id": 79916,
              "name": "User_79916",
              "email": "crm.cx@mitsubishi-motors.co.id",
              "profilePictureUrl": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1752761986929-66210768-3a86-44a7-b67a-83be974d2040-c95a165dcdd82a77.jpg",
              "is_dealer": false
            },
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
              "postsCount": 21430,
              "membersCount": 92303
            },
            "medias": [
              {
                "id": 29797,
                "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1756795204949-9296d1c9-525b-465b-a945-284e211ffff8-Logo mimate.jpg",
                "type": "Image",
                "thumbnail": {
                  "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1756795204949-9296d1c9-525b-465b-a945-284e211ffff8-Logo mimate.jpg",
                  "width": 2045,
                  "height": 2045,
                  "type": "Image"
                }
              }
            ],
            "mmidUserId": 1086558,
            "totalRepliesCount": 0,
            "created_at": "2025-09-02 22:40:31",
            "published_at": "2025-11-26 15:01:46",
            "published_at_title": "2 September 2025",
            "type": "image",
            "post_type": "post",
            "vote_start": "",
            "vote_end": "",
            "total_vote": "",
            "is_post_owner": true,
            "votes": [],
            "my_vote_id": 0,
            "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=23233"
          },
          {
            "id": 23232,
            "title": "tes 2",
            "description": "konten apa aja",
            "textContent": "konten apa aja",
            "image": "https://mimate-api.otesuto.com/upload/files/f0bb0e1c-a310-46af-9e67-399bc89b793b",
            "reaction": [
              {
                "reaction": "cry",
                "count": 1,
                "reacted": false
              }
            ],
            "tags": [],
            "repliesCount": 0,
            "reactionCount": 1,
            "member": {
              "id": 79916,
              "name": "User_79916",
              "email": "crm.cx@mitsubishi-motors.co.id",
              "profilePictureUrl": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1752761986929-66210768-3a86-44a7-b67a-83be974d2040-c95a165dcdd82a77.jpg",
              "is_dealer": false
            },
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
              "postsCount": 21430,
              "membersCount": 92303
            },
            "medias": [
              {
                "id": 29796,
                "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1756794780330-c5db728d-359e-4011-b88d-b88ee0873428-Infografis Duta Mitsubishi (Tanpa Sales)- Part 3 (3).png",
                "type": "Image",
                "thumbnail": {
                  "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1756794780330-c5db728d-359e-4011-b88d-b88ee0873428-Infografis Duta Mitsubishi (Tanpa Sales)- Part 3 (3).png",
                  "width": 1080,
                  "height": 165,
                  "type": "Image"
                }
              }
            ],
            "mmidUserId": 1086558,
            "totalRepliesCount": 0,
            "created_at": "2025-09-02 22:34:57",
            "published_at": "2025-11-26 15:02:01",
            "published_at_title": "2 September 2025",
            "type": "image",
            "post_type": "post",
            "vote_start": "",
            "vote_end": "",
            "total_vote": "",
            "is_post_owner": true,
            "votes": [],
            "my_vote_id": 0,
            "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=23232"
          },
          {
            "id": 23231,
            "title": "Test push notif",
            "description": "wake me up, when september ends",
            "textContent": "wake me up, when september ends",
            "image": "https://mimate-api.otesuto.com/upload/files/f507f3a6-ee75-4d85-b2d2-cd917dfda8b7",
            "reaction": [
              {
                "reaction": "cry",
                "count": 1,
                "reacted": false
              }
            ],
            "tags": [],
            "repliesCount": 0,
            "reactionCount": 1,
            "member": {
              "id": 79916,
              "name": "User_79916",
              "email": "crm.cx@mitsubishi-motors.co.id",
              "profilePictureUrl": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1752761986929-66210768-3a86-44a7-b67a-83be974d2040-c95a165dcdd82a77.jpg",
              "is_dealer": false
            },
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
              "postsCount": 21430,
              "membersCount": 92303
            },
            "medias": [
              {
                "id": 29795,
                "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1756794633867-e38807fd-b27c-4f3d-80fc-1d90d9b15b5c-Logo mimate.jpg",
                "type": "Image",
                "thumbnail": {
                  "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1756794633867-e38807fd-b27c-4f3d-80fc-1d90d9b15b5c-Logo mimate.jpg",
                  "width": 2045,
                  "height": 2045,
                  "type": "Image"
                }
              }
            ],
            "mmidUserId": 1086558,
            "totalRepliesCount": 0,
            "created_at": "2025-09-02 22:31:35",
            "published_at": "2025-11-26 15:03:35",
            "published_at_title": "2 September 2025",
            "type": "image",
            "post_type": "post",
            "vote_start": "",
            "vote_end": "",
            "total_vote": "",
            "is_post_owner": true,
            "votes": [],
            "my_vote_id": 0,
            "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=23231"
          },
          {
            "id": 23230,
            "title": "testing",
            "description": "cuma cobain",
            "textContent": "cuma cobain",
            "image": "https://mimate-api.otesuto.com/upload/files/37b4db90-5224-4666-8f6d-d171353e1290",
            "reaction": [
              {
                "reaction": "tada",
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
            "repliesCount": 0,
            "reactionCount": 2,
            "member": {
              "id": 79916,
              "name": "User_79916",
              "email": "crm.cx@mitsubishi-motors.co.id",
              "profilePictureUrl": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1752761986929-66210768-3a86-44a7-b67a-83be974d2040-c95a165dcdd82a77.jpg",
              "is_dealer": false
            },
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
              "postsCount": 21430,
              "membersCount": 92303
            },
            "medias": [
              {
                "id": 29793,
                "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1756451221713-9d27f3e5-15d7-476e-a4b1-5e835534457d-Infografis Duta Mitsubishi (Tanpa Sales)- Part 3 (2).png",
                "type": "Image",
                "thumbnail": {
                  "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1756451221713-9d27f3e5-15d7-476e-a4b1-5e835534457d-Infografis Duta Mitsubishi (Tanpa Sales)- Part 3 (2).png",
                  "width": 2160,
                  "height": 428,
                  "type": "Image"
                }
              }
            ],
            "mmidUserId": 1086558,
            "totalRepliesCount": 0,
            "created_at": "2025-08-29 23:07:17",
            "published_at": "2025-11-27 09:26:58",
            "published_at_title": "29 August 2025",
            "type": "image",
            "post_type": "post",
            "vote_start": "",
            "vote_end": "",
            "total_vote": "",
            "is_post_owner": true,
            "votes": [],
            "my_vote_id": 0,
            "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=23230"
          },
          {
            "id": 23229,
            "title": "test push notif",
            "description": "benar push notif doang kok",
            "textContent": "benar push notif doang kok",
            "image": "https://mimate-api.otesuto.com/upload/files/942ae409-781e-45e8-84e8-e59aafbb7f41",
            "reaction": [
              {
                "reaction": "tada",
                "count": 1,
                "reacted": false
              }
            ],
            "tags": [],
            "repliesCount": 0,
            "reactionCount": 1,
            "member": {
              "id": 79916,
              "name": "User_79916",
              "email": "crm.cx@mitsubishi-motors.co.id",
              "profilePictureUrl": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1752761986929-66210768-3a86-44a7-b67a-83be974d2040-c95a165dcdd82a77.jpg",
              "is_dealer": false
            },
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
              "postsCount": 21430,
              "membersCount": 92303
            },
            "medias": [
              {
                "id": 29792,
                "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1756442976248-cb0fdb13-ef4a-42f1-a64e-8e1d5d5e9ce1-image (2).png",
                "type": "Image",
                "thumbnail": {
                  "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1756442976248-cb0fdb13-ef4a-42f1-a64e-8e1d5d5e9ce1-image (2).png",
                  "width": 478,
                  "height": 1037,
                  "type": "Image"
                }
              }
            ],
            "mmidUserId": 1086558,
            "totalRepliesCount": 0,
            "created_at": "2025-08-29 20:52:05",
            "published_at": "2025-11-26 15:03:19",
            "published_at_title": "29 August 2025",
            "type": "image",
            "post_type": "post",
            "vote_start": "",
            "vote_end": "",
            "total_vote": "",
            "is_post_owner": true,
            "votes": [],
            "my_vote_id": 0,
            "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=23229"
          },
          {
            "id": 23228,
            "title": "try to create post",
            "description": "hello world, lorem ipusm",
            "textContent": "hello world, lorem ipusm",
            "image": "",
            "reaction": [],
            "tags": [],
            "repliesCount": 0,
            "reactionCount": 0,
            "member": {
              "id": 79916,
              "name": "User_79916",
              "email": "crm.cx@mitsubishi-motors.co.id",
              "profilePictureUrl": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1752761986929-66210768-3a86-44a7-b67a-83be974d2040-c95a165dcdd82a77.jpg",
              "is_dealer": false
            },
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
              "postsCount": 21430,
              "membersCount": 92303
            },
            "medias": [],
            "mmidUserId": 1086558,
            "totalRepliesCount": 0,
            "created_at": "2025-08-27 21:38:28",
            "published_at": "2025-11-28 15:54:25",
            "published_at_title": "27 August 2025",
            "type": "image",
            "post_type": "post",
            "vote_start": "",
            "vote_end": "",
            "total_vote": "",
            "is_post_owner": true,
            "votes": [],
            "my_vote_id": 0,
            "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=23228"
          },
          {
            "id": 23149,
            "title": "? Warga, udah cobain serunya MiMate 2.0 belum?",
            "description": "Biar gak ketinggalan, yuk mulai jelajahi fitur-fitur barunya yang bikin makin betah di sini! ?\n\n? Follow Warga favoritmu, biar kamu selalu update dengan postingan seru mereka!\n? Ikutan quiz & pantau leaderboard buat dapetin hadiah jutaan rupiah!\n? Cek tab Trending, biar kamu gak kudet sama topik yang lagi rame dibahas.\n? Butuh info soal Mitsubishi? Pak RT siap bantu lewat konten eksklusif dan Q&A yang cuma ada di MiMate!\n\n✨ Gini caranya nikmatin MiMate 2.0 biar gak kelewatan keseruannya!\n\nTunggu apa lagi? Gas ikutin keseruannya bareng Warga MiMate lainnya ?❤️\n\n#EmpoweringEveryJourney #TemanSejalan #DiMiMateAja\n\n",
            "textContent": "Biar gak ketinggalan, yuk mulai jelajahi fitur-fitur barunya yang bikin makin betah di sini! ?\n\n? Follow Warga favoritmu, biar kamu selalu update dengan postingan seru mereka!\n? Ikutan quiz & pantau leaderboard buat dapetin hadiah jutaan rupiah!\n? Cek tab Trending, biar kamu gak kudet sama topik yang lagi rame dibahas.\n? Butuh info soal Mitsubishi? Pak RT siap bantu lewat konten eksklusif dan Q&A yang cuma ada di MiMate!\n\n✨ Gini caranya nikmatin MiMate 2.0 biar gak kelewatan keseruannya!\n\nTunggu apa lagi? Gas ikutin keseruannya bareng Warga MiMate lainnya ?❤️\n\n#EmpoweringEveryJourney #TemanSejalan #DiMiMateAja\n\n",
            "image": "https://mimate-api.mymitsubishiapps.com/upload/files/6690a4ed-8558-496a-853b-10f23e0316d7",
            "reaction": [
              {
                "reaction": "+1",
                "count": 21,
                "reacted": false
              },
              {
                "reaction": "heart",
                "count": 7,
                "reacted": false
              },
              {
                "reaction": "tada",
                "count": 2,
                "reacted": false
              }
            ],
            "tags": [
              {
                "slug": "empoweringeveryjourney",
                "id": 2619,
                "title": "#EmpoweringEveryJourney"
              },
              {
                "slug": "temansejalan",
                "id": 3,
                "title": "#temansejalan"
              },
              {
                "slug": "dimimateaja",
                "id": 876,
                "title": "DiMiMateAja"
              }
            ],
            "repliesCount": 8,
            "reactionCount": 30,
            "member": {
              "id": 79916,
              "name": "User_79916",
              "email": "crm.cx@mitsubishi-motors.co.id",
              "profilePictureUrl": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1752761986929-66210768-3a86-44a7-b67a-83be974d2040-c95a165dcdd82a77.jpg",
              "is_dealer": false
            },
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
              "postsCount": 21430,
              "membersCount": 92303
            },
            "medias": [
              {
                "id": 29683,
                "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1754979177154-357797fb-fee3-499d-8251-5d5200df6750-1754979170411_1000127072.jpg.jpg",
                "type": "Image",
                "thumbnail": {
                  "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1754979177154-357797fb-fee3-499d-8251-5d5200df6750-1754979170411_1000127072.jpg.jpg",
                  "width": 1080,
                  "height": 1350,
                  "type": "Image"
                }
              },
              {
                "id": 29684,
                "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1754979179096-4f21dbef-c4c0-4bad-b3c9-c588ede3507b-1754979170584_1000127073.jpg.jpg",
                "type": "Image",
                "thumbnail": {
                  "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1754979179096-4f21dbef-c4c0-4bad-b3c9-c588ede3507b-1754979170584_1000127073.jpg.jpg",
                  "width": 1080,
                  "height": 1350,
                  "type": "Image"
                }
              },
              {
                "id": 29685,
                "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1754979179932-45b09532-676c-4ac8-b0bc-fdecdacab971-1754979170707_1000127074.jpg.jpg",
                "type": "Image",
                "thumbnail": {
                  "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1754979179932-45b09532-676c-4ac8-b0bc-fdecdacab971-1754979170707_1000127074.jpg.jpg",
                  "width": 1080,
                  "height": 1350,
                  "type": "Image"
                }
              },
              {
                "id": 29686,
                "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1754979180520-9dac3713-6329-441e-abbb-26ec50b57980-1754979170839_1000127075.jpg.jpg",
                "type": "Image",
                "thumbnail": {
                  "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1754979180520-9dac3713-6329-441e-abbb-26ec50b57980-1754979170839_1000127075.jpg.jpg",
                  "width": 1080,
                  "height": 1350,
                  "type": "Image"
                }
              }
            ],
            "mmidUserId": 1086558,
            "totalRepliesCount": 8,
            "created_at": "2025-08-12 14:08:07",
            "published_at": "2026-02-13 10:22:00",
            "published_at_title": "12 August 2025",
            "type": "image",
            "post_type": "post",
            "vote_start": "",
            "vote_end": "",
            "total_vote": "",
            "is_post_owner": true,
            "votes": [],
            "my_vote_id": 0,
            "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=23149"
          }
        ]
      }
    }
  })
  @ApiResponse({
    status: 404, description: 'Sample error message', example: {
      "success": false,
      "alert": {
        "code": 404,
        "message": "Not Found"
      },
      "data": null
    }
  })
  async memberPosts(@Query() param: GetPostsDto, @Req() request): Promise<GlobalResponse<PostCollectionResponse>> {
    const { limit, after, order } = param;
    const { id: userId } = request.userData

    let response = await this.postService.collectPosts('member', limit, after, userId, order, userId)
    return {
      message: "Success get data",
      data: response
    }
  }

  // Detail Post
  @Get(':id')
  @ApiOperation({ summary: 'Detail Post' })
  @ApiResponse({
    status: 200, description: "Success result", example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success get data"
      },
      "data": {
        "id": 1,
        "title": "Xpander Cross Manual Jozz mantafff",
        "description": "",
        "textContent": "",
        "image": "https://mimate-api.mymitsubishiapps.com/upload/files/IdRJx7xlIg6wcepskB2yh",
        "reaction": [
          {
            "reaction": "+1",
            "count": 4,
            "reacted": false
          },
          {
            "reaction": "heart",
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
          }
        ],
        "repliesCount": 6,
        "reactionCount": 5,
        "member": {
          "id": 1876,
          "name": "Rusli Dg Nai",
          "email": "dhaenknhai@gmail.com",
          "profilePictureUrl": "",
          "is_dealer": false
        },
        "space": {
          "id": 7,
          "name": "Warga MiMate",
          "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!",
          "postsCount": 21430,
          "membersCount": 92303
        },
        "medias": [
          {
            "id": 1,
            "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1750664781683-539bde72-4848-4a7a-ba0b-98e428cca238-IdRJx7xlIg6wcepskB2yh.jpg",
            "width": 3072,
            "height": 4096,
            "type": "Image",
            "thumbnail": {
              "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1750664781683-539bde72-4848-4a7a-ba0b-98e428cca238-IdRJx7xlIg6wcepskB2yh.jpg",
              "width": 3072,
              "height": 4096,
              "type": "Image"
            }
          }
        ],
        "mmidUserId": 1980291,
        "totalRepliesCount": 6,
        "created_at": "2025-02-24 22:19:55",
        "published_at": "2026-02-26 12:07:41",
        "published_at_title": "24 February 2025",
        "type": "image",
        "post_type": "",
        "votes": [],
        "my_vote_id": 0,
        "is_post_owner": false,
        "vote_start": "",
        "vote_end": "",
        "total_vote": "",
        "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=1"
      }
    }
  })
  @ApiResponse({
    status: 404, description: 'Sample error message', example: {
      "success": false,
      "alert": {
        "code": 404,
        "message": "Not Found"
      },
      "data": null
    }
  })
  async detailPost(@Param() param: DetailPostDto, @Req() request): Promise<GlobalResponse<PostInterface>> {
    const { id } = param

    const { id: userId } = request.userData

    let post = await this.postService.detailPost(id, userId)
    // save activity
    await this.activityService.createActivity({
      userId: userId,
      action: 'view',
      postId: id,
      targetType: 'post',
      hit_from: 'detail_page'
    })
    return {
      message: "Success get data",
      data: post
    }
  }


  // create post
  @Post('create')
  @ApiOperation({ summary: 'Create Post' })
  @ApiResponse({
    status: 201, description: "Success result", example: {
      "success": true,
      "alert": {
        "code": 201,
        "message": "Success create data"
      },
      "data": {
        "id": 23268,
        "title": "Ada baret di mobil? Panik nggak tuh, Warga?",
        "description": "Mobil kesayangan tergores? Jangan panik! Temukan cara mudah dan cepat untuk menghilangkan baret di mobil tanpa harus ke bengkel.",
        "textContent": "Mobil kesayangan tergores? Jangan panik! Temukan cara mudah dan cepat untuk menghilangkan baret di mobil tanpa harus ke bengkel.",
        "image": "https://mimate-api.mymitsubishiapps.com/upload/files/r1HOQo26ZxzGUk9OkxRMa",
        "reaction": [],
        "tags": [],
        "repliesCount": 0,
        "reactionCount": 0,
        "member": {
          "id": 79916,
          "name": "User_79916",
          "email": "crm.cx@mitsubishi-motors.co.id",
          "profilePictureUrl": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1752761986929-66210768-3a86-44a7-b67a-83be974d2040-c95a165dcdd82a77.jpg",
          "is_dealer": false
        },
        "space": {
          "id": 2,
          "name": "Ngobrol Santai",
          "description": "",
          "postsCount": 80,
          "membersCount": 32627
        },
        "medias": [
          {
            "id": 5122,
            "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1750666592487-698cb308-be57-4bd9-8059-b9373dbaa950-r1HOQo26ZxzGUk9OkxRMa.jpg",
            "width": 1600,
            "height": 1200,
            "type": "Image",
            "thumbnail": {
              "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1750666592487-698cb308-be57-4bd9-8059-b9373dbaa950-r1HOQo26ZxzGUk9OkxRMa.jpg",
              "width": 1600,
              "height": 1200,
              "type": "Image"
            }
          },
          {
            "id": 5123,
            "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1750666592787-b71e6ea1-f838-4042-b910-c0774934f828-CJQMuB5B1baqXqXxgIQkv.jpg",
            "width": 1600,
            "height": 1200,
            "type": "Image",
            "thumbnail": {
              "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1750666592787-b71e6ea1-f838-4042-b910-c0774934f828-CJQMuB5B1baqXqXxgIQkv.jpg",
              "width": 1600,
              "height": 1200,
              "type": "Image"
            }
          },
          {
            "id": 5124,
            "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1750666593056-144e8308-35ce-416c-b0bf-be7e7e1065b7-NTKeeu34R9sOeK0CxLX6D.jpg",
            "width": 3024,
            "height": 4032,
            "type": "Image",
            "thumbnail": {
              "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1750666593056-144e8308-35ce-416c-b0bf-be7e7e1065b7-NTKeeu34R9sOeK0CxLX6D.jpg",
              "width": 3024,
              "height": 4032,
              "type": "Image"
            }
          }
        ],
        "mmidUserId": 1086558,
        "totalRepliesCount": 0,
        "created_at": "2026-02-26 12:52:15",
        "published_at": "2026-02-26 12:52:15",
        "published_at_title": "just now",
        "type": "image",
        "post_type": "post",
        "votes": [],
        "my_vote_id": 0,
        "is_post_owner": true,
        "vote_start": "2025-02-01 00:00:00",
        "vote_end": "2025-02-28 23:59:59",
        "total_vote": "",
        "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=23268"
      }
    }
  })
  @ApiResponse({
    status: 404, description: 'Sample error message', example: {
      "success": false,
      "alert": {
        "code": 404,
        "message": "Not Found"
      },
      "data": null
    }
  })
  @UseGuards(CmsMembersGuard)
  async createPost(@Body() param: CreatePostDto, @Req() request): Promise<GlobalResponse<PostInterface>> {

    const { id: userId, member_verified, name } = request.userData

    let memberExceptSelf = []

    let notifTitle = param.notifTitle
    let notifMessage = param.notifMessage


    // if exist notif title and message
    if (param.notifTitle && param.notifMessage) {
      // unset notif title and message
      delete param.notifTitle
      delete param.notifMessage
    }

    let response = await this.postService.createPost(param, userId, userId, true)

    if (param.post_type === PostType.Vote && param.votes?.length) {
      const createdVotes = await this.voteService.createVotesForPost(response.id, param.votes);
      response.votes = createdVotes.map((v) => ({ id: v.id, vote: v.vote }));
    }

    // nanti nyalakan kalau sudah fix
    if (member_verified && param.isNotification) {
      // get member except self
      memberExceptSelf = await this.postService.getMemberExceptSelf(userId)

      // send add job to queue
      for (let i = 0; i < memberExceptSelf.length; i++) {

        let datasId = memberExceptSelf[i].map(item => item.userId)

        // write to file
        // fs.writeFileSync('memberGroup.json', JSON.stringify(datasId, null, 2))    


        // send add job to queue
        await this.queueService.addJob('send-notification', {
          type: 'post-verified-member',
          send_to: datasId,
          actor_name: name,
          title: notifTitle,
          message: notifMessage,
          post_id: response.id,
          post_category: response.type
        })
      }

      //   // send add job to queue
      //   await this.queueService.addJob('send-notification', {
      //     type: 'post-verified-member',
      //     send_to: datasId,
      //     actor_name: name,
      //     title: notifTitle,
      //     message: notifMessage,
      //     post_id: response.id,
      //     post_category: response.type
      //   })

      // }

    }

    // save activity
    await this.activityService.createActivity({
      userId: userId,
      action: 'create',
      postId: response.id,
      targetType: 'post'
    })

    /*

    // get follower
    let follower = await this.profileService.getFollowers(userId)
    let mmidUser = []

    if(follower.length > 0){
      // collect mmid user from follower
      mmidUser = follower.map(item => item.follower.userId)

      // send add job to queue
      await this.queueService.addJob('send-notification', {
        type: 'post-notification-follower',
        send_to: mmidUser,
        actor_name: response.member.name
      })  
    }

    */

    /*
    // get member on  space who activate notification
    let member = await this.postService.memberOnNotification(response.space.id)
    // comapre mmidUser with memberActiveNotification and get the difference
    let memberActiveNotification = member.filter(item => !mmidUser.includes(item.member.userId))

    if(memberActiveNotification.length > 0){
      let memberNotification = memberActiveNotification.map(item => item.member.userId)
 
      // send add job to queue
      await this.queueService.addJob('send-notification', {
        type: 'post-notification-space',
          send_to: memberNotification,
          actor_name: response.member.name,
          space_name: response.space.name
      })
    }
    */

    // send post to MMID point
    await this.postService.sendPointToMMID(response.id);
    return {
      message: "Success create data",
      data: response
    }
  }

  // debug sendPointToMMID
  @Get('send-point-to-mmid/:id')
  @ApiOperation({ summary: 'Debug sendPointToMMID' })
  async debugSendPointToMMID(@Param('id') id: number): Promise<GlobalResponse<boolean>> {
    const data = await this.postService.sendPointToMMID(id);
    return { message: 'Success', data: data };
  }

  // update post
  @Post('update/:id')
  @ApiOperation({ summary: 'Update Post' })
  @ApiResponse({
    status: 200, description: "Success result", example: {
      success: true,
      alert: {
        "code": 200,
        "message": "Success create data",
      },
      data: {
        "success": true,
        "message": "Success get data",
        "data": {
          "id": 1,
          "title": "Xpander Cross Manual Jozz mantafff",
          "description": "",
          "textContent": "",
          "image": "https://tribe-s3-production.imgix.net/IdRJx7xlIg6wcepskB2yh?auto=compress,format",
          "reaction": [
            {
              "reaction": "+1",
              "count": 7,
              "reacted": false
            },
            {
              "reaction": "heart",
              "count": 2,
              "reacted": false
            }
          ],
          "tags": [
            {
              "description": null,
              "slug": "mitsubishimotors",
              "id": "R0TffiHgQolFdxIWC2bFg",
              "title": "#mitsubishimotors"
            },
            {
              "description": null,
              "slug": "introduction",
              "id": "2G6x0yhA5D8Q0oXZP34yM",
              "title": "Introduction"
            }
          ],
          "repliesCount": 0,
          "reactionCount": 9,
          "member": {
            "id": 1876,
            "name": "RUSLI DG NAI",
            "email": "dhaenknhai@gmail.com",
            "profilePictureUrl": null,
            "is_dealer": false
          },
          "space": {
            "id": 3,
            "name": "Berita Xforce",
            "description": "Uncover the latest in community support news and discoveries",
            "postsCount": 6,
            "membersCount": 32626
          },
          "medias": [
            {
              "id": 1,
              "url": "https://tribe-s3-production.imgix.net/IdRJx7xlIg6wcepskB2yh?auto=compress,format",
              "thumbnail": {
                "url": "https://tribe-s3-production.imgix.net/IdRJx7xlIg6wcepskB2yh?auto=compress,format",
                "width": 3072,
                "height": 4096,
                "type": "Image"
              },
              "type": "Image"
            }
          ],
          "mmidUserId": 1980291,
          "created_at": "2025-02-24 22:19:55",
          "published_at_title": "1 minute ago",
          "type": "image",
          "post_type": "post",
          "votes": [],
          "is_post_owner": true
        }
      }
    }
  })
  @ApiResponse({
    status: 404, description: 'Sample error message', example: {
      "success": false,
      "alert": {
        "code": 404,
        "message": "Not Found"
      },
      "data": null
    }
  })
  @UseGuards(CmsMembersGuard)
  async updatePost(
    @Param('id') postId: number,
    @Body() param: CreatePostDto,
    @Req() request
  ): Promise<GlobalResponse<PostInterface>> {

    const { id: userId } = request.userData;
    const updatedPost = await this.postService.updatePost(postId, param, userId, userId, true);

    if (param.voteDeleted?.length || param.votes?.length) {
      await this.voteService.updateVotesForPost(
        postId,
        param.votes ?? [],
        param.voteDeleted,
      );
      if (param.votes?.length) {
        const votes = await this.voteService.getVotesByPostId(postId);
        updatedPost.votes = votes;
      }
    }

    // save activity
    await this.activityService.createActivity({
      userId: userId,
      action: 'update',
      postId: postId,
      targetType: 'post'
    })

    // send post to MMID point
    await this.postService.sendPointToMMID(postId);

    return {
      message: 'Post updated successfully',
      data: updatedPost
    };
  }


  // delete post
  @Delete('delete/:id')
  @ApiOperation({ summary: 'Delete Post' })
  @ApiResponse({
    status: 200, description: "Success result", example: {
      success: true,
      alert: {
        code: 200,
        message: "Post deleted successfully",
      },

    }
  })
  @ApiResponse({
    status: 404, description: 'Sample error message', example: {
      "success": false,
      "alert": {
        "code": 404,
        "message": "Not Found"
      },
      "data": null
    }
  })
  async deletePost(
    @Param('id') postId: number,
    @Req() request
  ): Promise<GlobalResponse<Boolean>> {

    const { id: memberId } = request.userData;


    // save activity
    await this.activityService.createActivity({
      userId: memberId,
      action: 'delete',
      postId: postId,
      targetType: 'post'
    })

    const updatedPost = await this.postService.deletePost(postId, memberId);

    return {
      message: 'Post deleted successfully',
      data: updatedPost
    };
  }


  // sync image to image_open_url
  // @Post('sync-image-to-image-open-url')
  // async syncImageToImageOpenUrl():Promise<GlobalResponse<Boolean>> {
  //   const data = await this.postService.syncImageToImageOpenUrl();
  //   return { message: 'Success', data: data };
  // }


  // sync comment count to post
  @Post('sync-comment-count-to-post')
  async syncCommentCountToPost(): Promise<GlobalResponse<Boolean>> {
    const data = await this.postService.syncCommentCountToPost();
    return { message: 'Success', data: data };
  }




  // clean all comment
}
