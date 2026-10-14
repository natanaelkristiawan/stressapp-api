import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBasicAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdminUserListDto } from 'src/admin-user/dtos/admin-user.dto';
import { GlobalResponse } from 'src/interfaces/global.interface';
import { Datatable as DatatableUser } from 'src/admin-user/interfaces/datatable.interface';
import { Datatable as DatatablePost } from 'src/admin-post/interfaces/datatable.interface';
import { Datatable as DatatableSpace } from 'src/admin-space/interfaces/datatable.interface';
import { AdminUserService } from 'src/admin-user/admin-user.service';
import { AdminPostService } from 'src/admin-post/admin-post.service';
import { AdminPostListDto } from 'src/admin-post/dtos/admin-post.dto';
import { CaptureBsiService } from './capture-bsi.service';
import { ReactionListDto } from './dtos/reaction.dto';
import { DatatableReaction } from './interfaces/reaction.interface';
import { CommentListDto } from './dtos/comment.dto';
import { DatatableComment } from './interfaces/comment.interface';
import { AdminSpaceListDto } from 'src/admin-space/dtos/admin-space.dto';
import { AdminSpaceService } from 'src/admin-space/admin-space.service';
import { PostsMostReactionsDto } from './dtos/posts-most-reactions.dto';
import { PostByIdsDto } from './dtos/post-by-ids.dto';

@ApiTags('Capture BSI')
@ApiBasicAuth('basic-auth') 
@Controller('capture-bsi')
export class CaptureBsiController {

    constructor(
        private readonly adminUserService: AdminUserService,
        private readonly adminPostService: AdminPostService,
        private readonly captureBsiService: CaptureBsiService,
        private readonly adminSpaceService: AdminSpaceService
    ){}
    @Get('/member')
    @ApiOperation({ summary: 'Get user list' })
    @ApiResponse({ status: 200, description: 'Success', example: {
        "success": true,
        "alert": {
          "code": 200,
          "message": "Success"
        },
        "data": {
          "items": [
            {
              "id": 170264,
              "userId": 2129442,
              "name": "Agus Suryadi",
              "email": "asuryadi428@gmail.com",
              "createdAt": "2025-10-03T06:01:44.000Z",
              "updatedAt": "2025-10-03T06:01:45.000Z",
              "username": "Agus suryadi",
              "status": "",
              "siteRole": "Member",
              "vehicleList": [],
              "dob": "1970-01-01",
              "gender": "",
              "mimatePoint": 0,
              "posts": 0,
              "comments": 0,
              "likes": 0,
              "shares": 0,
              "quizWinner": 0
            },
            {
              "id": 170260,
              "userId": 2086367,
              "name": "Yudi Ruswahyudi",
              "email": "ruswahyudi0780@gmail.com",
              "createdAt": "2025-10-03T06:01:38.000Z",
              "updatedAt": "2025-10-03T06:02:05.000Z",
              "username": "Yudi Ruswahyudi",
              "status": "",
              "siteRole": "Member",
              "vehicleList": [
                "New Xpander"
              ],
              "dob": "1980-07-14",
              "gender": "male",
              "mimatePoint": 0,
              "posts": 0,
              "comments": 0,
              "likes": 0,
              "shares": 0,
              "quizWinner": 0
            },
            {
              "id": 170257,
              "userId": 425600,
              "name": "Suci Dian Sari",
              "email": "sucidiansari1985@gmail.com",
              "createdAt": "2025-10-03T06:01:17.000Z",
              "updatedAt": "2025-10-03T06:01:35.000Z",
              "username": "Suci dian sari",
              "status": "",
              "siteRole": "Member",
              "vehicleList": [
                "New Xpander"
              ],
              "dob": "1985-06-14",
              "gender": "female",
              "mimatePoint": 0,
              "posts": 0,
              "comments": 0,
              "likes": 0,
              "shares": 0,
              "quizWinner": 0
            },
            {
              "id": 170216,
              "userId": 93667,
              "name": "Bukit Lim",
              "email": "bukit.lim@gmail.com",
              "createdAt": "2025-10-03T05:07:03.000Z",
              "updatedAt": "2025-10-03T05:11:57.000Z",
              "username": "Bukit Lim",
              "status": "",
              "siteRole": "Member",
              "vehicleList": [
                "Xpander"
              ],
              "dob": "1973-12-05",
              "gender": "male",
              "mimatePoint": 0,
              "posts": 0,
              "comments": 0,
              "likes": 0,
              "shares": 0,
              "quizWinner": 0
            },
            {
              "id": 170215,
              "userId": 2193008,
              "name": "User_170215",
              "email": "",
              "createdAt": "2025-10-03T05:06:39.000Z",
              "updatedAt": "2025-10-03T05:11:10.000Z",
              "username": "",
              "status": "",
              "siteRole": "Member",
              "vehicleList": [],
              "dob": "1899-11-30",
              "gender": "",
              "mimatePoint": 0,
              "posts": 0,
              "comments": 0,
              "likes": 0,
              "shares": 0,
              "quizWinner": 0
            },
            {
              "id": 170212,
              "userId": 2193007,
              "name": "Gilang",
              "email": "",
              "createdAt": "2025-10-03T04:52:06.000Z",
              "updatedAt": "2025-10-03T04:53:33.000Z",
              "username": "gilang",
              "status": "",
              "siteRole": "Member",
              "vehicleList": [],
              "dob": "1899-11-30",
              "gender": "",
              "mimatePoint": 0,
              "posts": 0,
              "comments": 0,
              "likes": 0,
              "shares": 0,
              "quizWinner": 0
            },
            {
              "id": 170197,
              "userId": 1899529,
              "name": "Djoko Susilo",
              "email": "salsabilas132@gmail.com",
              "createdAt": "2025-10-03T04:40:53.000Z",
              "updatedAt": "2025-10-03T04:40:53.000Z",
              "username": "Djoko Susilo",
              "status": "",
              "siteRole": "Member",
              "vehicleList": [
                "New Xpander"
              ],
              "dob": "1968-10-24",
              "gender": "male",
              "mimatePoint": 0,
              "posts": 0,
              "comments": 0,
              "likes": 0,
              "shares": 0,
              "quizWinner": 0
            },
            {
              "id": 170191,
              "userId": 2193001,
              "name": "Fitri Jamaliah Fitriani",
              "email": "",
              "createdAt": "2025-10-03T04:27:49.000Z",
              "updatedAt": "2025-10-03T04:29:00.000Z",
              "username": "FITRI JAMALIAH FITRIANI",
              "status": "",
              "siteRole": "Member",
              "vehicleList": [],
              "dob": "1899-11-30",
              "gender": "",
              "mimatePoint": 0,
              "posts": 0,
              "comments": 0,
              "likes": 0,
              "shares": 0,
              "quizWinner": 0
            },
            {
              "id": 170189,
              "userId": 2193000,
              "name": "Cheryl Valerie",
              "email": "cherylvalerie56@gmail.com",
              "createdAt": "2025-10-03T04:21:59.000Z",
              "updatedAt": "2025-10-03T04:22:10.000Z",
              "username": "Cheryl Valerie",
              "status": "",
              "siteRole": "Member",
              "vehicleList": [],
              "dob": "1970-01-01",
              "gender": "",
              "mimatePoint": 0,
              "posts": 0,
              "comments": 0,
              "likes": 0,
              "shares": 0,
              "quizWinner": 0
            },
            {
              "id": 170185,
              "userId": 2192998,
              "name": "Yulianti",
              "email": "farahnisrina@icloud.com",
              "createdAt": "2025-10-03T04:29:12.000Z",
              "updatedAt": "2025-10-03T04:33:16.000Z",
              "username": "Yulianti",
              "status": "",
              "siteRole": "Member",
              "vehicleList": [],
              "dob": "1969-07-10",
              "gender": "female",
              "mimatePoint": 0,
              "posts": 0,
              "comments": 0,
              "likes": 0,
              "shares": 0,
              "quizWinner": 0
            }
          ],
          "recordsTotal": 128491,
          "recordsFiltered": 128491
        }
      } })
    async getUserList(@Query() adminUserListDto: AdminUserListDto): Promise<GlobalResponse<DatatableUser>> {
        const data = await this.adminUserService.getUserList(adminUserListDto);
        return {
            message: 'Success',
            data: data
        };
    }


