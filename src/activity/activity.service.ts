import { formatUtc as format } from '../common/helpers/date.helper';
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual, Between, Not, IsNull, In } from 'typeorm';
import { Activity } from '../entity/activity.entity';
import { ActivityAnalyticsDto, ActivityDto } from './dto/activity.dto';

import { PostEntity } from 'src/entity/post.entity';
import { QuestService } from 'src/quest/quest.service';
import { CommentEntity } from 'src/entity/comment.entity';
import { ReactionEntity } from 'src/entity/reaction.entity';
import { DateHelper } from 'src/common/helpers/date.helper';
import { member, notification, NotificationCollectionResponse } from './interfaces/notification.intrface';
import { Information } from 'src/post/interfaces/post.interface';
import { v1 as uuidv1 } from 'uuid';
import Redis from 'ioredis';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { UserAdmin } from 'src/entity/user-admin.entity'
import { OlympicService } from './olympic.service';
@Injectable()
export class ActivityService {
    private redis: Redis; // Configure as needed
    constructor(
        @InjectRepository(Activity, 'mimate')
        private activityRepository: Repository<Activity>,
        // POST ENTITY
        @InjectRepository(PostEntity, 'mimate')
        private postRepository: Repository<PostEntity>,

        // COMMENT ENTITY
        @InjectRepository(CommentEntity, 'mimate')
        private commentRepository: Repository<CommentEntity>,

        // REACTION ENTITY
        @InjectRepository(ReactionEntity, 'mimate')
        private reactionRepository: Repository<ReactionEntity>,

        // MEMBER ENTITY
        @InjectRepository(UserMimateEntity, 'mimate')
        private memberRepository: Repository<UserMimateEntity>,

        private readonly dateHelper: DateHelper,

        private readonly questService: QuestService,
        private readonly redisService: RedisService,
        private readonly olympicService: OlympicService,

        // USER ADMIN ENTITY
        @InjectRepository(UserAdmin, 'mimate')
        private userAdmin: Repository<UserAdmin>,

    ) {
        this.redis = this.redisService.getOrNil('default')
        if (!this.redis) {
            console.warn('Redis client not found. Skipping cache initialization.');
        }
    }





    // check if already logged in per day
    async checkIfLoggedInPerDay(userId: number): Promise<boolean> {
        const lastLogin = await this.activityRepository.findOne({
            where: { userId, action: 'login', createdAt: MoreThanOrEqual(new Date(new Date().setUTCHours(0, 0, 0, 0))) }
        });
        return lastLogin !== null;
    }

    async createActivity(activityDto: ActivityDto): Promise<Boolean> {

        const { userId, action, postId, commentId, reactionId, targetType, source, hit_from } = activityDto;

        if (targetType !== 'post' && targetType !== 'comment' && targetType !== 'reaction' && targetType !== 'login') {
            return false
        }

        const activity: Activity = {
            userId: userId,
            action: action,
            postId: postId,
            commentId: commentId,
            reactionId: reactionId,
            targetType: targetType,
            createdAt: new Date(),
            source: source,
            hit_from: hit_from
        }

        let message: string = ''


        // if postId is not null, then get post
        if (postId) {
            const post = await this.postRepository.findOne({
                where: { id: postId },
                relations: ['member']
            })

            // get memberInfo
            const memberInfo = await this.memberRepository.findOne({
                where: { id: userId }
            })

            let saveNotif = false

            if (targetType === 'comment') {
                if (action === 'create') {

                    message = `<b>${this.getMemberName(memberInfo.name, memberInfo.mmid_fullname, memberInfo.id)}</b> replied to <b>${post.title}</b>`
                    saveNotif = true
                }
            }

            if (targetType === 'reaction') {
                if (action === 'create') {
                    message = `<b>${this.getMemberName(memberInfo.name, memberInfo.mmid_fullname, memberInfo.id)}</b> liked your post <b>${post.title}</b>`
                    saveNotif = true
                }
            }

            if (saveNotif) {

                activity.message = message
                activity.targetUserId = post.member.id
            }
        }

        // save activity
        await this.activityRepository.save(activity)



        // olympic campaign
        // if (targetType === 'post' && action === 'create') {
        //     await this.olympicService.injectPointPost(postId, userId);
        // }

        // if (targetType === 'comment' && action === 'create') {
        //     await this.olympicService.injectPointComment(postId, userId, commentId);
        // }

        // if (targetType === 'reaction' && action === 'create') {
        //     await this.olympicService.injectPointReaction(postId, userId, commentId, reactionId);
        // }

        // check if target is comment
        if (targetType === 'comment' && action === 'create') {
            await this.injectPointToCommentOwner(postId, commentId, userId)
            await this.injectPointToPostOwner(postId, userId)
        }

        // // check if target is reaction
        if (targetType === 'reaction') {
            await this.injectPointToPostOwnerLike(postId, reactionId, userId)
            await this.injectPointToPostOwner(postId, userId)
        }

        return true
    }

