import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { SearchService } from './search.service';
import { MemberSearchResponse, PostSearchResponse, SearchAllResponse, TagSearchResponse } from './interfaces/search.interface';
import { SearchAllDto, SearchDto } from './dto/search.dto';
import { GlobalResponse } from 'src/interfaces/global.interface';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SearchTagDto } from './dto/search-tag.dto';

@Controller('search')
@ApiTags('SEARCH')
@ApiBearerAuth('access-token')
export class SearchController {
    constructor(private readonly searchService: SearchService) {}


    @Get('all')
    @ApiOperation({summary: 'Search all'})
    @ApiResponse({status: 200, description: 'Search all successfully', example:{
      "success": true,
      "alert": {
        "code": 200,
        "message": "Search all successfully"
      },
      "data": {
        "post": [
          {
            "postId": 166,
            "title": "Libur imlek 2025 bersama mitshubishi camping ceria bersama keluarga... Berpetualang bersama mitsubishi expander",
            "space": {
              "spaceId": 7,
              "name": "Warga MiMate"
            },
            "published_at": "2025-02-02T03:55:58.000Z",
            "published_at_title": "2 February 2025"
          },
          {
            "postId": 2399,
            "title": "Meneliti mobil mobil menarik di mitshubishi",
            "space": {
              "spaceId": 7,
              "name": "Warga MiMate"
            },
            "published_at": "2024-07-26T07:35:42.000Z",
            "published_at_title": "26 July 2024"
          }
        ],
        "tag": [
          {
            "tagId": 85,
            "title": "mitshubishiindonesia",
            "totalPost": 3121,
            "totalPostFormatted": "3k+"
          },
          {
            "tagId": 114,
            "title": "mitshubishiwargajambisukafajar",
            "totalPost": 1,
            "totalPostFormatted": "1"
          },
          {
            "tagId": 118,
            "title": "mitshubishikarawang",
            "totalPost": 1,
            "totalPostFormatted": "1"
          }
        ],
        "member": [
          {
            "memberId": 76422,
            "name": "LAACO.mitshubishibaubau",
            "profilePicture": "https://yes.sgp1.digitaloceanspaces.com/images/1747199667050-a7f32f07-83c3-40a4-993e-1c4d3929299a-default.jpg",
            "bio": "Update soal mobil & otomotif. Bisa cek juga blog saya pada link di bawah"
          }
        ]
      }
    }})
    async searchAll(@Query() SearchAllDto: SearchAllDto, @Req() request): Promise<GlobalResponse<SearchAllResponse>> {
        const {id:memberId} = request.userData
        const {keyword} = SearchAllDto
        let response = await this.searchService.searchAll(keyword, memberId)
        return {
            message: 'Search all successfully',
            data: response
        }
    }

    @Get('post')
    @ApiOperation({summary: 'Search post'})
    @ApiResponse({status: 200, description: 'Search post successfully', example:{
        "success": true,
        "alert": {
          "code": 200,
          "message": "Search post successfully"
        },
        "data": {
          "totalData": 127,
          "hasNext": true,
          "page": 1,
          "limit": 10,
          "offset": 0,
          "after": "f6895040-2726-11f0-82fe-7f6303170d48",
          "data": [
            {
              "postId": 27,
              "title": "Service xpander cross",
              "space": {
                "spaceId": 7,
                "name": "Warga MiMate"
              },
              "published_at": "2025-02-22T05:47:59.000Z",
              "published_at_title": "22 February 2025"
            },
            {
              "postId": 41,
              "title": "Serah terima xpander ultimate",
              "space": {
                "spaceId": 5,
                "name": "Dealers Corner"
              },
              "published_at": "2025-02-21T06:21:44.000Z",
              "published_at_title": "21 February 2025"
            },
            {
              "postId": 43,
              "title": "Shopping bersama expander",
              "space": {
                "spaceId": 7,
                "name": "Warga MiMate"
              },
              "published_at": "2025-02-20T15:32:13.000Z",
              "published_at_title": "20 February 2025"
            },
            {
              "postId": 152,
              "title": "FLASHDISK tidak terbaca di head unit xpander 2024 ?",
              "space": {
                "spaceId": 7,
                "name": "Warga MiMate"
              },
              "published_at": "2025-02-03T01:44:40.000Z",
              "published_at_title": "3 February 2025"
            },
            {
              "postId": 166,
              "title": "Libur imlek 2025 bersama mitshubishi camping ceria bersama keluarga... Berpetualang bersama mitsubishi expander",
              "space": {
                "spaceId": 7,
                "name": "Warga MiMate"
              },
              "published_at": "2025-02-02T03:55:58.000Z",
              "published_at_title": "2 February 2025"
            },
            {
              "postId": 176,
              "title": "Bertani dengan menggunakan alat transportasi Mitsubishi xpander cross",
              "space": {
                "spaceId": 7,
                "name": "Warga MiMate"
              },
              "published_at": "2025-02-01T06:30:52.000Z",
              "published_at_title": "1 February 2025"
            },
            {
              "postId": 203,
              "title": "Di rumah ada 2 mobil yang sekelas dengan xpander cross,Tetapi untuk perjalan jauh xpander cross selalu jadi pilihan utama.",
              "space": {
                "spaceId": 7,
                "name": "Warga MiMate"
              },
              "published_at": "2025-01-29T11:40:55.000Z",
              "published_at_title": "29 January 2025"
            },
            {
              "postId": 230,
              "title": "Udah 1 th lebih 2 bulan…xpander cross memang teman ternyaman 😇",
              "space": {
                "spaceId": 7,
                "name": "Warga MiMate"
              },
              "published_at": "2025-01-22T07:22:08.000Z",
              "published_at_title": "22 January 2025"
            },
            {
              "postId": 310,
              "title": "Lampu depan saya ber embun ketika kena hujan, padahan xpander sy ultimate 12/2024 , baru satu bulan pakai..gmn solusinya mhn di bantu🙏",
              "space": {
                "spaceId": 7,
                "name": "Warga MiMate"
              },
              "published_at": "2025-01-12T04:44:53.000Z",
              "published_at_title": "12 January 2025"
            },
            {
              "postId": 399,
              "title": "Expander cross family..",
              "space": {
                "spaceId": 7,
                "name": "Warga MiMate"
              },
              "published_at": "2025-01-02T11:11:07.000Z",
              "published_at_title": "2 January 2025"
            }
          ]
        }
      }})
    async searchPost(@Query() searchDto: SearchDto, @Req() request): Promise<GlobalResponse<PostSearchResponse>> {
        
        let type =  'post'

        const {id:memberId} = request.userData

        const {keyword, limit, after} = searchDto


        let response = await this.searchService.searchPost(keyword, memberId, limit, after)
        return {
            message: 'Search post successfully',
            data: response
        }
    }


