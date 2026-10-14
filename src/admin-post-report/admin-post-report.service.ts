import { Injectable, NotFoundException } from '@nestjs/common';
import { PostReport } from 'src/entity/post-report.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { PostEntity } from 'src/entity/post.entity';
import Redis from 'ioredis';
import { v1 as uuidv1 } from 'uuid';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { PostCollectionResponse, Post, Reaction, Tag, Media, Space, Member } from '../post/interfaces/post.interface';
import { TagsEntity } from 'src/entity/tags.entity';
import { DateHelper } from 'src/common/helpers/date.helper';

interface Information {
    totalData: number
    hasNext: boolean
    page: number
    limit: number
    offset: number
    after: string
}

@Injectable()
export class AdminPostReportService {
    private redis: Redis; // Configure as needed
    private deeplink: string;
    constructor(
        @InjectRepository(PostReport, 'mimate')
        private postReportRepository: Repository<PostReport>,
        @InjectRepository(PostEntity, 'mimate')
        private postRepository: Repository<PostEntity>,
        @InjectRepository(TagsEntity, 'mimate')
        private tagRepository: Repository<TagsEntity>,
        private readonly redisService: RedisService,
        private readonly dateHelper: DateHelper
    ){
        this.redis = this.redisService.getOrNil('default')
        this.deeplink = process.env.DEEPLINK_URL
        if (!this.redis) {
            console.warn('Redis client not found. Skipping cache initialization.');
        }
    }