    // if post owner get 5 comment
    async injectPointToPostOwner(postId: number, userId: number): Promise<Boolean> {
        // inject point to post owner when post has 5 replies
        try {
            let point = 0

            let infoPoint = await this.questService.getQuest('default_create_post')

            if (infoPoint.status === 0) {
                return false
            }

            const post = await this.postRepository.findOne({
                where: {
                    id: postId
                },
                relations: ['member']
            })

            if (!post || !post.member) {
                return false
            }

            if (post.member.id == userId) {
                return false
            }

            if (post.member?.member_role === 1) {
                return false;
            }


            // find in history, already get point
            let params = {
                memberId: post.member.id,
                questId: infoPoint.id,
                postId: postId,
            }

            // check if already get point
            let isAlreadyGetPoint = await this.questService.questAlreadyGetPoint(params);

            if (isAlreadyGetPoint) {
                return false
            }

            point = infoPoint.point

            let totalRepliesCount = 0
            let reactionsCount = 0

            // find replies not from userId
            totalRepliesCount = await this.commentRepository.count({
                where: {
                    post: {
                        id: postId
                    },
                    member: {
                        id: Not(post.member.id)
                    }
                }
            })


            reactionsCount = await this.reactionRepository.count({
                where: {
                    post: {
                        id: postId
                    },
                    member: {
                        id: Not(post.member.id)
                    }
                }
            })






            // find total replies
            if (totalRepliesCount >= 5) {
                // get point
                await this.questService.questSetPoint({
                    memberId: post.member.id,
                    questId: infoPoint.id,
                    point: point,
                    source: 'quest',
                    postId: postId,
                    note: 'Get point for comments 5 times'
                })
            } else if (reactionsCount >= 5) {
                // get point
                await this.questService.questSetPoint({
                    memberId: post.member.id,
                    questId: infoPoint.id,
                    point: point,
                    source: 'quest',
                    postId: postId,
                    note: 'Get point for reaction 5 times'
                })
            }
        } catch (error) {
            return false
        }
    }

    // if post from admin, inject point to comment owner
    async injectPointToCommentOwner(postId: number, commentId: number, userId: number): Promise<Boolean> {
        // inject point to comment owner when comment has 5 replies
        try {
            let point = 0

            // find post
            const post = await this.postRepository.findOne({
                where: { id: postId },
                relations: ['member']
            })

            if (!post) {
                return false;
            }

            if (post.backup_member_id == userId) {
                return false
            }



            // find point
            let key = 'default_comment_post'
            let note = 'get point from comment in admin post';

            if (post.member?.member_role === 0) {
                key = 'default_comment_member_post'
                note = 'get point from comment in member post';
            }

            let infoPoint = await this.questService.getQuest(key)

            if (!infoPoint || infoPoint.status == 0) {
                return false;
            }

            //  find comment
            const comment = await this.commentRepository.findOne({
                where: { id: commentId },
                relations: ['member']
            })

            if (!comment || !comment.member) {
                return false;
            }

            let params = {
                memberId: comment.member.id,
                questId: infoPoint.id,
                postId: postId,
                commentId: commentId,
            }

            // check if already get point
            let isAlreadyGetPoint = await this.questService.questAlreadyGetPoint(params);

            if (isAlreadyGetPoint) {
                return false
            }

            point = infoPoint.point

            await this.questService.questSetPoint({
                memberId: comment.member.id,
                questId: infoPoint.id,
                point: point,
                source: 'quest',
                postId: postId,
                commentId: commentId,
                note: note
            })

            return true

        } catch (error) {
            return false
        }
    }


