import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { DetailProfileDto } from './dtos/detail-profile.dto';
import {
  FriendConnectionsQueryDto,
  FriendDiscoverQueryDto,
  FriendMemberIdParamDto,
  UpdateMemberProfileDto,
} from './dtos/friends.dto';
import { GlobalResponse } from 'src/interfaces/global.interface';
import {
  FriendConnectionsInterface,
  FriendDiscoverPageInterface,
  FriendMemberProfileInterface,
  FriendMutationResultInterface,
  MemberFollowInterface,
  MemberSelfProfileInterface,
  profile,
} from './interfaces/profile.interface';
import {
  MemberAuthGuard,
  MemberRequest,
} from 'src/member-auth/member-auth.guard';
import { MemberAuthService } from 'src/member-auth/member-auth.service';
import { PostService } from 'src/post/post.service';
import { GetPostsDto } from 'src/post/dtos/get-posts.dto';
import { PostCollectionResponse } from 'src/post/interfaces/post.interface';
import { QueueService } from 'src/queue/queue.service';
import { QuestService } from 'src/quest/quest.service';
@ApiTags('PROFILE')
@ApiBearerAuth('access-token')
@Controller('profile')
export class ProfileController {


  constructor(
    private profileService: ProfileService,
    private postService: PostService,
    private queueService: QueueService,
    private questService: QuestService
  ) {

  }

