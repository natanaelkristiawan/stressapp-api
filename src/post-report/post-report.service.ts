import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PostReport } from 'src/entity/post-report.entity';
import { Repository } from 'typeorm';
import { PostInterface, MemberInterface, PostReportInterface, PostReportCollectionResponse } from './interfaces/post-report.interface';
import { CreatePostReportDto } from './dto/create-post-report.dto';
import { PostEntity } from 'src/entity/post.entity';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { v1 as uuidv1} from 'uuid';


@Injectable()
export class PostReportService {
    constructor(
        @InjectRepository(PostReport,  'mimate')
        private postReportRepository: Repository<PostReport>,

        @InjectRepository(PostEntity, 'mimate')
        private postRepository: Repository<PostEntity>, 

        @InjectRepository(UserMimateEntity, 'mimate')
        private userRepository: Repository<UserMimateEntity>, 
    ) {}

    async createPostReport(createPostReportDto: CreatePostReportDto, userId: number):Promise<PostReportInterface> {
        const {postId, reason, description} = createPostReportDto

        // check if post exist
        const post = await this.postRepository.findOne({where: {id: postId, isPsychoeducation: false}})
        if (!post) {
            throw new NotFoundException('Post not found')
        }

        // check if user exist
        const user = await this.userRepository.findOne({where: {id: userId}})
        if (!user) {
            throw new NotFoundException('User not found')
        }

        // check if user already report this post
        const postReport = await this.postReportRepository.findOne({where: {post: {id:postId}, reportedBy: {id:userId}}})
        if (postReport) {
            throw new BadRequestException('You have already reported this post')
        }
        
        const timestamp = new Date();
   

            
        // create post report
        const newPostReport = new PostReport()
        newPostReport.post = post
        newPostReport.reportedBy = user
        newPostReport.reason = reason
        newPostReport.description = description
        newPostReport.created_at = timestamp
        newPostReport.status = true
        newPostReport.is_solved = false
        newPostReport.solved_description = ''
        newPostReport.updated_at = timestamp


     

        await this.postReportRepository.save(newPostReport)

        return {
            id: newPostReport.id,
            reason: newPostReport.reason,
            createdAt: newPostReport.created_at,
            description: newPostReport.description,
            post: {
                id: newPostReport.post.id,
                title: newPostReport.post.title,
            },
            reportedById:  {
                id: newPostReport.reportedBy.id,
                name: newPostReport.reportedBy.name,
                profilePictureUrl: newPostReport.reportedBy.profilePictureUrl
            }
        }
    }

    async getPostReports(limit: number, after: string, sort?: string): Promise<PostReportCollectionResponse> {
        let countingTotalReports: boolean = true;
        let totalData: number = 0;
        let page: number = 1;
        let offset: number = 0;
        let cacheKey: string;
        let postReportQuery: PostReport[];

        if (after != "") {
            // find in redis (if you have redis configured)
            // cacheKey = `postReports:${after}`;
            // const cachedInformation = await this.redis.get(cacheKey);
            // if (cachedInformation) {
            //     const redisInfo = JSON.parse(cachedInformation);
            //     totalData = redisInfo.totalData;
            //     page = redisInfo.page + 1;
            //     offset = redisInfo.page * redisInfo.limit;
            //     countingTotalReports = false;
            // } else {
            //     after = uuidv1();
            // }
            after = uuidv1();
        } else {
            after = uuidv1();
        }

        if (countingTotalReports) {
            totalData = await this.postReportRepository.count({
                where: {
                    status: true
                }
            });
        }

        let order: object = {};
        if (sort == 'popular') {
            order = {
                created_at: "DESC"
            };
        } else {
            order = {
                created_at: "DESC"
            };
        }

        const config: any = {
            take: limit,
            skip: offset,
            order: order,
            relations: ['post', 'reportedBy']
        };

        const whereCond: any = {
            status: true
        };

        config.where = whereCond;

        postReportQuery = await this.postReportRepository.find(config);

        const postReports: PostReportInterface[] = [];
        for (let index = 0; index < postReportQuery.length; index++) {
            const element = postReportQuery[index];

            if (element.post == null || element.reportedBy == null) {
                continue;
            }

            const postReport: PostReportInterface = {
                id: element.id,
                reason: element.reason,
                description: element.description,
                createdAt: element.created_at,
                post: {
                    id: element.post.id,
                    title: element.post.title,
                },
                reportedById: {
                    id: element.reportedBy.id,
                    name: element.reportedBy.name,
                    profilePictureUrl: element.reportedBy.profilePictureUrl
                }
            };
            postReports.push(postReport);
        }

        return {
            totalData: totalData,
            hasNext: (totalData < (page * limit)) ? false : true,
            page: page,
            limit: limit,
            offset: offset,
            after: after,
            data: postReports
        };
    }

}