    // if post from admin get like  
    async injectPointToPostOwnerLike(postId: number, reactionId: number, userId: number): Promise<Boolean> {
        try {
            let point = 0


            // find post
            const post = await this.postRepository.findOne({
                where: { id: postId },
                relations: ['member']
            })

            if (!post) {
                return false;
            }

            if (post.backup_member_id == userId) {
                return false;
            }

            // find point
            let key = 'default_like_post'
            let note = 'get point from reaction in admin post';

            if (post.member?.member_role === 0) {
                key = 'default_like_member_post';
                note = 'get point from reaction in member post';
            }

            // find point
            let infoPoint = await this.questService.getQuest(key)

            if (!infoPoint || infoPoint.status === 0) {
                return false
            }


            // find reaction
            const reaction = await this.reactionRepository.findOne({
                where: { id: reactionId },
                relations: ['member']
            })

            if (!reaction || !reaction.member) {
                return false;
            }

            // check if already get point
            let params = {
                memberId: reaction.member.id,
                questId: infoPoint.id,
                postId: postId,
                reactionId: reactionId,
            }

            // check if already get point
            let isAlreadyGetPoint = await this.questService.questAlreadyGetPoint(params);

            if (isAlreadyGetPoint) {
                return false
            }

            point = infoPoint.point

            await this.questService.questSetPoint({
                memberId: reaction.member.id,
                questId: infoPoint.id,
                point: point,
                source: 'quest',
                postId: postId,
                reactionId: reactionId,
                note: note

            })

            return true

        } catch (error) {
            return false
        }
    }


    protected normalizeDateRange(
        start_date?: Date,
        end_date?: Date
    ): { start?: Date; end?: Date } {
        if (!start_date || !end_date) return {};

        const start = new Date(start_date);
        start.setUTCHours(0, 0, 0, 0);

        const end = new Date(end_date);
        end.setUTCHours(23, 59, 59, 999);

        return { start, end };
    }




    // analytics
    async getRepliesAnalytics(dto: ActivityAnalyticsDto, postId: number): Promise<any> {

        const { start_date, end_date } = dto;
        // Normalize to full-day range
        const { start: normalizedStartDate, end: normalizedEndDate } = this.normalizeDateRange(start_date, end_date);

        const date = `${format(normalizedStartDate, 'dd/MM/yyyy')} - ${format(normalizedEndDate, 'dd/MM/yyyy')}`;

        // Calculate duration
        const duration = Math.floor((normalizedEndDate.getTime() - normalizedStartDate.getTime()) / 86400000);

        // Previous period range
        const beforeStartDate = new Date(normalizedStartDate.getTime() - duration * 86400000);
        const beforeEndDate = normalizedStartDate;


        // Current window (treat this.dateStart/End as UTC; use UTC for WHERE)
        const startUtc = new Date(normalizedStartDate.getTime());
        const endUtc = new Date(normalizedEndDate.getTime());

        // Previous window
        const startUtcPrev = new Date(beforeStartDate.getTime());
        const endUtcPrev = new Date(beforeEndDate.getTime());

        // Totals
        const count_1 = await this.commentRepository.count({
            where: { created_at: Between(startUtc, endUtc), post: { id: postId } },
            relations: ['post']
        });

        const detailRows = await this.commentRepository
            .createQueryBuilder('comment')
            .select("DATE(comment.created_at)", "date")
            .addSelect("COUNT(*)", "count")
            .where("comment.created_at BETWEEN :start AND :end", { start: startUtc, end: endUtc })
            .andWhere('backup_post_with_attribute_id = :postId', { postId })
            .groupBy("DATE(comment.created_at)")
            .orderBy("date", "ASC")
            .getRawMany<{ date: string; count: string }>();

        const byDate = new Map<string, number>(
            detailRows.map(r => [new Date(r.date).toISOString().slice(0, 10), parseInt(r.count, 10) || 0]),
        );

        const detailCount: Array<{ date: string; count: number }> = [];
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;

        for (let t = normalizedStartDate.getTime(); t <= normalizedEndDate.getTime(); t += ONE_DAY_MS) {
            // Convert the UTC instant back to UTC calendar date string YYYY-MM-DD
            const ymd = new Date(t).toISOString().slice(0, 10);
            detailCount.push({ date: ymd, count: byDate.get(ymd) ?? 0 });
        }


        const count_2 = await this.commentRepository.count({
            where: { created_at: Between(startUtcPrev, endUtcPrev), post: { id: postId } },
            relations: ['post']
        });

        let percentage: number;
        if (count_2 > 0) percentage = Math.ceil(((count_1 - count_2) / count_2) * 100);
        else if (count_1 > 0) percentage = 100;
        else percentage = 0;


        return {
            count: count_1,
            countBefore: count_2,
            distance: count_2 - count_1,
            date,
            detail: detailCount,
            percentage
        };
    }

