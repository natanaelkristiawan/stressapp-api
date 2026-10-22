import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PostEntity } from 'src/entity/post.entity';
import { Like, Raw, Repository } from 'typeorm';
import { PostSearchInterface, PostSearchResponse, SearchAllResponse, TagSearchInterface, TagSearchResponse } from './interfaces/search.interface';
import { Redis } from 'ioredis';
import { Information } from 'src/post/interfaces/post.interface';
import { v1 as uuidv1} from 'uuid';
import { DateHelper } from 'src/common/helpers/date.helper';
import { TagsEntity } from 'src/entity/tags.entity';
import { PostTagsEntity } from 'src/entity/post-tags.entity';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { MemberSearchInterface, MemberSearchResponse } from './interfaces/search.interface';
import { title } from 'process';
import { RedisService } from '@liaoliaots/nestjs-redis';
@Injectable()
export class SearchService {
    private redis: Redis;

    constructor(
        @InjectRepository(PostEntity, 'mimate')
        private readonly postRepository: Repository<PostEntity>,

        @InjectRepository(TagsEntity, 'mimate')
        private readonly tagRepository: Repository<TagsEntity>,

        @InjectRepository(PostTagsEntity, 'mimate')
        private readonly PostTagsEntity: Repository<PostTagsEntity>,

        @InjectRepository(UserMimateEntity, 'mimate')
        private readonly memberRepository: Repository<UserMimateEntity>,

        private readonly dateHelper: DateHelper,
        private readonly redisService: RedisService
    ) {
        this.redis = this.redisService.getOrNil('default')
        if (!this.redis) {
            console.warn('Redis client not found. Skipping cache initialization.');
        }
    }


    // search post
    async searchPost(keyword: string, memberId: number, limit: number, after: string): Promise<PostSearchResponse> {
        let countingTotalPost:boolean = true
        let totalData:number = 0
        let page:number = 1
        let offset:number = 0
        let cacheKey:string;
        
        let redisInfo:Information


        if(after != "") {
            // find in redis
            cacheKey = `SearchPost:${after}`;
            const cachedInformation = await this.redis.get(cacheKey);

            if (cachedInformation) {
                redisInfo = JSON.parse(cachedInformation);
                totalData = redisInfo.totalData
                page = redisInfo.page + 1
                offset = redisInfo.page * redisInfo.limit
                totalData = redisInfo.totalData
                countingTotalPost = false
            } else {
                // generate new after
                after = uuidv1()
            }
        } else {
            after = uuidv1()
        }

        let config:any = {
            take: limit,
            skip: offset,
            order: {
                createdAt: 'ASC'
            },
            where: {
                isPsychoeducation: false,
                title: Raw((alias) => `LOWER(${alias}) LIKE LOWER(:title)`, { title: `%${keyword}%` })
            },
            relations: ['member', 'space']
        }



        if(countingTotalPost) {
            totalData = await this.postRepository.count(config)
        }



        // make  query for filter post 
        let query = await this.postRepository.find(config)



        let posts:PostSearchInterface[] = []

        // using map to get data
        for(let post of query) {
            posts.push({
                postId: post.id,
                title: post.title,
                space: {
                    spaceId: post.space.id,
                    name: post.space.name
                },
                published_at: post.published_at,
                published_at_title: this.dateHelper.getDateRange(new Date(post.published_at), new Date())
            })
        }

         // describe again for get new key   
        redisInfo = {
            totalData : totalData,
            hasNext: (totalData < (page * limit)) ? false : true ,
            page: page,
            limit: limit,
            offset: offset,
            after: after
        }

        // save to redis
        cacheKey = `SearchPost:${after}`;
        await this.redis.set(cacheKey, JSON.stringify(redisInfo), 'EX', 60 * 5); // 5 min TTL

        

        let response:PostSearchResponse = {
            totalData: totalData,
            hasNext: (totalData < (page * limit)) ? false : true ,
            page: page,
            limit: limit,
            offset: offset,
            after: after,
            data: posts
        }

        return response
    }