    formatDate(date: Date): string {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
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

    private generateReportDescription(reportCount: number, reporterCount: number, reporters: any[]): string {
        if (reportCount === 0 || reporterCount === 0) {
            return '';
        }

        if (reporterCount === 1) {
            return `This item is reported ${reportCount} time by ${reporters[0].name}`;
        }

        if (reporterCount === 2) {
            return `This item is reported ${reportCount} times by ${reporters[0].name} and ${reporters[1].name}`;
        }

        // For 3 or more reporters, show first reporter and count of others
        const otherCount = reporterCount - 1;
        return `This item is reported ${reportCount} times by ${reporters[0].name} and ${otherCount} other people`;
    }

    async getPostReports(limit: number, after: string, search: string): Promise<PostCollectionResponse> {
        let countingTotalPost: boolean = true
        let totalData: number = 0
        let page: number = 1
        let offset: number = 0
        let cacheKey: string;
        let redisInfo: Information
        let postEntities: PostEntity[]

        if (after != "") {
            // find in redis
            cacheKey = `adminPostReports:${after}`;
            const cachedInformation = await this.redis.get(cacheKey);
            if (cachedInformation) {
                redisInfo = JSON.parse(cachedInformation)
                totalData = redisInfo.totalData
                page = redisInfo.page + 1
                offset = redisInfo.page * redisInfo.limit
                countingTotalPost = false
            } else {
                // generate new after
                after = uuidv1()
            }
        } else {
            after = uuidv1()
        }

        if (countingTotalPost) {
            // Count total unique posts that have reports
            const totalQuery = this.postReportRepository.createQueryBuilder('post_report')
                .select('COUNT(DISTINCT post_report.post_id)', 'count')
                .where('post_report.status = :status', { status: true })
                .andWhere('post_report.is_solved = :isSolved', { isSolved: false });

            if (search) {
                totalQuery.leftJoin('post_report.post', 'post')
                    .andWhere('post.title LIKE :search', { search: `%${search}%` });
            }

            const totalResult = await totalQuery.getRawOne();
            totalData = parseInt(totalResult.count);
        }

        // Get unique post IDs that have reports
        const postIdsQuery = this.postReportRepository.createQueryBuilder('post_report')
            .select('DISTINCT post_report.post_id', 'postId')
            .addSelect('MAX(post_report.created_at)', 'latestReportDate')
            .where('post_report.status = :status', { status: true })
            .andWhere('post_report.is_solved = :isSolved', { isSolved: false });

        if (search) {
            postIdsQuery.leftJoin('post_report.post', 'post')
                .andWhere('post.title LIKE :search', { search: `%${search}%` });
        }

        const postIdsResult = await postIdsQuery
            .groupBy('post_report.post_id')
            .orderBy('latestReportDate', 'DESC')
            .skip(offset)
            .take(limit)
            .getRawMany();

        const postIds = postIdsResult.map(result => result.postId);

        if (postIds.length === 0) {
            return {
                totalData: totalData,
                hasNext: false,
                page: page,
                limit: limit,
                offset: offset,
                after: after,
                data: []
            };
        }

        // Get the actual post entities with all relations
        postEntities = await this.postRepository.find({
            where: { id: In(postIds) },
            relations: ['member', 'reactionList', 'reactionList.member', 'medias', 'space'],
            order: { created_at: 'DESC' }
        });

        // Get report statistics for each post
        const reportStats = await this.postReportRepository.createQueryBuilder('post_report')
            .select('post_report.post_id', 'postId')
            .addSelect('COUNT(*)', 'reportCount')
            .addSelect('COUNT(DISTINCT post_report.reported_by_member_id)', 'reporterCount')
            .where('post_report.post_id IN (:...postIds)', { postIds })
            .andWhere('post_report.status = :status', { status: true })
            .andWhere('post_report.is_solved = :isSolved', { isSolved: false })
            .groupBy('post_report.post_id')
            .getRawMany();

        // Get reporter names for each post
        const reporterNames = await this.postReportRepository.createQueryBuilder('post_report')
            .leftJoinAndSelect('post_report.reportedBy', 'reportedBy')
            .select('post_report.post_id', 'postId')
            .addSelect('reportedBy.name', 'reporterName')
            .addSelect('reportedBy.mmid_fullname', 'reporterMmidName')
            .addSelect('reportedBy.id', 'reporterId')
            .where('post_report.post_id IN (:...postIds)', { postIds })
            .andWhere('post_report.status = :status', { status: true })
            .andWhere('post_report.is_solved = :isSolved', { isSolved: false })
            .orderBy('post_report.created_at', 'DESC')
            .getRawMany();

        // Create maps for quick lookup
        const reportStatsMap = new Map();
        const reporterNamesMap = new Map();

        reportStats.forEach(stat => {
            reportStatsMap.set(stat.postId, {
                reportCount: parseInt(stat.reportCount),
                reporterCount: parseInt(stat.reporterCount)
            });
        });

        // Group reporters by post ID
        reporterNames.forEach(reporter => {
            const postId = reporter.postId;
            if (!reporterNamesMap.has(postId)) {
                reporterNamesMap.set(postId, []);
            }
            const reporters = reporterNamesMap.get(postId);
            
            // Check if this reporter is already added (avoid duplicates)
            const existingReporter = reporters.find(r => r.id === reporter.reporterId);
            if (!existingReporter) {
                const reporterName = this.getMemberName(
                    reporter.reporterName, 
                    reporter.reporterMmidName, 
                    reporter.reporterId
                );
                reporters.push({
                    id: reporter.reporterId,
                    name: reporterName
                });
            }
        });

        // Format posts similar to collectPosts function
        let posts: Post[] = []
        for (let index = 0; index < postEntities.length; index++) {
            const element = postEntities[index];

            if(element.member == null) {
                continue;
            }

            let reactions: Reaction[] = []
            const reactionMap: Record<string, { reaction:string, count: number; reacted: boolean }> = {};

            const reactionCount = element.reactionList.length

            for (const reaction of element.reactionList) {
                const type = reaction.reaction;
                if (!reactionMap[type]) {
                reactionMap[type] = { reaction: type, count: 0, reacted: false };
                }

                reactionMap[type].count++;

                if(reaction.member !== null) {
                    // Since this is admin view, we don't need to check if user reacted
                    reactionMap[type].reacted = false;
                }
            }
            reactions = Object.values(reactionMap);

            let tags: Tag[] = []

            if(element.tags != null) {
                let listTags = JSON.parse(element.tags)
                for (let index = 0; index < listTags.length; index++) {
                    const item = listTags[index];
                    
                    //check if id type string
                    if(typeof item.id === 'string') {
                        // check in database tag and get the id
                        let tag = await this.tagRepository.findOneBy({tagId:item.id})
                        if(tag) {
                            item.id = tag.id
                        }
                    }

                    let tag: Tag = {
                        slug: item.slug,
                        id: item.id,
                        title: item.title
                    }
                    tags.push(tag)
                }
            }

            let medias: Media[]= []

            let listMedias = element.medias

            for (let index = 0; index < listMedias.length; index++) {
                const asset = listMedias[index];
    
                let info = JSON.parse(asset.info)
                let insertMedia: Media = {
                    id: asset.id,
                    url: asset.url_open,
                    type: asset.type == null? info.__typename:asset.type
                }
    
                if(asset.type == 'Video') {
                   insertMedia.thumbnail = info.thumbnail
                } else {
                    insertMedia.thumbnail = {
                        url: asset.url_open,
                        width: info.width,
                        height: info.height,
                        type: asset.type
                    }
                }
    
                medias.push(insertMedia)
            }

            let published_at_title = this.dateHelper.getDateRange(new Date(element.created_at), new Date())

            let name = this.getMemberName(element.member.name, element.member.mmid_fullname, element.member.id)

            // Get report statistics for this post
            const postReportStats = reportStatsMap.get(element.id) || { reportCount: 0, reporterCount: 0 };
            const postReporters = reporterNamesMap.get(element.id) || [];
            const reportDescription = this.generateReportDescription(
                postReportStats.reportCount, 
                postReportStats.reporterCount, 
                postReporters
            );

            let post: Post = {
                id: element.id,
                title: element.title,
                description: element.textContent,
                textContent: element.textContent,
                image: element.image,
                reaction: reactions,
                tags: tags,
                repliesCount: element.repliesCount,
                reactionCount: reactionCount,
                member: {
                    id: element.member.id,
                    name: name,
                    email: element.member.email,
                    profilePictureUrl: element.member.profilePictureUrl,
                    is_dealer: element.member.is_dealer
                },
                space: {
                    id: element.space.id,
                    name: element.space.name,
                    description: element.space.description, 
                    postsCount: element.space.postsCount,
                    membersCount: element.space.membersCount 
                },
                medias: medias,
                mmidUserId: element.member.userId || 0,
                totalRepliesCount: element.totalRepliesCount,
                created_at: this.formatDate(element.created_at),
                published_at: this.formatDate(element.updated_at),
                published_at_title: published_at_title,
                type: element.type,
                is_post_owner: false, // Admin view, so not post owner
                share_url: `${this.deeplink}/deeplink/mimate?page=post&id=${element.id}`,
                reportCount: postReportStats.reportCount,
                reporterCount: postReportStats.reporterCount,
                reportDescription: reportDescription
            }
            posts.push(post)
        }

        // save in redis
        redisInfo = {
            totalData: totalData,
            hasNext: (totalData > (page * limit)),
            page: page,
            limit: limit,
            offset: offset,
            after: after
        }

        // describe again for get new key
        cacheKey = `adminPostReports:${after}`;
        await this.redis.set(cacheKey, JSON.stringify(redisInfo), 'EX', 60 * 5); // 5 min TTL

        return {
            totalData: totalData,
            hasNext: (totalData > (page * limit)),
            page: page,
            limit: limit,
            offset: offset,
            after: after,
            data: posts
        };
    }

    async getReportersByPostId(postId: number) {
        const reporters = await this.postReportRepository.createQueryBuilder('post_report')
            .leftJoinAndSelect('post_report.reportedBy', 'reportedBy')
            .leftJoinAndSelect('post_report.post', 'post')
            .where('post_report.post_id = :postId', { postId })
            .andWhere('post_report.status = :status', { status: true })
            .orderBy('post_report.created_at', 'DESC')
            .getMany();

        return {
            postId: postId,
            totalReporters: reporters.length,
            reporters: reporters.map(report => ({
                reportId: report.id,
                reporter: {
                    id: report.reportedBy.id,
                    name: report.reportedBy.name,
                    email: report.reportedBy.email,
                    profilePictureUrl: report.reportedBy.profilePictureUrl,
                    mmid_fullname: report.reportedBy.mmid_fullname
                },
                reason: report.reason,
                description: report.description,
                reportedAt: report.created_at,
                isSolved: report.is_solved,
                solvedDescription: report.solved_description
            }))
        };
    }

    async notAcceptingReport(postId: number, adminName: string) {
        const currentDateTime = new Date();
        const reason = `Report not accepting by ${adminName} at ${currentDateTime.toISOString()}`;

        // find post in report is exist or not
        const postReport = await this.postReportRepository.findOneBy({ post: { id: postId } });
        if (!postReport) {
            throw new NotFoundException('Post not found');
        }

        // Update all reports for this post
        await this.postReportRepository.createQueryBuilder()
            .update(PostReport)
            .set({
                status: false,
                is_solved: true,
                solved_description: reason,
                updated_at: currentDateTime
            })
            .where('post_id = :postId', { postId })
            .execute();

        return {
            success: true,
            message: 'Report not accepted',
            postId: postId,
            action: 'not_accepting',
            adminName: adminName,
            timestamp: currentDateTime
        };
    }

    async hidePostReport(postId: number, adminName: string) {
        const currentDateTime = new Date();
        const reason = `Report hide by ${adminName} at ${currentDateTime.toISOString()}`;

        // find post in report is exist or not
        const postReport = await this.postReportRepository.findOneBy({ post: { id: postId } });
        if (!postReport) {
            throw new NotFoundException('Post not found');
        }

        // Update all reports for this post
        await this.postReportRepository.createQueryBuilder()
            .update(PostReport)
            .set({
                status: false,
                is_solved: true,
                solved_description: reason,
                updated_at: currentDateTime
            })
            .where('post_id = :postId', { postId })
            .execute();

        // Update post to be hidden
        await this.postRepository.createQueryBuilder()
            .update(PostEntity)
            .set({
                isHidden: true,
                updated_at: currentDateTime
            })
            .where('id = :postId', { postId })
            .execute();

        return {
            success: true,
            message: 'Post hidden and reports resolved',
            postId: postId,
            action: 'hide_post',
            adminName: adminName,
            timestamp: currentDateTime
        };
    }

    async deletePostReport(postId: number, adminName: string) {
        const currentDateTime = new Date();
        const reason = `Report DELETED by ${adminName} at ${currentDateTime.toISOString()}`;

        // find post in report is exist or not
        const postReport = await this.postReportRepository.findOneBy({ post: { id: postId } });
        if (!postReport) {
            throw new NotFoundException('Post not found');
        }

        // Update all reports for this post
        await this.postReportRepository.createQueryBuilder()
            .update(PostReport)
            .set({
                status: false,
                is_solved: true,
                solved_description: reason,
                updated_at: currentDateTime
            })
            .where('post_id = :postId', { postId })
            .execute();

        // Delete the post
        await this.postRepository.createQueryBuilder()
            .softDelete()
            .from(PostEntity)
            .where('id = :postId', { postId })
            .execute();

        return {
            success: true,
            message: 'Post deleted and reports resolved',
            postId: postId,
            action: 'delete_post',
            adminName: adminName,
            timestamp: currentDateTime
        };
    }
}