    async getReactionsAnalytics(dto: ActivityAnalyticsDto, postId: number): Promise<any> {

        const { start_date, end_date } = dto;
        // Normalize to full-day range
        const { start: normalizedStartDate, end: normalizedEndDate } = this.normalizeDateRange(start_date, end_date);

        const date = `${format(normalizedStartDate, 'dd/MM/yyyy')} - ${format(normalizedEndDate, 'dd/MM/yyyy')}`;

        // Calculate duration
        const duration = Math.floor((normalizedEndDate.getTime() - normalizedStartDate.getTime()) / 86400000);

        // Previous period range
        const beforeStartDate = new Date(normalizedStartDate.getTime() - duration * 86400000);
        const beforeEndDate = normalizedStartDate;


        // Current window (treat this.dateStart/End as UTC; use UTC for WHERE)
        const startUtc = new Date(normalizedStartDate.getTime());
        const endUtc = new Date(normalizedEndDate.getTime());

        // Previous window
        const startUtcPrev = new Date(beforeStartDate.getTime());
        const endUtcPrev = new Date(beforeEndDate.getTime());

        // Totals
        const count_1 = await this.reactionRepository.count({
            where: { created_at: Between(startUtc, endUtc), post: { id: postId } },
            relations: ['post']
        });

        const detailRows = await this.reactionRepository
            .createQueryBuilder('reaction')
            .select("DATE(reaction.created_at)", "date")
            .addSelect("COUNT(*)", "count")
            .where("reaction.created_at BETWEEN :start AND :end", { start: startUtc, end: endUtc })
            .andWhere('backup_post_with_attribute_id = :postId', { postId })
            .groupBy("DATE(reaction.created_at)")
            .orderBy("date", "ASC")
            .getRawMany<{ date: string; count: string }>();

        const byDate = new Map<string, number>(
            detailRows.map(r => [new Date(r.date).toISOString().slice(0, 10), parseInt(r.count, 10) || 0]),
        );

        const detailCount: Array<{ date: string; count: number }> = [];
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;

        for (let t = normalizedStartDate.getTime(); t <= normalizedEndDate.getTime(); t += ONE_DAY_MS) {
            // Convert the UTC instant back to UTC calendar date string YYYY-MM-DD
            const ymd = new Date(t).toISOString().slice(0, 10);
            detailCount.push({ date: ymd, count: byDate.get(ymd) ?? 0 });
        }


        const count_2 = await this.reactionRepository.count({
            where: { created_at: Between(startUtcPrev, endUtcPrev), post: { id: postId } },
            relations: ['post']
        });

        let percentage: number;
        if (count_2 > 0) percentage = Math.ceil(((count_1 - count_2) / count_2) * 100);
        else if (count_1 > 0) percentage = 100;
        else percentage = 0;



        return {
            count: count_1,
            countBefore: count_2,
            distance: count_2 - count_1,
            date,
            detail: detailCount,
            percentage
        };
    }

    async getSharesAnalytics(dto: ActivityAnalyticsDto, postId: number): Promise<any> {
        const { start_date, end_date } = dto;
        // Normalize to full-day range
        const { start: normalizedStartDate, end: normalizedEndDate } = this.normalizeDateRange(start_date, end_date);

        const date = `${format(normalizedStartDate, 'dd/MM/yyyy')} - ${format(normalizedEndDate, 'dd/MM/yyyy')}`;


        // Current window (treat this.dateStart/End as UTC; use UTC for WHERE)
        const startUtc = new Date(normalizedStartDate.getTime());
        const endUtc = new Date(normalizedEndDate.getTime());


        const detailRows = await this.activityRepository
            .createQueryBuilder('el')
            .select("DATE(el.createdAt)", "date")
            .addSelect("COUNT(*)", "count")
            .where("el.createdAt BETWEEN :start AND :end", { start: startUtc, end: endUtc })
            .andWhere('action = :action', { action: 'share' })
            .andWhere('postId = :postId', { postId })
            .groupBy("DATE(el.createdAt)")
            .orderBy("date", "ASC")
            .getRawMany<{ date: string; count: string }>();

        const byDate = new Map<string, number>(
            detailRows.map(r => [new Date(r.date).toISOString().slice(0, 10), parseInt(r.count, 10) || 0]),
        );

        const detailCount: Array<{ date: string; count: number }> = [];
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;

        for (let t = normalizedStartDate.getTime(); t <= normalizedEndDate.getTime(); t += ONE_DAY_MS) {
            // Convert the UTC instant back to UTC calendar date string YYYY-MM-DD
            const ymd = new Date(t).toISOString().slice(0, 10);
            detailCount.push({ date: ymd, count: byDate.get(ymd) ?? 0 });
        }

        const count = detailRows.reduce((sum, r) => sum + Number(r.count), 0);


        return {
            count,
            detail: detailCount
        };
    }