    @Get('tag')
    @ApiOperation({summary: 'Search tag'})
    @ApiResponse({status: 200, description: 'Search tag successfully', example:{
      "success": true,
      "alert": {
        "code": 200,
        "message": "Search tag successfully"
      },
      "data": {
        "totalData": 0,
        "hasNext": true,
        "page": 1,
        "limit": 10,
        "offset": 0,
        "after": "58fd8aa0-297c-11f0-a74e-d9237c699133",
        "data": [
          {
            "tagId": 85,
            "title": "mitshubishiindonesia",
            "totalPost": 3121,
            "totalPostFormatted": "3k+"
          },
          {
            "tagId": 114,
            "title": "mitshubishiwargajambisukafajar",
            "totalPost": 1,
            "totalPostFormatted": "1"
          },
          {
            "tagId": 118,
            "title": "mitshubishikarawang",
            "totalPost": 1,
            "totalPostFormatted": "1"
          },
          {
            "tagId": 298,
            "title": "mitshubishisrikandibandung",
            "totalPost": 3,
            "totalPostFormatted": "3"
          },
          {
            "tagId": 323,
            "title": "mitshubishidipopekanbaru",
            "totalPost": 1,
            "totalPostFormatted": "1"
          },
          {
            "tagId": 342,
            "title": "mitshubishiindonesia100804",
            "totalPost": 1,
            "totalPostFormatted": "1"
          },
          {
            "tagId": 504,
            "title": "mitshubishipalembang",
            "totalPost": 1,
            "totalPostFormatted": "1"
          },
          {
            "tagId": 666,
            "title": "pameranmitshubishipalembang",
            "totalPost": 2,
            "totalPostFormatted": "2"
          },
          {
            "tagId": 717,
            "title": "mitshubishisurapati",
            "totalPost": 1,
            "totalPostFormatted": "1"
          },
          {
            "tagId": 739,
            "title": "mitshubishipastisardana",
            "totalPost": 2,
            "totalPostFormatted": "2"
          }
        ]
      }
    }})
    async searchTag(@Query() searchDto: SearchDto, @Req() request): Promise<GlobalResponse<TagSearchResponse>> {
        let type =  'tag'

        const {id:memberId} = request.userData

        const {keyword, limit, after} = searchDto

        let response = await this.searchService.searchTag(keyword, memberId, limit, after)

        return {
            message: 'Search tag successfully',
            data: response
        }
    }


    @Get('tag/post/:tagId')
    @ApiOperation({summary: 'Search post tag'})
    @ApiResponse({status: 200, description: 'Search post tag successfully', example:{
      "success": true,
      "alert": {
        "code": 200,
        "message": "Search post tag successfully"
      },
      "data": {
        "totalData": 0,
        "hasNext": true,
        "page": 1,
        "limit": 10,
        "offset": 0,
        "after": "3747b5f0-297e-11f0-93fc-83834122713b",
        "data": [
          {
            "postId": 17393,
            "title": "",
            "space": {
              "spaceId": 7,
              "name": "Warga MiMate"
            },
            "published_at": "2022-03-21T15:18:50.000Z",
            "published_at_title": "21 March 2022"
          }
        ]
      }
    }})
    async searchPostTag(@Param('tagId') tagId: number, @Query() searchDto: SearchTagDto, @Req() request): Promise<GlobalResponse<PostSearchResponse>> {
        const {id:memberId} = request.userData

        const {limit, after} = searchDto

        let response = await this.searchService.searchPostTag(tagId, memberId, limit, after)

        return {
            message: 'Search post tag successfully',
            data: response
        }
    }
    

    @Get('member')
    @ApiOperation({summary: 'Search member'})
    @ApiResponse({status: 200, description: 'Search member successfully', example:{
      "success": true,
      "alert": {
        "code": 200,
        "message": "Search member successfully"
      },
      "data": {
        "totalData": 1,
        "hasNext": false,
        "page": 1,
        "limit": 10,
        "offset": 0,
        "after": "1c3675e0-3030-11f0-b583-69f4e84546ab",
        "data": [
          {
            "memberId": 90827,
            "name": "adistymega",
            "profilePicture": "https://tribe-s3-production.imgix.net/8ekfjIHyulLXLLfyCfD9x?auto=compress,format"
          }
        ]
      }}})
    async searchMember(@Query() searchDto: SearchDto, @Req() request): Promise<GlobalResponse<MemberSearchResponse>> {
        const {id:memberId} = request.userData

        const {keyword, limit, after} = searchDto

        let response = await this.searchService.searchMemberByName(keyword, memberId, limit, after)

        return {
            message: 'Search member successfully',
            data: response
        }
    }
}