  // login member
  @Get("me")
  @ApiOperation({ summary: 'Detail Login Member' })
  @ApiQuery({ name: 'token', required: false, description: 'Bearer access token (optional alternative to Authorization header)' })
  @ApiResponse({
    status: 200, description: "Success result", example: {
      "success": true,
      alert: {
        "code": 200,
        "message": "Success create data",
      },
      "data": {
        "id": 10245,
        "name": "Abid Putra",
        "photo": "",
        "email": "abidramadhan0698@gmail.com",
        "gender": "male",
        "dob": "1998-01-06",
        "tagline": null,
        "bio": null,
        "hobby": null,
        "income": null,
        "link": null,
        "postCode": "13450 - Pondok Kelapa, Duren Sawit, Kota Administrasi Jakarta Timur, DKI Jakarta",
        "address": "pondok kelapa",
        "SIMExpired": null,
        "totalPosts": 0,
        "totalFollowers": 0,
        "totalFollowings": 0,
        "totalSpaces": 0,
        "following": false,
        "is_dealer": false,
        "mimatePoint": 40
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
  async detailMe(@Req() request): Promise<GlobalResponse<profile>> {
    const { id: memberId } = request.userData
    let response = await this.profileService.getProfile(memberId)

    return {
      message: "Success get data",
      data: response
    }
  }

  @Post("me/update")
  @ApiOperation({ summary: 'use KTB API For this method, this the link https://ktb.otesuto.com/docs#update-profile-v3' })
  async updateMe(): Promise<any> {
  }

  // other member
  @Get("member/:id")
  @ApiOperation({ summary: 'Detail Member' })
  @ApiResponse({
    status: 200, description: "Success result", example: {
      "success": true,
      alert: {
        "code": 200,
        "message": "Success create data",
      },
      "data": {
        "id": 10245,
        "name": "Abid Putra",
        "photo": "",
        "email": "abidramadhan0698@gmail.com",
        "gender": "male",
        "dob": "1998-01-06",
        "tagline": null,
        "bio": null,
        "hobby": null,
        "income": null,
        "link": null,
        "postCode": "13450 - Pondok Kelapa, Duren Sawit, Kota Administrasi Jakarta Timur, DKI Jakarta",
        "address": "pondok kelapa",
        "SIMExpired": null,
        "totalPosts": 0,
        "totalFollowers": 0,
        "totalFollowings": 0,
        "totalSpaces": 0,
        "following": false,
        "is_dealer": false,
        "mimatePoint": 40
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
  async detail(@Param() param: DetailProfileDto, @Req() request): Promise<GlobalResponse<profile>> {
    const { id: memberId } = param
    const { id: userId } = request.userData
    let response = await this.profileService.getProfile(memberId, userId)

    return {
      message: "Success get data",
      data: response
    }
  }

  // other posts member
  @Get('/member/post/:id')
  @ApiResponse({
    status: 200, description: "Success get posts", example: {
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
    "after": "666091c0-12c8-11f1-867b-2d5a487beeb7",
    "data": [
      {
        "id": 23245,
        "title": "Easy Run",
        "description": "eaay run easy pace",
        "textContent": "eaay run easy pace",
        "image": "https://mimate-api.otesuto.com/upload/files/39df3989-7f02-45f0-9597-fdfa9245e2ce",
        "reaction": [
          {
            "reaction": "tada",
            "count": 2,
            "reacted": false
          },
          {
            "reaction": "open_mouth",
            "count": 2,
            "reacted": false
          },
          {
            "reaction": "+1",
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
        "repliesCount": 5,
        "reactionCount": 6,
        "member": {
          "id": 10245,
          "name": "Abid Ramadhan",
          "email": "abidramadhan0698@gmail.com",
          "profilePictureUrl": "https://ktb.otesuto.com/storage/users/2025/ATmOMTwv3XATWKrfBt0yO8SjIRQne2E1ZGKpCV11.jpeg",
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
            "id": 29811,
            "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1764217032906-269e0de3-4c2f-4fcd-92f8-18f2a65356ea-1764217029068_1000047413.png.jpg",
            "type": "Image",
            "thumbnail": {
              "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1764217032906-269e0de3-4c2f-4fcd-92f8-18f2a65356ea-1764217029068_1000047413.png.jpg",
              "width": 798,
              "height": 1530,
              "type": "Image"
            }
          }
        ],
        "mmidUserId": 1604791,
        "totalRepliesCount": 5,
        "created_at": "2025-11-27 20:17:13",
        "published_at": "2026-02-04 16:02:05",
        "published_at_title": "27 November 2025",
        "type": "image",
        "post_type": "post",
        "vote_start": "",
        "vote_end": "",
        "total_vote": "",
        "is_post_owner": false,
        "votes": [],
        "my_vote_id": 0,
        "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=23245"
      },
      {
        "id": 23244,
        "title": "Vienna Vrtl Run 10K!!!",
        "description": "first time 10K event virtual, proud of myself",
        "textContent": "first time 10K event virtual, proud of myself",
        "image": "https://mimate-api.otesuto.com/upload/files/a26a8156-5362-4954-b153-f0a555e42f96",
        "reaction": [
          {
            "reaction": "+1",
            "count": 2,
            "reacted": false
          },
          {
            "reaction": "tada",
            "count": 1,
            "reacted": false
          },
          {
            "reaction": "open_mouth",
            "count": 1,
            "reacted": false
          },
          {
            "reaction": "heart",
            "count": 1,
            "reacted": false
          },
          {
            "reaction": "smile",
            "count": 1,
            "reacted": false
          }
        ],
        "tags": [],
        "repliesCount": 6,
        "reactionCount": 6,
        "member": {
          "id": 10245,
          "name": "Abid Ramadhan",
          "email": "abidramadhan0698@gmail.com",
          "profilePictureUrl": "https://ktb.otesuto.com/storage/users/2025/ATmOMTwv3XATWKrfBt0yO8SjIRQne2E1ZGKpCV11.jpeg",
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
            "id": 29810,
            "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1764216384780-f5f11775-b1e3-4464-88b7-feab9846a018-1764216360546_1000047532.png.jpg",
            "type": "Image",
            "thumbnail": {
              "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1764216384780-f5f11775-b1e3-4464-88b7-feab9846a018-1764216360546_1000047532.png.jpg",
              "width": 984,
              "height": 1749,
              "type": "Image"
            }
          }
        ],
        "mmidUserId": 1604791,
        "totalRepliesCount": 6,
        "created_at": "2025-11-27 20:06:25",
        "published_at": "2025-11-28 16:10:31",
        "published_at_title": "27 November 2025",
        "type": "image",
        "post_type": "post",
        "vote_start": "",
        "vote_end": "",
        "total_vote": "",
        "is_post_owner": false,
        "votes": [],
        "my_vote_id": 0,
        "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=23244"
      },
      {
        "id": 23226,
        "title": "test posting",
        "description": "posting aja",
        "textContent": "posting aja",
        "image": "https://mimate-api.otesuto.com/upload/files/19a1de49-de90-41db-84e1-606bfc98c1d5",
        "reaction": [
          {
            "reaction": "+1",
            "count": 1,
            "reacted": false
          }
        ],
        "tags": [],
        "repliesCount": 1,
        "reactionCount": 1,
        "member": {
          "id": 10245,
          "name": "Abid Ramadhan",
          "email": "abidramadhan0698@gmail.com",
          "profilePictureUrl": "https://ktb.otesuto.com/storage/users/2025/ATmOMTwv3XATWKrfBt0yO8SjIRQne2E1ZGKpCV11.jpeg",
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
            "id": 29790,
            "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1755757759402-4d985476-11fd-4fce-98e2-9ca8eecca2b1-1755757751146_1000033406.jpg.jpg",
            "type": "Image",
            "thumbnail": {
              "url": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1755757759402-4d985476-11fd-4fce-98e2-9ca8eecca2b1-1755757751146_1000033406.jpg.jpg",
              "width": 1080,
              "height": 1918,
              "type": "Image"
            }
          }
        ],
        "mmidUserId": 1604791,
        "totalRepliesCount": 1,
        "created_at": "2025-08-21 22:29:20",
        "published_at": "2025-11-28 16:11:56",
        "published_at_title": "21 August 2025",
        "type": "image",
        "post_type": "post",
        "vote_start": "",
        "vote_end": "",
        "total_vote": "",
        "is_post_owner": false,
        "votes": [],
        "my_vote_id": 0,
        "share_url": "ktb.otesuto.com/deeplink/mimate?page=post&id=23226"
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
  @ApiOperation({ summary: 'Get Posts Member' })
  async posts(@Param() member: DetailProfileDto, @Query() param: GetPostsDto, @Req() request): Promise<GlobalResponse<PostCollectionResponse>> {
    const { id: memberId } = member

    // check profile
    await this.profileService.checkProfile(memberId)

    const { limit, after, order } = param;
    const { id: userId } = request.userData
    let response = await this.postService.collectPosts('member', limit, after, memberId, order, userId)
    return {
      message: "Success get data",
      data: response
    }
  }


  @Get('follow/:id')
  @ApiResponse({
    status: 200, description: "Success get posts", example: {
      "success": true,
      alert: {
        "code": 200,
        "message": "Success follow",
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
  @ApiOperation({ summary: 'Follow Member' })
  async followMember(@Param() member: DetailProfileDto, @Req() request): Promise<GlobalResponse<{}>> {
    const { id: memberId } = member
    const { id: userId } = request.userData

    await this.profileService.follow(userId, memberId)

    const profile = await this.profileService.getUserDetail(memberId)

    // send notification to member
    await this.queueService.addJob('send-notification', {
      type: 'follower-notification',
      send_to: [profile.userId],
      actor_name: request.userData.name,
      mimate_id: memberId
    })

    return {
      message: "Success follow",
      data: {}
    }
  }

  @Get('unfollow/:id')
  @ApiResponse({
    status: 200, description: "Success get posts", example: {
      "success": true,
      alert: {
        "code": 200,
        "message": "Success unfollow",
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
  @ApiOperation({ summary: 'Unfollow Member' })
  async unfollowMember(@Param() member: DetailProfileDto, @Req() request): Promise<GlobalResponse<{}>> {
    const { id: memberId } = member
    const { id: userId } = request.userData

    await this.profileService.unfollow(userId, memberId)
    return {
      message: "Success unfollow",
      data: {}
    }
  }

  @Get('followers/:id')
  @ApiResponse({
    status: 200, description: "Success get followers", example: {
  "success": true,
  "alert": {
    "code": 200,
    "message": "Success get followers"
  },
  "data": [
    {
      "memberId": 90829,
      "name": "Kkkkk",
      "profilePicture": "",
      "bio": "",
    },
    {
      "memberId": 90895,
      "name": "Jonathan Joestar",
      "profilePicture": "https://ktb.otesuto.com/storage/users/2025/MKTCjt0iMVJBgx2RbuEAq8hhnaBdQVuTdghFGG4G.jpeg",
      "bio": "",
    },
    {
      "memberId": 90913,
      "name": "Jojo",
      "profilePicture": "https://ktb.otesuto.com/storage/users/2025/db1GR0mqgPa4EELFw2K8tL0CmbNqb5pnZiMGPrb7.jpeg",
      "bio": "The Great Joestar Bloodline",
    },
    {
      "memberId": 90884,
      "name": "The King",
      "profilePicture": "https://ktb.otesuto.com/storage/users/2025/yXeMNeVGBCla6wLYQ20hkCcjYdYkbOTx70mzsqzS.png",
      "bio": "The ?",
    },
    {
      "memberId": 136061,
      "name": "Testing A Mimate",
      "profilePicture": "",
      "bio": "Buat testing Mimate Coin",
    },
    {
      "memberId": 79916,
      "name": "User_79916",
      "profilePicture": "https://mitsubishiconnectedcars.s3.ap-southeast-3.amazonaws.com/mimate/images/1752761986929-66210768-3a86-44a7-b67a-83be974d2040-c95a165dcdd82a77.jpg",
      "bio": "memasak",
      "seen": 1
    }
  ]
}
  })
  async followers(@Param() member: DetailProfileDto, @Req() request): Promise<GlobalResponse<MemberFollowInterface[]>> {
    const { id: memberId } = member
    const { id: userId } = request.userData

    let response = await this.profileService.getMemberFollowers(memberId, userId)
    return {
      message: "Success get followers",
      data: response
    }
  }

  @Get('following/:id')
  @ApiResponse({
    status: 200, description: "Success get following", example:{
  "success": true,
  "alert": {
    "code": 200,
    "message": "Success get following"
  },
  "data": [
    {
      "memberId": 2,
      "name": "Nurafni Panjaitan",
      "profilePicture": "",
      "bio": "",
    },
    {
      "memberId": 5,
      "name": "Johan Chialis",
      "profilePicture": "",
      "bio": "",
    },
    {
      "memberId": 6,
      "name": "Cv Batara Sumber Makmur",
      "profilePicture": "",
      "bio": "",
    },
    {
      "memberId": 5961,
      "name": "Yoyong Purwowartono",
      "profilePicture": "",
      "bio": "",
    },
    {
      "memberId": 90884,
      "name": "The King",
      "profilePicture": "https://ktb.otesuto.com/storage/users/2025/yXeMNeVGBCla6wLYQ20hkCcjYdYkbOTx70mzsqzS.png",
      "bio": "The ?",
    }
  ]
}
  })
  async following(@Param() member: DetailProfileDto, @Req() request): Promise<GlobalResponse<MemberFollowInterface[]>> {
    const { id: memberId } = member
    const { id: userId } = request.userData
    let response = await this.profileService.getMemberFollowing(memberId, userId)
    return {
      message: "Success get following",
      data: response
    }
  }


  // sync profile
  @Get('sync')
  @ApiOperation({ summary: 'Sync Profile' })
  async syncProfile(@Req() request): Promise<GlobalResponse<boolean>> {
    const { id: userId } = request.userData
    const authHeader = request.headers['authorization'];
    let response = await this.profileService.syncProfile(userId, authHeader)

    // implemet sync 
    // await this.questService.sendQuestCompleteProfile(userId);
    
    return {
      message: "Success sync profile",
      data: response
    }
  }


  // calculate posts member
  @Get('calculate-posts-member')
  async calculatePostsMember(): Promise<GlobalResponse<boolean>> {
    const response = await this.profileService.calculatePostsMember()
    return {
      message: "Success calculate posts member",
      data: response
    }
  }

  // calculate comment member
  @Get('calculate-comment-member')
  async calculateCommentMember(): Promise<GlobalResponse<boolean>> {
    const response = await this.profileService.calculateCommentMember()
    return {
      message: "Success calculate comment member",
      data: response
    }
  }

  // calculate reaction member
  @Get('calculate-reaction-member')
  async calculateReactionMember(): Promise<GlobalResponse<boolean>> {
    const response = await this.profileService.calculateReactionMember()
    return {
      message: "Success calculate reaction member",
      data: response
    }
  }

  // get all member with photoprofile
  @Get('get-all-member-with-photoprofile')
  async getAllMemberWithPhotoprofile(): Promise<GlobalResponse<any[]>> {
    const response = await this.profileService.getAllMemberWithPhotoprofile()
    return {
      message: "Success get all member with photoprofile",
      data: response
    }
  }


  // mark all follower seen
  @Post('set-seen')
  @ApiOperation({ summary: 'Mark all follow records as seen' })
  @ApiResponse({
    status: 200,
    description: 'Success',
    example: {
      success: true,
      alert: { code: 200, message: 'Set all seen' },
      data: true,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found',
    example: {
      success: false,
      alert: { code: 404, message: 'Not Found' },
      data: null,
    },
  })
  async setSeen(@Req() request): Promise<GlobalResponse<boolean>> {
    const { id: memberId } = request.userData;
    await this.profileService.setSeen(memberId);

    return {
      message: 'Set all seen',
      data: true,
    };
  }


}

@ApiTags('FRIENDS')
@ApiBearerAuth('access-token')
@Controller('me/friends')
@UseGuards(MemberAuthGuard)
export class MemberFriendsController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly memberAuth: MemberAuthService,
  ) {}

  /** Lists paginated discoverable members excluding self and already-accepted friends. */
  @Get('discover')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Discover members to add as friends' })
  async discover(
    @Query() query: FriendDiscoverQueryDto,
    @Req() request: MemberRequest,
  ): Promise<GlobalResponse<FriendDiscoverPageInterface>> {
    await this.memberAuth.limit(
      'friends-discover',
      String(request.member.id),
      180,
      3600,
    );
    const data = await this.profileService.discoverMembers(
      request.member.id,
      query,
    );
    return {
      message: 'Daftar temukan teman berhasil dimuat.',
      data,
    };
  }

  /** Lists incoming pending friend requests and accepted friends for the authenticated member. */
  @Get('connections')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'List incoming friend requests and accepted friends' })
  async connections(
    @Query() query: FriendConnectionsQueryDto,
    @Req() request: MemberRequest,
  ): Promise<GlobalResponse<FriendConnectionsInterface>> {
    await this.memberAuth.limit(
      'friends-connections',
      String(request.member.id),
      180,
      3600,
    );
    const data = await this.profileService.getFriendConnections(
      request.member.id,
      query,
    );
    return {
      message: 'Daftar koneksi pertemanan berhasil dimuat.',
      data,
    };
  }

  /** Loads public profile details, relationship status, connection count, and posts for a member. */
  @Get('members/:id')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Get member public profile and friendship status' })
  async memberProfile(
    @Param() params: FriendMemberIdParamDto,
    @Req() request: MemberRequest,
  ): Promise<GlobalResponse<FriendMemberProfileInterface>> {
    await this.memberAuth.limit(
      'friends-profile',
      String(request.member.id),
      180,
      3600,
    );
    const data = await this.profileService.getFriendMemberProfile(
      request.member.id,
      params.id,
    );
    return {
      message: 'Profil pengguna berhasil dimuat.',
      data,
    };
  }

  /** Sends a friend invitation to the target member. */
  @Post('requests/:id')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Send a friend invitation to a member' })
  async sendRequest(
    @Param() params: FriendMemberIdParamDto,
    @Req() request: MemberRequest,
  ): Promise<GlobalResponse<FriendMutationResultInterface>> {
    await this.memberAuth.limit(
      'friends-mutate',
      String(request.member.id),
      60,
      3600,
    );
    const data = await this.profileService.sendFriendRequest(
      request.member.id,
      params.id,
    );
    return {
      message: 'Permintaan pertemanan terkirim.',
      data,
    };
  }

  /** Approves an incoming friend request from the specified requester member. */
  @Post('requests/:id/accept')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Accept an incoming friend request' })
  async acceptRequest(
    @Param() params: FriendMemberIdParamDto,
    @Req() request: MemberRequest,
  ): Promise<GlobalResponse<FriendMutationResultInterface>> {
    await this.memberAuth.limit(
      'friends-mutate',
      String(request.member.id),
      60,
      3600,
    );
    const data = await this.profileService.acceptFriendRequest(
      request.member.id,
      params.id,
    );
    return {
      message: 'Permintaan pertemanan diterima.',
      data,
    };
  }

  /** Declines and deletes an incoming friend request so the sender can request again later. */
  @Post('requests/:id/decline')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Decline and remove an incoming friend request' })
  async declineRequest(
    @Param() params: FriendMemberIdParamDto,
    @Req() request: MemberRequest,
  ): Promise<GlobalResponse<FriendMutationResultInterface>> {
    await this.memberAuth.limit(
      'friends-mutate',
      String(request.member.id),
      60,
      3600,
    );
    const data = await this.profileService.declineFriendRequest(
      request.member.id,
      params.id,
    );
    return {
      message: 'Permintaan pertemanan dihapus.',
      data,
    };
  }
}

@ApiTags('PROFILE')
@ApiBearerAuth('access-token')
@Controller('me/profile')
@UseGuards(MemberAuthGuard)
export class MemberProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly memberAuth: MemberAuthService,
  ) {}

  /** Loads the authenticated member's own profile details and preferences. */
  @Get()
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Get authenticated member profile and preferences' })
  async getProfile(
    @Req() request: MemberRequest,
  ): Promise<GlobalResponse<MemberSelfProfileInterface>> {
    await this.memberAuth.limit(
      'profile-read',
      String(request.member.id),
      180,
      3600,
    );
    const data = await this.profileService.getSelfProfile(request.member.id);
    return {
      message: 'Profil berhasil dimuat.',
      data,
    };
  }

  /** Updates the authenticated member's profile info, avatar URL, or preferences. */
  @Patch()
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Update authenticated member profile and preferences' })
  async updateProfile(
    @Body() body: UpdateMemberProfileDto,
    @Req() request: MemberRequest,
  ): Promise<GlobalResponse<MemberSelfProfileInterface>> {
    await this.memberAuth.limit(
      'profile-write',
      String(request.member.id),
      60,
      3600,
    );
    const data = await this.profileService.updateSelfProfile(
      request.member.id,
      body,
    );
    return {
      message: 'Profil berhasil disimpan.',
      data,
    };
  }
}