    async getActivityByRole(dto: ActivityAnalyticsDto, postId: number): Promise<any> {

        // reaction
        let { count: reactionsCount } = await this.getReactionsAnalytics(dto, postId)

        // comment
        let { count: commentsCount } = await this.getRepliesAnalytics(dto, postId)


        // share
        let { count: sharesCount } = await this.getSharesAnalytics(dto, postId)


        return {
            reaction: reactionsCount,
            comment: commentsCount,
            share: sharesCount
        }
    }

    // page view in 7 days before from now
    async getPageViewIn7DaysBefore(dto: ActivityAnalyticsDto, postId: number): Promise<any> {

        const { start_date, end_date } = dto;
        // Normalize to full-day range
        const { start: normalizedStartDate, end: normalizedEndDate } = this.normalizeDateRange(start_date, end_date);

        const date = `${format(normalizedStartDate, 'dd/MM/yyyy')} - ${format(normalizedEndDate, 'dd/MM/yyyy')}`;

        // Calculate duration
        const duration = Math.floor((normalizedEndDate.getTime() - normalizedStartDate.getTime()) / 86400000);

        // Previous period range
        const beforeStartDate = new Date(normalizedStartDate.getTime() - duration * 86400000);
        const beforeEndDate = normalizedStartDate;


        // Current window (treat this.dateStart/End as UTC; use UTC for WHERE)
        const startUtc = new Date(normalizedStartDate.getTime());
        const endUtc = new Date(normalizedEndDate.getTime());

        // Previous window
        const startUtcPrev = new Date(beforeStartDate.getTime());
        const endUtcPrev = new Date(beforeEndDate.getTime());

        const count_1 = await this.activityRepository.count({
            where: {
                createdAt: Between(startUtc, endUtc),
                postId: postId,
                action: 'view',
                targetType: 'post'
            },
        });


        const count_2 = await this.activityRepository.count({
            where: {
                createdAt: Between(startUtcPrev, endUtcPrev),
                postId: postId,
                action: 'view',
                targetType: 'post'
            },
        });

        let percentage: number;
        if (count_2 > 0) percentage = Math.ceil(((count_1 - count_2) / count_2) * 100);
        else if (count_1 > 0) percentage = 100;
        else percentage = 0;


        const rows = await this.activityRepository
            .createQueryBuilder('el')
            .select(`DAYOFWEEK(el.createdAt)`, 'dow') // 1=Sun..7=Sat
            .addSelect(`COUNT(el.userId)`, 'count') // distinct users
            .where('el.postId = :postId', { postId })
            .andWhere('el.action = :action', { action: 'view' })
            .andWhere('el.createdAt BETWEEN :start AND :end', { start: startUtc, end: endUtc })
            .groupBy(`DAYOFWEEK(el.createdAt)`)
            .orderBy('dow', 'ASC')
            .getRawMany<{ dow: string; count: string }>();

        const countsByDow = new Map<number, number>();
        for (const r of rows) countsByDow.set(Number(r.dow), Number(r.count) || 0);

        // Desired output order: Monday..Sunday
        const dayNames: Array<| 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'> =
            ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

        // MySQL DAYOFWEEK order (Sun..Sat) mapped to Monday..Sunday sequence:
        const mysqlDowOrder = [1, 2, 3, 4, 5, 6, 7];

        let mappingData = mysqlDowOrder.map((dow, idx) => ({
            day: dayNames[idx],
            count: countsByDow.get(dow) ?? 0,
        }));





        return {
            total: count_1,
            percentage: percentage,
            distance: count_2 - count_1,
            days: mappingData
        }
    }

