import { Injectable } from "@nestjs/common";

import { InjectRepository } from "@nestjs/typeorm";
import { Activity } from "src/entity/activity.entity";
import { PostEntity } from "src/entity/post.entity";
import { Between, Repository } from "typeorm";

@Injectable()
export class ReportPostService {

    protected  dateStart: Date;
    protected  dateEnd: Date;

    protected  dateStartBefore: Date;
    protected  dateEndBefore: Date;

    constructor(
        @InjectRepository(PostEntity, 'mimate')
        private readonly postRepository: Repository<PostEntity>,

        // repository
        @InjectRepository(Activity, 'mimate')
        private readonly activityRepository: Repository<Activity>,
    ) {}


    async postActivity(start_date: Date, end_date: Date) {
        // Set start and end date with correct times
        this.dateStart = new Date(start_date);
        this.dateStart.setHours(0, 0, 0, 0); // 00:00:00

        this.dateEnd = new Date(end_date);
        this.dateEnd.setHours(23, 59, 59, 999); // 23:59:59.999

        // Calculate number of full days in the range
        const days = Math.ceil((this.dateEnd.getTime() - this.dateStart.getTime()) / (1000 * 60 * 60 * 24));

        // Create the previous date range
        const new_date_start = new Date(this.dateStart);
        new_date_start.setDate(new_date_start.getDate() - days);
        new_date_start.setHours(0, 0, 0, 0); // Ensure start of day

        const new_date_end = new Date(this.dateStart);
        new_date_end.setDate(new_date_end.getDate() - 1);
        new_date_end.setHours(23, 59, 59, 999); // End of previous day

        // Optionally assign
        this.dateStartBefore = new_date_start;
        this.dateEndBefore = new_date_end;

        // new posts
        const {total: total_new_posts, percentage: percentage_new_posts} = await this.newPosts();

        // new replies
        const {total: total_new_replies, percentage: percentage_new_replies} = await this.newReplies();

        // new reactions
        const {total: total_new_reactions, percentage: percentage_new_reactions} = await this.newReactions();


        return {
            new_posts: {
                total: total_new_posts,
                percentage: percentage_new_posts
            },
            new_replies: {
                total: total_new_replies,
                percentage: percentage_new_replies
            },
            new_reactions: {
                total: total_new_reactions,
                percentage: percentage_new_reactions
            }
        }
    }

    // new posts daily
    async newPostsDaily(start_date: Date, end_date: Date) {
        // get how many days from date start and date end
        const range_day = Math.ceil((end_date.getTime() - start_date.getTime()) / (24 * 60 * 60 * 1000));


        // get date now
        const date_now = end_date


        // gate dates in 7 days before date now
        const dates = []
        for (let index = 0; index <= range_day; index++) {
            const date = new Date(date_now.getTime() - index * 24 * 60 * 60 * 1000)
            dates.push(date)
        }

        let result = []

        // loop dates and get activity by days
        for (let index = 0; index < dates.length; index++) {
            const date = dates[index];

            // add time in date, if date start add 00:00:00 and if date end add 23:59:59
            const date_start = new Date(date.setHours(0, 0, 0, 0))
            const date_end = new Date(date.setHours(23, 59, 59, 999))

            // get activity by days
            const count = await this.activityRepository
                .createQueryBuilder('activity')
                .select('COUNT(*)', 'count')
                .where('activity.createdAt BETWEEN :start AND :end', {
                start: date_start,
                end: date_end,
                })
                .andWhere('activity.targetType = :targetType', { targetType: 'post' })
                .andWhere('activity.action = :action', { action: 'create' })
                .getRawOne();

            result.push({
                // format date in yyyy-mm-dd
                date: date.toISOString().split('T')[0],
                activity: count.count
            })


        }

        // reverse result
        result.reverse()

        return result
    }

    // new posts
    async newPosts() {
        let percentage:number
       let count_1 = await this.activityRepository.count({
            where: {
                createdAt: Between(this.dateStart, this.dateEnd),
                targetType: 'post',
                action: 'create'
            }
        })


        let count_2 = await this.activityRepository.count({
            where: {
                createdAt: Between(this.dateStartBefore, this.dateEndBefore),
                targetType: 'post',
                action: 'create'
            }
        })



        if(count_2 > 0) {
            percentage = Math.ceil((count_1 - count_2) / count_2 * 100);
        } else if(count_1 > 0) {
            percentage = 100;
        } else {
            percentage = 0;
        }

        return {total: count_1, percentage};
    }

    // new replies
    async newReplies() {
        let percentage:number
        let count_1 = await this.activityRepository.count({
            where: {
                createdAt: Between(this.dateStart, this.dateEnd),
                targetType: 'comment',
                action: 'create'
            }
        })

        let count_2 = await this.activityRepository.count({
            where: {
                createdAt: Between(this.dateStartBefore, this.dateEndBefore),
                targetType: 'comment',
                action: 'create'
            }
        })

        if(count_2 > 0) {
            percentage = Math.ceil((count_1 - count_2) / count_2 * 100);
        } else if(count_1 > 0) {
            percentage = 100;
        } else {
            percentage = 0;
        }

        return {total: count_1, percentage};
    }

    // new reactions
    async newReactions() {
        let percentage:number
        let count_1 = await this.activityRepository.count({
            where: {
                createdAt: Between(this.dateStart, this.dateEnd),
                targetType: 'reaction',
                action: 'create'
            }
        })

        let count_2 = await this.activityRepository.count({
            where: {
                createdAt: Between(this.dateStartBefore, this.dateEndBefore),
                targetType: 'reaction',
                action: 'create'
            }
        })

        if(count_2 > 0) {
            percentage = Math.ceil((count_1 - count_2) / count_2 * 100);
        } else if(count_1 > 0) {
            percentage = 100;
        } else {
            percentage = 0;
        }

        return {total: count_1, percentage};
    }
    
}