    private formatNumber(num:number):string {
        if (num >= 1000) {
          return Math.floor(num / 1000) + 'k+';
        } else if (num >= 500) {
          return '500+';
        } else if (num >= 400) {
          return '400+';
        } else {
          return num.toString();
        }
      }

    
    // search tag
    async searchTag(keyword: string, memberId: number, limit: number, after: string): Promise<TagSearchResponse> {
        
        let countingTotalPost:boolean = true
        let totalData:number = 0
        let page:number = 1
        let offset:number = 0
        let cacheKey:string;
        
        let redisInfo:Information


        if(after != "") {
            // find in redis
            cacheKey = `SearchTag:${after}`;
            const cachedInformation = await this.redis.get(cacheKey);


            if (cachedInformation) {
                redisInfo = JSON.parse(cachedInformation);
                totalData = redisInfo.totalData
                page = redisInfo.page + 1
                offset = redisInfo.page * redisInfo.limit
                totalData = redisInfo.totalData
                countingTotalPost = false
            } else {
                // generate new after
                after = uuidv1()
            }
        } else {
            after = uuidv1()
        }

        let config:any = {
            take: limit,
            skip: offset,
            where: {
                title: Raw((alias) => `LOWER(${alias}) LIKE LOWER(:title)`, { title: `%${keyword}%` })
            }
        }

        if(countingTotalPost) {
            totalData = await this.tagRepository.count(config)
        }

        let query = await this.tagRepository.find(config)

        let tags:TagSearchInterface[] = []

        for(let tag of query) {

            // 
            let totalPost = await this.PostTagsEntity.count({
                relations: ['tag'],
                where: {
                    tag: {
                        id: tag.id
                    }
                }
            })


            tags.push({
                tagId: tag.id,
                title: tag.title,
                totalPost: totalPost,
                totalPostFormatted: this.formatNumber(totalPost)
            })
        }



        // describe again for get new key   
        redisInfo = {
            totalData : totalData,
            hasNext: (totalData < (page * limit)) ? false : true ,
            page: page,
            limit: limit,
            offset: offset,
            after: after
        }

        // save to redis
        cacheKey = `SearchTag:${after}`;
        await this.redis.set(cacheKey, JSON.stringify(redisInfo), 'EX', 60 * 5); // 5 min TTL
        
        
        return {
            totalData: totalData,
            hasNext: (totalData < (page * limit)) ? false : true ,
            page: page,
            limit: limit,
            offset: offset,
            after: after,
            data: tags
        }
    }

    // search post tag
    async searchPostTag(tagId: number, memberId: number, limit: number, after: string): Promise<PostSearchResponse> {
        let countingTotalPost:boolean = true
        let totalData:number = 0
        let page:number = 1
        let offset:number = 0   

        let cacheKey:string;
        
        let redisInfo:Information   

        if(after != "") {
            // find in redis
            cacheKey = `SearchPostTag:${after}`;
            const cachedInformation = await this.redis.get(cacheKey);

            if (cachedInformation) {    
                redisInfo = JSON.parse(cachedInformation);
                totalData = redisInfo.totalData
                page = redisInfo.page + 1
                offset = redisInfo.page * redisInfo.limit
                totalData = redisInfo.totalData
                countingTotalPost = false
            } else {
                    // generate new after
                after = uuidv1()
            }
        } else {
            after = uuidv1()
        }

        let config:any = {
            take: limit,
            skip: offset,
            where: {
                tag: {
                    id: tagId
                },
                post: { isPsychoeducation: false }
            },
            relations: ['post', 'post.space', 'post.member']
        }

        if(countingTotalPost) {
            totalData = await this.PostTagsEntity.count(config)
        }


        // find in table post_tags
        let query = await this.PostTagsEntity.find(config)

        let posts:PostSearchInterface[] = []
        
        for(let post of query) {
       

            posts.push({
                postId: post.post.id,
                title: post.post.title,
                space: {
                    spaceId: post.post.space.id,
                    name: post.post.space.name
                },
                published_at: post.post.published_at,
                published_at_title: this.dateHelper.getDateRange(new Date(post.post.published_at), new Date())
            })
        }

       // describe again for get new key   
       redisInfo = {
            totalData : totalData,
            hasNext: (totalData < (page * limit)) ? false : true ,
            page: page,
            limit: limit,
            offset: offset,
            after: after
        }

        // save to redis
        cacheKey = `SearchPostTag:${after}`;
        await this.redis.set(cacheKey, JSON.stringify(redisInfo), 'EX', 60 * 5); // 5 min TTL
    

        let response:PostSearchResponse = {
            totalData: totalData,
            hasNext: (totalData < (page * limit)) ? false : true ,
            page: page,
            limit: limit,
            offset: offset,
            after: after,
            data: posts
        }

        return response
    }


    private getMemberName(name:string, mmid_fullname:string,  id:number): string {

        let tempName = name
        if (!tempName || tempName.trim() === '') {
          tempName = mmid_fullname;
        }
        
    
        if (!tempName || tempName.trim() === '') {
          tempName = `user_${String(id).padStart(4, '0')}`;
        }
    
        return tempName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }

    // search member by name
    async searchMemberByName(keyword: string, memberId: number, limit: number, after: string): Promise<MemberSearchResponse> {
        let countingTotalPost:boolean = true
        let totalData:number = 0
        let page:number = 1
        let offset:number = 0   

        let cacheKey:string;
        
        let redisInfo:Information   

        if(after != "") {
            // find in redis
            cacheKey = `SearchMemberByName:${after}`;
            const cachedInformation = await this.redis.get(cacheKey);

            if (cachedInformation) {
                redisInfo = JSON.parse(cachedInformation);
                totalData = redisInfo.totalData
                page = redisInfo.page + 1
                offset = redisInfo.page * redisInfo.limit
                totalData = redisInfo.totalData
                countingTotalPost = false
            } else {
                // generate new after
                after = uuidv1()
            }
        } else {
            after = uuidv1()
        }       

        // Create query with computed display name following getMemberName logic
        const queryBuilder = this.memberRepository.createQueryBuilder('member')
            .select([
                'member.id',
                'member.email',
                'member.name',
                'member.mmid_fullname',
                'member.profilePictureUrl',
                'member.bio',
                // Computed display name following getMemberName logic
                `CASE 
                    WHEN member.name IS NOT NULL AND member.name != '' THEN member.name
                    WHEN member.mmid_fullname IS NOT NULL AND member.mmid_fullname != '' THEN member.mmid_fullname
                    ELSE CONCAT('user_', LPAD(CAST(member.id AS CHAR), 4, '0'))
                END as displayName`
            ])
            .where(`LOWER(CASE 
                WHEN member.name IS NOT NULL AND member.name != '' THEN member.name
                WHEN member.mmid_fullname IS NOT NULL AND member.mmid_fullname != '' THEN member.mmid_fullname
                ELSE CONCAT('user_', LPAD(CAST(member.id AS CHAR), 4, '0'))
            END) LIKE LOWER(:keyword)`, { keyword: `%${keyword}%` })
            .andWhere('member.id != :memberId', { memberId }) 
            .take(limit)
            .skip(offset)
            .orderBy('member.id', 'ASC');

        if(countingTotalPost) {
            const countQuery = this.memberRepository.createQueryBuilder('member')
                .where(`LOWER(CASE 
                    WHEN member.name IS NOT NULL AND member.name != '' THEN member.name
                    WHEN member.mmid_fullname IS NOT NULL AND member.mmid_fullname != '' THEN member.mmid_fullname
                    ELSE CONCAT('user_', LPAD(CAST(member.id AS CHAR), 4, '0'))
                END) LIKE LOWER(:keyword)`, { keyword: `%${keyword}%` }).andWhere('member.id != :memberId', { memberId }) ;
            
            totalData = await countQuery.getCount();
        }

        const queryResult = await queryBuilder.getRawAndEntities();

        let members:MemberSearchInterface[] = []

        for(let i = 0; i < queryResult.entities.length; i++) {
            const member = queryResult.entities[i];
            const rawData = queryResult.raw[i];
            
            members.push({
                memberId: member.id,
                name: this.getMemberName(member.name, member.mmid_fullname, member.id),
                profilePicture: member.profilePictureUrl,
                bio: member.bio,
                email: member.email
            })
        }

        // describe again for get new key   
        redisInfo = {
            totalData : totalData,
            hasNext: (totalData < (page * limit)) ? false : true ,
            page: page,
            limit: limit,
            offset: offset,
            after: after
        }

        // save to redis
        cacheKey = `SearchMemberByName:${after}`;
        await this.redis.set(cacheKey, JSON.stringify(redisInfo), 'EX', 60 * 5); // 5 min TTL

        let response:MemberSearchResponse = {
            totalData: totalData,
            hasNext: (totalData < (page * limit)) ? false : true ,
            page: page,
            limit: limit,
            offset: offset,
            after: after,
            data: members
        }

        return response 
    }


    // search all
    async searchAll(keyword: string, memberId: number): Promise<SearchAllResponse> {
        let response:SearchAllResponse = {
            post: [],
            tag: [],
            member: []
        }

        let post = await this.searchPost(keyword, memberId, 5, '')
        let tag = await this.searchTag(keyword, memberId, 5, '')
        let member = await this.searchMemberByName(keyword, memberId, 5, '')

        response.post = post.data

        response.tag = tag.data
        response.member = member.data

        return response
    }
}