    async getActivityOverTime(dto: ActivityAnalyticsDto, postId: number): Promise<any> {
        const { detail: replies } = await this.getRepliesAnalytics(dto, postId);
        const { detail: reactions } = await this.getReactionsAnalytics(dto, postId);
        const { detail: shares } = await this.getSharesAnalytics(dto, postId);

        // collect all possible dates
        const allDates = new Set([
            ...replies.map(r => r.date),
            ...reactions.map(r => r.date),
            ...shares.map(r => r.date),
        ]);

        // keep only dates where at least one dataset has count > 0
        const categories = Array.from(allDates).filter(date => {
            const r = replies.find(d => d.date === date)?.count ?? 0;
            const re = reactions.find(d => d.date === date)?.count ?? 0;
            const s = shares.find(d => d.date === date)?.count ?? 0;
            return r > 0 || re > 0 || s > 0;
        }).sort(); // sort ascending by date

        // map aligned data
        const data = [
            {
                name: 'Replies',
                data: categories.map(date => replies.find(d => d.date === date)?.count ?? 0),
            },
            {
                name: 'Reactions',
                data: categories.map(date => reactions.find(d => d.date === date)?.count ?? 0),
            },
            {
                name: 'Share',
                data: categories.map(date => shares.find(d => d.date === date)?.count ?? 0),
            },
        ];

        return { categories, data };
    }



    // get total view in 7 days before
    async getPopularTimes(dto: ActivityAnalyticsDto, postId: number): Promise<any> {
        const { start_date, end_date } = dto;
        // Normalize to full-day range
        const { start: normalizedStartDate, end: normalizedEndDate } = this.normalizeDateRange(start_date, end_date);

        const date = `${format(normalizedStartDate, 'dd/MM/yyyy')} - ${format(normalizedEndDate, 'dd/MM/yyyy')}`;

        // Calculate duration
        const duration = Math.floor((normalizedEndDate.getTime() - normalizedStartDate.getTime()) / 86400000);

        // Previous period range
        const beforeStartDate = new Date(normalizedStartDate.getTime() - duration * 86400000);
        const beforeEndDate = normalizedStartDate;


        // Current window (treat this.dateStart/End as UTC; use UTC for WHERE)
        const startUtc = new Date(normalizedStartDate.getTime());
        const endUtc = new Date(normalizedEndDate.getTime());

        // Previous window
        const startUtcPrev = new Date(beforeStartDate.getTime());
        const endUtcPrev = new Date(beforeEndDate.getTime());


        const rows = await this.activityRepository
            .createQueryBuilder('el')
            .select(`LPAD(HOUR(el.createdAt), 2, '0')`, 'hour_num')
            .addSelect(`COUNT(el.userId)`, 'count')
            .where('el.postId = :postId', { postId })
            .andWhere('el.targetType IN (:...target)', { target: ['post', 'comment', 'reaction'] })
            .andWhere('el.createdAt BETWEEN :start AND :end', { start: startUtc, end: endUtc })
            .groupBy(`hour_num`)
            .orderBy('hour_num', 'ASC')
            .getRawMany<{ hour_num: string; count: string }>();

        const rowsBefore = await this.activityRepository
            .createQueryBuilder('el')
            .select(`LPAD(HOUR(el.createdAt), 2, '0')`, 'hour_num')
            .addSelect(`COUNT(el.userId)`, 'count')
            .where('el.postId = :postId', { postId })
            .andWhere('el.targetType IN (:...target)', { target: ['post', 'comment', 'reaction'] })
            .andWhere('el.createdAt BETWEEN :start AND :end', { start: startUtcPrev, end: endUtcPrev })
            .groupBy(`hour_num`)
            .orderBy('hour_num', 'ASC')
            .getRawMany<{ hour_num: string; count: string }>();

        // Build a full, ordered 00..23 array
        const countsByHour = new Map<number, number>();
        for (const r of rows) countsByHour.set(Number(r.hour_num), Number(r.count) || 0);

        const result: Array<{ hour: string; count: number }> = [];
        for (let h = 0; h < 24; h++) {
            result.push({
                hour: String(h).padStart(2, '0'),
                count: countsByHour.get(h) ?? 0,
            });
        }

        const count_1 = rows.reduce((sum, r) => sum + Number(r.count), 0);
        const count_2 = rowsBefore.reduce((sum, r) => sum + Number(r.count), 0);

        let percentage: number;
        if (count_2 > 0) percentage = Math.ceil(((count_1 - count_2) / count_2) * 100);
        else if (count_1 > 0) percentage = 100;
        else percentage = 0;


        return {
            total: count_1,
            percentage: percentage,
            distance: count_2 - count_1,
            hours: result
        }

    }