    @Get('/post')
    @ApiOperation({ summary: 'Get post list' })
    @ApiResponse({ status: 200, description: 'Success', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success"
      },
      "data": {
        "items": [
          {
            "id": 24266,
            "backup_member_id": 170181,
            "backup_space_id": 7,
            "title": "destinator",
            "description": "the best",
            "image": "https://mimate-api.mymitsubishiapps.com/upload/files/f3f9a648-6701-44bc-b2d0-51a157290e16",
            "status": "PUBLISHED",
            "type": "image",
            "reactionsCount": 0,
            "totalRepliesCount": 0,
            "created_at": "2025-10-03T05:35:16.000Z",
            "updated_at": "2025-10-03T05:35:21.000Z",
            "published_at": "2025-10-03T05:35:16.000Z",
            "deleted_at": "",
            "isHidden": false,
            "viewsCount": 1,
            "space": {
              "id": 7,
              "name": "Warga MiMate",
              "description": "Temukan beragam informasi menarik seputar Mitsubishi Motors di sini!"
            },
            "author": {
              "id": 170181,
              "name": "Lani Puspita",
              "email": "lanipuspita11@gmail.com",
              "profilePictureUrl": "",
              "userId": 2192997
            }
          }
        ],
        "recordsTotal": 23969,
        "recordsFiltered": 23969
      }
    }})
    async getPostList(@Query() adminPostListDto: AdminPostListDto): Promise<GlobalResponse<DatatablePost>> {
      const data = await this.adminPostService.getPost(adminPostListDto);
      return {
          message: 'Success',
          data: data
      };
  }

    @Get('/post/by-ids')
    @ApiOperation({ summary: 'Get posts by comma-separated IDs' })
    @ApiResponse({ status: 200, description: 'Success', example: {
      success: true,
      alert: { code: 200, message: 'Success' },
      data: { items: [], recordsTotal: 0, recordsFiltered: 0 }
    }})
    async getPostsByIds(@Query() dto: PostByIdsDto): Promise<GlobalResponse<DatatablePost>> {
      const ids = dto.ids
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !Number.isNaN(n));
      const data = await this.adminPostService.getPostsByIds(ids);
      return { message: 'Success', data };
    }

    @Get('/reaction')
    @ApiOperation({ summary: 'Get reaction list' })
    @ApiResponse({ status: 200, description: 'Success', example:{
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success"
      },
      "data": {
        "items": [
          {
            "id": 50615,
            "reaction": "+1",
            "reactionId": "",
            "name": "",
            "post": {
              "id": 24221,
              "backup_member_id": 33501,
              "backup_space_id": 7,
              "title": "Hindari Genangan Air",
              "description": "Bila banjir terjadi saat kita sedang berkendara, sebisa mungkin untuk menghindari genangan air. Karena bisa jadi genangan air tersebut lebih...",
              "image": "https://mimate-api.mymitsubishiapps.com/upload/files/IdRJx7xlIg6wcepskB2yh",
              "status": "PUBLISHED"
            },
            "author": {
              "id": 90804,
              "name": "kuriling",
              "email": "esatyanagara@yahoo.com",
              "profilePictureUrl": "https://mitsubishimotorsid-mobileapp.com/storage/users/2025/SD4tMK2zLvZ96UE8ieMkR3zv1DFHxaUn7biwLncQ.jpeg",
              "userId": 42690
            },
            "created_at": "2025-10-03T11:13:17.000Z",
            "updated_at": "2025-10-03T11:13:17.000Z"
          }
        ],
        "recordsTotal": 33325,
        "recordsFiltered": 33325
      }
    } })
    async getReactionList(@Query() dto: ReactionListDto): Promise<GlobalResponse<DatatableReaction>> {
      const data = await this.captureBsiService.getReactionList(dto);
      return {
        message: 'Success',
        data
      };
    }

    @Get('/comment')
    @ApiOperation({ summary: 'Get comment list' })
    @ApiResponse({ status: 200, description: 'Success', example: {
      "success": true,
      "alert": {
        "code": 200,
        "message": "Success"
      },
      "data": {
        "items": [
          {
            "id": 40101,
            "commentId": "",
            "title": "ai",
            "description": "ai",
            "externalId": "2156625",
            "repliesCount": 0,
            "created_at": "2025-10-03T05:02:11.000Z",
            "updated_at": "2025-10-03T05:02:11.000Z",
            "deleted_at": "",
            "parent": "",
            "post": {
              "id": 24262,
              "backup_member_id": 145679,
              "backup_space_id": 7,
              "title": "Si Besty Sudah Go International! 😂",
              "description": "Mobil kesayangan nih memang bikin halu! 🤣 Sebagai tanda cinta dan rasa bangga punya kesempatan memiliki mobil Mitsubitshi Destinator Ultimate...",
              "image": "https://mimate-api.mymitsubishiapps.com/upload/files/421c2dc6-e964-43fd-9cdf-6da71894bafa",
              "status": "PUBLISHED"
            },
            "author": {
              "id": 134089,
              "name": "Mihanbusha",
              "email": "triasgomu@yahoo.com",
              "profilePictureUrl": "https://mitsubishimotorsid-mobileapp.com/storage/users/2025/xjYOpvW9WwjRmmPHqhwuRukt15HLve2JECsqPmFQ.jpeg",
              "userId": 2156625
            }
          }
        ],
        "recordsTotal": 39684,
        "recordsFiltered": 39684
      }
    } })
    async getCommentList(@Query() dto: CommentListDto): Promise<GlobalResponse<DatatableComment>> {
      const data = await this.captureBsiService.getCommentList(dto);
      return {
        message: 'Success',
        data
      };
    }

    @Get('/space')
    async getSpaceList(@Query() dto: AdminSpaceListDto):Promise<GlobalResponse<DatatableSpace>> {

      const data = await this.adminSpaceService.getAllSpace(dto)

      return  {
        message : 'Success',
        data
      }
    }

    @Get('/posts-most-reactions')
    @ApiOperation({ summary: 'Get posts with most reactions', description: 'Optional date range on post published_at; when not set returns all data. Use limit to cap results.' })
    @ApiResponse({ status: 200, description: 'Success' })
    async getPostsWithMostReactions(@Query() dto: PostsMostReactionsDto): Promise<GlobalResponse<DatatablePost>> {
      const limit = dto.limit ?? 10;
      const data = await this.captureBsiService.getPostsWithMostReactions(limit, dto.start_date, dto.end_date, dto.tag);
      return { message: 'Success', data };
    }
}