    // post view in 7 days before
    async getPopularDays(dto: ActivityAnalyticsDto, postId: number): Promise<any> {
        const { start_date, end_date } = dto;
        // Normalize to full-day range
        const { start: normalizedStartDate, end: normalizedEndDate } = this.normalizeDateRange(start_date, end_date);

        const date = `${format(normalizedStartDate, 'dd/MM/yyyy')} - ${format(normalizedEndDate, 'dd/MM/yyyy')}`;

        // Calculate duration
        const duration = Math.floor((normalizedEndDate.getTime() - normalizedStartDate.getTime()) / 86400000);

        // Previous period range
        const beforeStartDate = new Date(normalizedStartDate.getTime() - duration * 86400000);
        const beforeEndDate = normalizedStartDate;


        // Current window (treat this.dateStart/End as UTC; use UTC for WHERE)
        const startUtc = new Date(normalizedStartDate.getTime());
        const endUtc = new Date(normalizedEndDate.getTime());

        // Previous window
        const startUtcPrev = new Date(beforeStartDate.getTime());
        const endUtcPrev = new Date(beforeEndDate.getTime());


        const rows = await this.activityRepository
            .createQueryBuilder('el')
            .select(`DAYOFWEEK(el.createdAt)`, 'dow') // 1=Sun..7=Sat
            .addSelect(`COUNT(el.userId)`, 'count') // distinct users
            .where('el.postId = :postId', { postId })
            .andWhere('el.targetType IN (:...target)', { target: ['post', 'comment', 'reaction'] })
            // .andWhere('el.action IN (:...action)', {action:['view', 'create']})
            .andWhere('el.createdAt BETWEEN :start AND :end', { start: startUtc, end: endUtc })
            .groupBy(`DAYOFWEEK(el.createdAt)`)
            .orderBy('dow', 'ASC')
            .getRawMany<{ dow: string; count: string }>();

        const rowsBefore = await this.activityRepository
            .createQueryBuilder('el')
            .select(`DAYOFWEEK(el.createdAt)`, 'dow') // 1=Sun..7=Sat
            .addSelect(`COUNT(el.userId)`, 'count') // distinct users
            .where('el.postId = :postId', { postId })
            .andWhere('el.targetType IN (:...target)', { target: ['post', 'comment', 'reaction'] })
            // .andWhere('el.action IN (:...action)', {action:['view', 'create']})
            .andWhere('el.createdAt BETWEEN :start AND :end', { start: startUtcPrev, end: endUtcPrev })
            .groupBy(`DAYOFWEEK(el.createdAt)`)
            .orderBy('dow', 'ASC')
            .getRawMany<{ dow: string; count: string }>();

        const countsByDow = new Map<number, number>();
        for (const r of rows) countsByDow.set(Number(r.dow), Number(r.count) || 0);

        // Desired output order: Monday..Sunday
        const dayNames: Array<| 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'> =
            ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

        // MySQL DAYOFWEEK order (Sun..Sat) mapped to Monday..Sunday sequence:
        const mysqlDowOrder = [1, 2, 3, 4, 5, 6, 7];

        let mappingData = mysqlDowOrder.map((dow, idx) => ({
            day: dayNames[idx],
            count: countsByDow.get(dow) ?? 0,
        }));



        const count_1 = rows.reduce((sum, r) => sum + Number(r.count), 0);
        const count_2 = rowsBefore.reduce((sum, r) => sum + Number(r.count), 0);

        let percentage: number;
        if (count_2 > 0) percentage = Math.ceil(((count_1 - count_2) / count_2) * 100);
        else if (count_1 > 0) percentage = 100;
        else percentage = 0;


        return {
            total: count_1,
            percentage: percentage,
            distance: count_2 - count_1,
            days: mappingData
        }


    }





    // 
    private getMemberName(name: string, mmid_fullname: string, id: number): string {

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



    // get all post activity by post id
    async getAllPostActivity(postId: number, page: number, limit: number): Promise<any> {

        // total data
        let total = await this.activityRepository.count({
            where: { postId: postId }
        })

        // get all activity by post id
        let query = await this.activityRepository.find({
            where: { postId: postId },
            relations: ['user'],
            skip: (page - 1) * limit,
            take: limit,
            order: {
                id: 'DESC'
            }
        })

        let data = []

        for (let list of query) {
            if (list.user == null) {
                continue
            }

            let wording = ''

            let memberName = this.getMemberName(list.user.name, list.user.mmid_fullname, list.user.id)

            // create wording
            if (list.targetType === 'comment') {
                wording = `${memberName} comment with action ${list.action} at ${list.postId ? 'post ' + list.postId : ''} on ${list.createdAt.toISOString()}`;
            } else if (list.targetType === 'reaction') {
                wording = `${memberName} reacted with action ${list.action} at ${list.postId ? 'post ' + list.postId : ''} on ${list.createdAt.toISOString()}`;
            } else if (list.targetType === 'post') {
                wording = `${memberName} created a post with action ${list.action} at ${list.createdAt.toISOString()}`;
            } else if (list.targetType === 'login') {
                wording = `${memberName} logged in with action ${list.action} at ${list.createdAt.toISOString()}`;
            } else {
                wording = `${memberName} activity at ${list.createdAt.toISOString()}`;
            }

            data.push({
                id: list.id,
                status: wording,
                type: list.targetType,
                createdAt: format(list.createdAt, 'dd/MM/yyyy HH:mm')
            })
        }
        return {
            items: data,
            recordsTotal: total,
            recordsFiltered: total,
        }
    }

    // get notif
    async getNotif(after: string, limit: number, memberId: number): Promise<NotificationCollectionResponse> {


        let countingTotalPost: boolean = true
        let totalData: number = 0
        let page: number = 1
        let offset: number = 0
        let cacheKey: string;
        let redisInfo: Information


        if (after != "") {
            // find in redis
            cacheKey = `notif:${after}`;
            const cachedInformation = await this.redis.get(cacheKey);

            if (cachedInformation) {
                redisInfo = JSON.parse(cachedInformation);
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

        let config: any = {
            where: {
                targetUserId: memberId
            },
            take: limit,
            skip: offset,
            order: {
                id: 'DESC'
            },
            relations: ['user']
        }



        // get data
        let query = await this.activityRepository.find(config)

        let results: notification[] = []

        // loop in interface
        for (let list of query) {

            let createdAtTitle = this.dateHelper.getDateRange(new Date(list.createdAt), new Date())

            // get member
            let member: member = {
                id: list.user.id,
                name: this.getMemberName(list.user.name, list.user.mmid_fullname, list.user.id),
                profilePictureUrl: list.user.profilePictureUrl
            }

            // in message have value <b> name profile </b> in <b> name profile </b> replace with member.name in first tag <b>, skip the other tag <b>
            // if have <b> name profile </b> in <b> name profile </b> replace with member.name in first tag <b>, skip the other tag <b>
            let replacedOnce = false;
            list.message = list.message.replace(/<b>(.*?)<\/b>/g, (match, p1) => {
                if (!replacedOnce) {
                    replacedOnce = true;
                    return `<b>${member.name}</b>`;
                }
                return match; // return the original match for all other tags
            });

            let notif: notification = {
                id: list.id,
                member: member,
                message: list.message,
                postId: list.postId,
                commentId: list.commentId,
                reactionId: list.reactionId,
                readAt: list.readAt,
                createdAt: list.createdAt,
                createdAtTitle: createdAtTitle
            }

            // push to array
            results.push(notif)
        }



        // save to redis
        await this.redis.set(`notif:${after}`, JSON.stringify({
            totalData: totalData,
            page: page,
            limit: limit,
            offset: offset,
        }), 'EX', 60 * 5)

        return {
            totalData: totalData,
            hasNext: (totalData < (page * limit)) ? false : true,
            page: page,
            limit: limit,
            offset: offset,
            after: after,
            data: results
        }
    }

    // mark as read
    async markAsRead(id: number): Promise<boolean> {
        try {
            await this.activityRepository.update(id, { readAt: new Date() })
            return true
        } catch (error) {
            return false
        }
    }
}
