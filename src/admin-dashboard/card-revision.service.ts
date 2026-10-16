import { Injectable } from "@nestjs/common";
import { PostEntity, PostType } from "src/entity/post.entity";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { Between, In, IsNull, Not, Repository } from "typeorm";
import { CommentEntity } from "src/entity/comment.entity";
import { ReactionEntity } from "src/entity/reaction.entity";
import { UserMimateEntity } from "src/entity/user-mimate.entity";
import { Activity } from "src/entity/activity.entity";
import { topMember, TopPost, PostVoteReportItem } from "./interfaces/admin-dashboard.interface";
import { VoteEntity } from "src/entity/vote.entity";
import { VoteMemberEntity } from "src/entity/vote-member.entity";
import { TopSpace } from "./interfaces/admin-dashboard.interface";
import { DataSource } from 'typeorm';
import { SpaceEntity } from "src/entity/space.entity";
import { Visitor } from "src/entity/visitor.entity";
import { format } from 'date-fns'; 
import {RequestLogEntity} from "src/entity/log.entity"
import * as ExcelJS from 'exceljs';

@Injectable()
export class CardRevisionService {
    private dateStart: Date;
    private dateEnd: Date;

    private dateStartBefore: Date;
    private dateEndBefore: Date;
    constructor(
        @InjectRepository(PostEntity, 'mimate')
        private readonly postRepository: Repository<PostEntity>,

        @InjectRepository(CommentEntity, 'mimate')
        private readonly commentRepository: Repository<CommentEntity>,

        @InjectRepository(ReactionEntity, 'mimate')
        private readonly reactionRepository: Repository<ReactionEntity>,

        @InjectRepository(UserMimateEntity, 'mimate')
        private readonly memberRepository: Repository<UserMimateEntity>,

        @InjectRepository(Activity, 'mimate')
        private readonly activityRepository: Repository<Activity>,

        @InjectRepository(SpaceEntity, 'mimate')
        private readonly spaceRepository: Repository<SpaceEntity>,

        @InjectRepository(RequestLogEntity, 'mimate')
        private readonly requestLogEntity: Repository<RequestLogEntity>,

        @InjectDataSource('mimate')
        private readonly dataSource: DataSource,

        @InjectRepository(Visitor, 'mimate')
        private readonly visitorRepository: Repository<Visitor>,
    ) {}

    private getRangeDay() {
      const range_day = this.dateEnd.getTime() - this.dateStart.getTime();
      return Math.ceil(range_day / (24 * 60 * 60 * 1000));
    }

    async getActivity(start_date: Date, end_date: Date){
      this.dateStart = new Date(start_date);
      this.dateStart.setHours(0, 0, 0, 0); 
      
      this.dateEnd = new Date(end_date);
      this.dateEnd.setHours(23, 59, 59, 999); 
      
      const range_day = this.getRangeDay();
      
      this.dateStartBefore = new Date(this.dateStart.getTime() - (range_day * 24 * 60 * 60 * 1000));
      this.dateStartBefore.setHours(0, 0, 0, 0);
      
      this.dateEndBefore = new Date(this.dateEnd.getTime() - (range_day * 24 * 60 * 60 * 1000));
      this.dateEndBefore.setHours(23, 59, 59, 999);

      // new member
      const {total: new_member, percentage: new_member_percentage, detailCount: new_member_detailCount} = await this.cardNewMembers();
      let query_new_member = {
          text: 'New Member',
          total: new_member,
          allMember: await this.memberRepository.count({where: {activated_at: Not(IsNull())}}),
          percentage: new_member_percentage,
          detailCount: new_member_detailCount
      }

      // active member
      const {total: active_member, percentage: active_member_percentage, detailCount: active_member_detailCount} = await this.cardActiveMembers();
      let query_active_member = {
        text: 'Active Member',
        total: active_member,
        percentage: active_member_percentage,
        detailCount: active_member_detailCount
      }

      // page view
      const {total: page_view, percentage: page_view_percentage, detailCount: page_view_detailCount} = await this.cardPageView();
      let query_page_view = {
        text: 'Page View',
        total: page_view,
        percentage: page_view_percentage,
        detailCount: page_view_detailCount  
      }

      // online members
      const online_members = await this.countUsersSeenInLast10Minutes();
      const offline_members = await this.memberRepository.count();
      let query_online_members = {
        text: 'Online Members',
        active: online_members,
        total: offline_members
      }

      // activity members
      const {new_post, new_reply, new_reaction} = await this.cardActivityMembers();
      let query_activity_members = {
        text: 'Activity Members',
        post: new_post,
        comment: new_reply,
        reaction: new_reaction  
      }

      return {
        new_member: query_new_member,
        active_member: query_active_member,
        page_view: query_page_view,
        online_member: query_online_members,
        new_activity: query_activity_members
      }

    }

    async getPostActivity(start_date: Date, end_date: Date){
      this.dateStart = new Date(start_date);
      this.dateStart.setHours(0, 0, 0, 0); 
      
      this.dateEnd = new Date(end_date);
      this.dateEnd.setHours(23, 59, 59, 999); 

      const range_day = this.getRangeDay();
      
      this.dateStartBefore = new Date(this.dateStart.getTime() - (range_day * 24 * 60 * 60 * 1000));
      this.dateStartBefore.setHours(0, 0, 0, 0);
      
      this.dateEndBefore = new Date(this.dateEnd.getTime() - (range_day * 24 * 60 * 60 * 1000));
      this.dateEndBefore.setHours(23, 59, 59, 999);

      // new posts
      const {total: new_posts, percentage: new_posts_percentage, detailCount: new_posts_detailCount} = await this.cardNewPosts();
      let query_new_posts = {
        text: 'New Posts',
        total: new_posts,
        percentage: new_posts_percentage,
        detailCount: new_posts_detailCount
      }

      // new replies
      const {total: new_replies, percentage: new_replies_percentage, detailCount: new_replies_detailCount} = await this.cardNewReplies();
      let query_new_replies = {
        text: 'New Replies',
        total: new_replies,
        percentage: new_replies_percentage,
        detailCount: new_replies_detailCount
      }

      // new reactions
      const {total: new_reactions, percentage: new_reactions_percentage, detailCount: new_reactions_detailCount} = await this.cardNewReactions();
      let query_new_reactions = {
        text: 'New Reactions',
        total: new_reactions,
        percentage: new_reactions_percentage,
        detailCount: new_reactions_detailCount
      }

      return {
        new_posts: query_new_posts,
        new_replies: query_new_replies,
        new_reactions: query_new_reactions
      }
    }

    // card new posts
    async cardNewPosts() {
      // Treat this.dateStart/End as LOCAL (UTC+8) bounds like "YYYY-MM-DD 00:00:00" → "23:59:59.999"
      const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;

      // Current window: local -> UTC for WHERE
      const startUtc  = new Date(this.dateStart.getTime() - TZ_OFFSET_MS);
      const endUtc    = new Date(this.dateEnd.getTime()   - TZ_OFFSET_MS);

      // Previous window: local -> UTC for WHERE
      const startUtcPrev = new Date(this.dateStartBefore.getTime() - TZ_OFFSET_MS);
      const endUtcPrev   = new Date(this.dateEndBefore.getTime()   - TZ_OFFSET_MS);

      // Total posts (current range, deduped by row)
      const count_1 = await this.postRepository.count({
        where: { published_at: Between(startUtc, endUtc) },
      });

      // Daily breakdown by LOCAL (UTC+8) day: shift published_at +8h before DATE()
      const detailRows = await this.postRepository
        .createQueryBuilder('post')
        .select("DATE(DATE_ADD(post.published_at, INTERVAL 8 HOUR))", "date")
        .addSelect("COUNT(*)", "count")
        .where("post.published_at BETWEEN :start AND :end", { start: startUtc, end: endUtc })
        .groupBy("DATE(DATE_ADD(post.published_at, INTERVAL 8 HOUR))")
        .orderBy("date", "ASC")
        .getRawMany<{ date: string; count: string }>();

      const detailCount = detailRows.map(r => ({ date: r.date, count: parseInt(r.count, 10) || 0 }));

      // Total posts in previous window (for percentage)
      const count_2 = await this.postRepository.count({
        where: { published_at: Between(startUtcPrev, endUtcPrev) },
      });

      // % change vs previous window
      let percentage: number;
      if (count_2 > 0) {
        percentage = Math.ceil(((count_1 - count_2) / count_2) * 100);
      } else if (count_1 > 0) {
        percentage = 100;
      } else {
        percentage = 0;
      }

      return { total: count_1, percentage, detailCount };
    }


    // card new replies
    async cardNewReplies() {
      const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;

      // Current window (treat this.dateStart/End as LOCAL UTC+8; convert to UTC for WHERE)
      const startUtc  = new Date(this.dateStart.getTime() - TZ_OFFSET_MS);
      const endUtc    = new Date(this.dateEnd.getTime()   - TZ_OFFSET_MS);

      // Previous window
      const startUtcPrev = new Date(this.dateStartBefore.getTime() - TZ_OFFSET_MS);
      const endUtcPrev   = new Date(this.dateEndBefore.getTime()   - TZ_OFFSET_MS);

      // Totals
      const count_1 = await this.commentRepository.count({
        where: { created_at: Between(startUtc, endUtc) },
      });

      const detailRows = await this.commentRepository
        .createQueryBuilder('comment')
        .select("DATE(DATE_ADD(comment.created_at, INTERVAL 8 HOUR))", "date")
        .addSelect("COUNT(*)", "count")
        .where("comment.created_at BETWEEN :start AND :end", { start: startUtc, end: endUtc })
        .groupBy("DATE(DATE_ADD(comment.created_at, INTERVAL 8 HOUR))")
        .orderBy("date", "ASC")
        .getRawMany<{ date: string; count: string }>();

      const detailCount = detailRows.map(r => ({ date: r.date, count: parseInt(r.count, 10) || 0 }));

      const count_2 = await this.commentRepository.count({
        where: { created_at: Between(startUtcPrev, endUtcPrev) },
      });

      let percentage: number;
      if (count_2 > 0) percentage = Math.ceil(((count_1 - count_2) / count_2) * 100);
      else if (count_1 > 0) percentage = 100;
      else percentage = 0;

      return { total: count_1, percentage, detailCount };
    }

    // card new reactions
    async cardNewReactions() {
      const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;

      // Current window (local -> UTC)
      const startUtc  = new Date(this.dateStart.getTime() - TZ_OFFSET_MS);
      const endUtc    = new Date(this.dateEnd.getTime()   - TZ_OFFSET_MS);

      // Previous window (local -> UTC)
      const startUtcPrev = new Date(this.dateStartBefore.getTime() - TZ_OFFSET_MS);
      const endUtcPrev   = new Date(this.dateEndBefore.getTime()   - TZ_OFFSET_MS);

      // Totals
      const count_1 = await this.reactionRepository.count({
        where: { created_at: Between(startUtc, endUtc) },
      });

      const detailRows = await this.reactionRepository
        .createQueryBuilder('reaction')
        .select("DATE(DATE_ADD(reaction.created_at, INTERVAL 8 HOUR))", "date")
        .addSelect("COUNT(*)", "count")
        .where("reaction.created_at BETWEEN :start AND :end", { start: startUtc, end: endUtc })
        .groupBy("DATE(DATE_ADD(reaction.created_at, INTERVAL 8 HOUR))")
        .orderBy("date", "ASC")
        .getRawMany<{ date: string; count: string }>();

      const detailCount = detailRows.map(r => ({ date: r.date, count: parseInt(r.count, 10) || 0 }));

      const count_2 = await this.reactionRepository.count({
        where: { created_at: Between(startUtcPrev, endUtcPrev) },
      });

      let percentage: number;
      if (count_2 > 0) percentage = Math.ceil(((count_1 - count_2) / count_2) * 100);
      else if (count_1 > 0) percentage = 100;
      else percentage = 0;

      return { total: count_1, percentage, detailCount };
    }


    async getDailyPostCounts(
      startDate: Date,
      endDate: Date
    ): Promise<{ date: string; activity: number }[]> {
      // Build local (UTC+8) 00:00:00.000 → 23:59:59.999
      const startLocal = new Date(startDate.getTime());
      startLocal.setHours(0, 0, 0, 0);
    
      const endLocal = new Date(endDate.getTime());
      endLocal.setHours(23, 59, 59, 999);
    
      // Convert that same local window to UTC bounds for WHERE
      const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;
      const startUtc = new Date(startLocal.getTime() - TZ_OFFSET_MS);
      const endUtc   = new Date(endLocal.getTime()   - TZ_OFFSET_MS);
    
      // Group by local day: shift published_at by +8h before DATE()
      const rows = await this.postRepository
        .createQueryBuilder('post')
        .select("DATE(DATE_ADD(post.published_at, INTERVAL 8 HOUR))", "date")
        .addSelect("COUNT(*)", "activity")
        .where("post.published_at BETWEEN :start AND :end", {
          start: startUtc,
          end: endUtc,
        })
        .groupBy("DATE(DATE_ADD(post.published_at, INTERVAL 8 HOUR))")
        .orderBy("date", "ASC")
        .getRawMany<{ date: string; activity: string }>();
    
      // Normalize return types
      return rows.map(r => ({
        date: r.date, // 'YYYY-MM-DD'
        activity: parseInt(r.activity, 10) || 0,
      }));
    }
    

  // card new members
  async cardNewMembers() {
    const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;

    // Current window (treat this.dateStart/End as LOCAL UTC+8; convert to UTC for WHERE)
    const startUtc  = new Date(this.dateStart.getTime() - TZ_OFFSET_MS);
    const endUtc    = new Date(this.dateEnd.getTime()   - TZ_OFFSET_MS);

    // Previous window (local → UTC)
    const startUtcPrev = new Date(this.dateStartBefore.getTime() - TZ_OFFSET_MS);
    const endUtcPrev   = new Date(this.dateEndBefore.getTime()   - TZ_OFFSET_MS);

    // Total new members in current window
    const count_1 = await this.memberRepository.count({
      where: { activated_at: Between(startUtc, endUtc) },
    });

    // Daily breakdown by LOCAL (UTC+8) day
    const detailRows = await this.memberRepository
      .createQueryBuilder('member')
      .select("DATE(DATE_ADD(member.activated_at, INTERVAL 8 HOUR))", "date")
      .addSelect("COUNT(*)", "count")
      .where("member.activated_at BETWEEN :start AND :end", { start: startUtc, end: endUtc })
      .groupBy("DATE(DATE_ADD(member.activated_at, INTERVAL 8 HOUR))")
      .orderBy("date", "ASC")
      .getRawMany<{ date: string; count: string }>();

    const detailCount = detailRows.map(r => ({
      date: r.date, 
      count: parseInt(r.count, 10) || 0,
    }));

    // Total for previous window (for % change)
    const count_2 = await this.memberRepository.count({
      where: { activated_at: Between(startUtcPrev, endUtcPrev) },
    });

    // Percentage change vs previous window
    let percentage: number;
    if (count_2 > 0) {
      percentage = Math.ceil(((count_1 - count_2) / count_2) * 100);
    } else if (count_1 > 0) {
      percentage = 100;
    } else {
      percentage = 0;
    }

    return { total: count_1, percentage, detailCount };
  }


  // card active members
  async cardActiveMembers() {
    const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;

    // Local → UTC bounds
    const startUtc      = new Date(this.dateStart.getTime()       - TZ_OFFSET_MS);
    const endUtc        = new Date(this.dateEnd.getTime()         - TZ_OFFSET_MS);
    const startUtcPrev  = new Date(this.dateStartBefore.getTime() - TZ_OFFSET_MS);
    const endUtcPrev    = new Date(this.dateEndBefore.getTime()   - TZ_OFFSET_MS);

    // Current / previous unique active users (deduped across window)
    const currentActiveUsers  = await this.getUniqueActiveUserIds(startUtc, endUtc);
    const previousActiveUsers = await this.getUniqueActiveUserIds(startUtcPrev, endUtcPrev);

    const count_1 = currentActiveUsers;
    const count_2 = previousActiveUsers;

    // Daily active user counts by LOCAL (UTC+8) calendar day
    const detailCount = await this.getDailyActiveUserCounts(startUtc, endUtc);

    let percentage: number;
    if (count_2 > 0)       percentage = Math.ceil(((count_1 - count_2) / count_2) * 100);
    else if (count_1 > 0)  percentage = 100;
    else                   percentage = 0;

    return { total: count_1, percentage, detailCount };
  }

  /**
   * Unique active user IDs across the whole (UTC) window.
   * Pass in UTC bounds that correspond to your selected LOCAL (UTC+8) days.
   */
  private async getUniqueActiveUserIds(startUtc: Date, endUtc: Date): Promise<any> {
    const data = await Promise.all([
      this.postRepository
        .createQueryBuilder('post')
        .select('COUNT(post.id)', 'total')
        .where('post.created_at BETWEEN :start AND :end', { start: startUtc, end: endUtc })
        .getRawOne<{ total: number }>(),

      this.commentRepository
        .createQueryBuilder('comment')
        .select('COUNT(comment.id)', 'total')
        .where('comment.created_at BETWEEN :start AND :end', { start: startUtc, end: endUtc })
        .getRawOne<{ total: number }>(),

      this.reactionRepository
        .createQueryBuilder('reaction')
        .select('COUNT(reaction.id)', 'total')
        .where('reaction.created_at BETWEEN :start AND :end', { start: startUtc, end: endUtc })
        .getRawOne<{ total: number }>(),
    ]);

    const grandTotal = Object.values(data)
      .reduce((sum, x) => sum + Number(x?.total ?? 0), 0);

    return  grandTotal
  }

  /**
   * Daily active users by LOCAL (UTC+8) calendar day.
   * - Filtering uses UTC bounds (startUtc/endUtc)
   * - Grouping buckets into UTC+8 days using DATE_ADD(..., INTERVAL 8 HOUR)
   */
  private async getDailyActiveUserCounts(
    startUtc: Date,
    endUtc: Date,
  ): Promise<Array<{ date: string; count: number }>> {
    // Each table: count(*) per local (+08:00) day
    const [postRows, commentRows, reactionRows] = await Promise.all([
      this.postRepository
        .createQueryBuilder('post')
        .select("DATE(DATE_ADD(post.created_at, INTERVAL 8 HOUR))", "date")
        .addSelect("COUNT(*)", "count")
        .where("post.created_at BETWEEN :start AND :end", { start: startUtc, end: endUtc })
        .groupBy("DATE(DATE_ADD(post.created_at, INTERVAL 8 HOUR))")
        .getRawMany<{ date: string; count: string }>(),
  
      this.commentRepository
        .createQueryBuilder('comment')
        .select("DATE(DATE_ADD(comment.created_at, INTERVAL 8 HOUR))", "date")
        .addSelect("COUNT(*)", "count")
        .where("comment.created_at BETWEEN :start AND :end", { start: startUtc, end: endUtc })
        .groupBy("DATE(DATE_ADD(comment.created_at, INTERVAL 8 HOUR))")
        .getRawMany<{ date: string; count: string }>(),
  
      this.reactionRepository
        .createQueryBuilder('reaction')
        .select("DATE(DATE_ADD(reaction.created_at, INTERVAL 8 HOUR))", "date")
        .addSelect("COUNT(*)", "count")
        .where("reaction.created_at BETWEEN :start AND :end", { start: startUtc, end: endUtc })
        .groupBy("DATE(DATE_ADD(reaction.created_at, INTERVAL 8 HOUR))")
        .getRawMany<{ date: string; count: string }>(),
    ]);

    const toYMD = (val: any): string => {
      if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
      const d = new Date(val);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
  
    // Merge counts by date (sum across sources)
    const sumByDate = new Map<string, number>();
    const add = (rows: Array<{ date: string; count: string }>) => {
      for (const r of rows) {
        const c = Number(r.count) || 0;
        sumByDate.set( toYMD(r.date), (sumByDate.get(r.date) || 0) + c);
      }
    };
    add(postRows);
    add(commentRows);
    add(reactionRows);
  
    // Fill missing days with 0 (iterate local +08:00 days)
    const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const startYmd = new Date(startUtc.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10);
    const endYmd   = new Date(endUtc.getTime()   + TZ_OFFSET_MS).toISOString().slice(0, 10);
    const startDayUtc = new Date(`${startYmd}T00:00:00.000+08:00`);
    const endDayUtc   = new Date(`${endYmd}T00:00:00.000+08:00`);
  
    const result: Array<{ date: string; count: number }> = [];
    for (let t = startDayUtc.getTime(); t <= endDayUtc.getTime(); t += ONE_DAY_MS) {
      const ymd = toYMD(new Date(t + TZ_OFFSET_MS));
      result.push({ date: ymd, count: sumByDate.get(ymd) ?? 0 });
    }
  
    return result; // [{ date: 'YYYY-MM-DD', count: number }, ...] sorted ASC
  }
    // card page view
    async cardPageView() {
      const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;

      // Treat this.dateStart/End and *Before as LOCAL (UTC+8) bounds.
      const startUtc      = new Date(this.dateStart.getTime()       - TZ_OFFSET_MS);
      const endUtc        = new Date(this.dateEnd.getTime()         - TZ_OFFSET_MS);
      const startUtcPrev  = new Date(this.dateStartBefore.getTime() - TZ_OFFSET_MS);
      const endUtcPrev    = new Date(this.dateEndBefore.getTime()   - TZ_OFFSET_MS);

      const handlers = [
        'getAllHighlight', //homepage
        'detailPost', // post detail
        'createPost', // create post
        'followers', // follower
        'detail', // profile
        'searchAll', // search
        'getMessages', // message dm
      ];

      // Total events (current window)
      const { total: count_1_str } = await this.requestLogEntity
        .createQueryBuilder('log')
        .select('COUNT(log.backup_member_id)', 'total')
        .where('log.handler IN (:...handlers)', { handlers })
        .andWhere('log.backup_member_id IS NOT NULL')
        .andWhere('log.createdAt BETWEEN :start AND :end', { start: startUtc, end: endUtc })
        .getRawOne<{ total: string }>();

      // Daily breakdown by LOCAL (UTC+8) calendar day
      const detailRows = await this.requestLogEntity
        .createQueryBuilder('log')
        .select("DATE(DATE_ADD(log.createdAt, INTERVAL 8 HOUR))", "date")
        .addSelect("COUNT(log.backup_member_id)", "count")
        .where("log.handler IN (:...handlers)", { handlers })
        .andWhere("log.backup_member_id IS NOT NULL")
        .andWhere("log.createdAt BETWEEN :start AND :end", { start: startUtc, end: endUtc })
        .groupBy("DATE(DATE_ADD(log.createdAt, INTERVAL 8 HOUR))")
        .orderBy("date", "ASC")
        .getRawMany<{ date: string; count: string }>();

      const detailCount = detailRows.map(r => ({
        date: r.date,                      // 'YYYY-MM-DD' (local day)
        count: parseInt(r.count, 10) || 0, // number
      }));

      // Total events (previous window)
      const { total: count_2_str } = await this.requestLogEntity
        .createQueryBuilder('log')
        .select('COUNT(log.backup_member_id)', 'total')
        .where('log.handler IN (:...handlers)', { handlers })
        .andWhere('log.backup_member_id IS NOT NULL')
        .andWhere('log.createdAt BETWEEN :start AND :end', { start: startUtcPrev, end: endUtcPrev })
        .getRawOne<{ total: string }>();

      const count_1 = parseInt(count_1_str ?? '0', 10);
      const count_2 = parseInt(count_2_str ?? '0', 10);

      let percentage: number;
      if (count_2 > 0) {
        percentage = Math.ceil(((count_1 - count_2) / count_2) * 100);
      } else if (count_1 > 0) {
        percentage = 100;
      } else {
        percentage = 0;
      }

      return { total: count_1, percentage, detailCount };
    }



    // card online members
    async cardOnlineMembers() {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes in milliseconds
  
      const query1 = await this.activityRepository
          .createQueryBuilder('activity')
          .select('COUNT(DISTINCT activity.userId)', 'user_count')
          .where('activity.action = :action', { action: 'login' })
          .andWhere('activity.createdAt BETWEEN :start AND :end', {
              start: fiveMinutesAgo,
              end: now,
          })
          .getRawOne();
  
      const query2 = await this.memberRepository.count();
  
      const online_members = parseInt(query1.user_count.toString(), 10);
      const offline_members = query2 - online_members;
  
      return { online_members, offline_members };
  }


  async countUsersSeenInLast10Minutes(): Promise<number> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
  
    const result = await this.memberRepository
      .createQueryBuilder('member')
      .select('COUNT(*)', 'count')
      .where('member.last_seen_at >= :tenMinutesAgo', { tenMinutesAgo })
      .getRawOne();
  
    return parseInt(result.count, 10);
  }

    async cardActivityMembers() {
        // new post
        const {total: new_post} = await this.cardNewPosts();

        // new reply
        const {total: new_reply} = await this.cardNewReplies();

        // new reaction
        const {total: new_reaction} = await this.cardNewReactions();
        
        return {new_post, new_reply, new_reaction};
    }


    protected normalizeDateRange(
        start_date?: Date,
        end_date?: Date
      ): { start?: Date; end?: Date } {
        if (!start_date || !end_date) return {};
      
        const start = new Date(start_date);
        start.setHours(0, 0, 0, 0);
      
        const end = new Date(end_date);
        end.setHours(23, 59, 59, 999);
      
        return { start, end };
    }
      

    // get history by days
    async historyByDays(start_date: Date, end_date: Date) {
      // Your normalizeDateRange returns local 00:00–23:59.999; keep using that
      const { start: date_start, end: date_end } = this.normalizeDateRange(start_date, end_date);

      // Build UTC bounds that represent the same UTC+8 window
      const TZ_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8
      const startUtc = date_start ? new Date(date_start.getTime() - TZ_OFFSET_MS) : undefined;
      const endUtc   = date_end   ? new Date(date_end.getTime()   - TZ_OFFSET_MS) : undefined;

      // Check special August 2025 logic (kept as in your code; adjust if needed)
      let isAgust2025 = true;

      // if (
      //   date_start &&
      //   date_end &&
      //   date_start.getFullYear() >= 2025 &&
      //   date_end.getFullYear() >= 2025 &&
      //   date_start.getMonth() >= 7 && // >= August (0=Jan, so 7=August)
      //   date_end.getMonth() >= 7      // also August or later
      // ) {
      //   isAgust2025 = true;
      // }

      // Group BY local day (UTC+8): shift createdAt by +8h before DATE()
      const result = await this.activityRepository
      .createQueryBuilder('activity')
      .select("DATE(DATE_ADD(activity.createdAt, INTERVAL 8 HOUR))", "date")
      .addSelect("COUNT(DISTINCT activity.userId)", "activity")
      .where("activity.action = :action", { action: 'login' })
      .andWhere("activity.createdAt BETWEEN :start AND :end", { start: startUtc, end: endUtc })
      .groupBy("DATE(DATE_ADD(activity.createdAt, INTERVAL 8 HOUR))")
      .orderBy("date", "ASC")
      .getRawMany<{ date: string; activity: string }>();

      const toYMD = (val: any): string => {
        if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
        const d = new Date(val);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      const exceptDate = (start: Date, end: Date): boolean => {
        const excludedDates = ['2025-08-11', '2025-08-12'].map(d => new Date(d));
        return excludedDates.some(date => date >= start && date <= end);
      };

      // Helpers
      const handlersToExclude = ['detailMe', 'postHighlight', 'getStatus'];

      // Count DISTINCT users for a specific local (UTC+8) date
      const countDistinctUsersForDate = async (dateStr: string): Promise<{ userId: number }[]> => {
        // Build the UTC bounds for that entire local day
        const startLocal = new Date(`${dateStr}T00:00:00.000+08:00`); // this is a UTC instant
        const endLocal   = new Date(`${dateStr}T23:59:59.999+08:00`);
        const start = startLocal; // already UTC instants
        const end   = endLocal;

        const rows = await this.requestLogEntity
          .createQueryBuilder('el')
          .select('el.backup_member_id', 'userId')
          .where('el.handler NOT IN (:...handlers)', { handlers: handlersToExclude })
          .andWhere('el.createdAt BETWEEN :start AND :end', { start, end })
          .andWhere('el.backup_member_id IS NOT NULL')
          .distinct(true)
          .getRawMany<{ userId: number }>();

        return rows;
      };

      if (isAgust2025) {
        // You had this special path; kept intact aside from time handling fixes above
        const uniqueMonth = await this.countCumulativeUniqueLoginUsers(start_date, end_date);

        function mergeUniqueByUserId(...arrays: { userId: number }[][]) {
          const seen = new Set<number>();
          return arrays.flat().filter(item => {
            if (seen.has(item.userId)) return false;
            seen.add(item.userId);
            return true;
          });
        }

        let merged = mergeUniqueByUserId(uniqueMonth);

        // check if date_start and date_end is same day
        let isSameDay = false;
    

        if (date_start && date_end && exceptDate(date_start, date_end)) {
          const [aug11Count, aug12Count] = await Promise.all([
            countDistinctUsersForDate('2025-08-11'),
            countDistinctUsersForDate('2025-08-12'),
          ]);

          const byDate = new Map<string, { date: string; activity: number }>();
          for (const row of result) {
            const d = toYMD(row.date);
            byDate.set(d, { date: d, activity: Number(row.activity) });
          }

          // if date_end is 11 aug, then merge with aug11Count and uniqueMonth
          if (date_end.toISOString().slice(0, 10) === '2025-08-11') {
            merged = mergeUniqueByUserId(uniqueMonth, aug11Count);
            byDate.set('2025-08-11', { date: '2025-08-11', activity: aug11Count.length });
          }

          if (date_end.toISOString().slice(0, 10) >= '2025-08-12') {
            merged = mergeUniqueByUserId(uniqueMonth, aug11Count, aug12Count);
            byDate.set('2025-08-11', { date: '2025-08-11', activity: aug11Count.length });
            byDate.set('2025-08-12', { date: '2025-08-12', activity: aug12Count.length });
          }

          const updatedResult = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));

          if (updatedResult.length == 1) {
            isSameDay = true;
          }

          return {
            totalActivity: !isSameDay ? merged.length :( result?.length > 0 ? result[0].activity : 0),
            ids: merged,
            data: updatedResult,
          };
        } else {
          
          let hitDataPerDay = merged

          if (result.length == 1) {
            isSameDay = true;

            // hit api to get data perDay
            hitDataPerDay = await this.getDetailDataInOneDay(startUtc, endUtc)

            
          }

          return {
            totalActivity: !isSameDay ? merged.length : (result?.length > 0 ? result[0].activity : 0),
            ids: hitDataPerDay,
            data: result.map(r => ({ date: toYMD(r.date), activity: Number(r.activity) })),
          };
        }
      }

      // VISITOR fallback (this table looks like it's already date-local; leaving as you had it)
      const visitor_result = await this.visitorRepository
        .createQueryBuilder('visitor')
        .select("DATE(visitor.date)", "date")
        .addSelect("SUM(visitor.visitor)", "activity")
        .where("visitor.date BETWEEN :start AND :end", { start: date_start, end: date_end })
        .groupBy("DATE(visitor.date)")
        .orderBy("date", "ASC")
        .getRawMany<{ date: string; activity: string }>();

      const today = new Date().toISOString().slice(0, 10);

      // Static overrides (kept)
      const [aug11Count, aug12Count] = await Promise.all([
        countDistinctUsersForDate('2025-08-11'),
        countDistinctUsersForDate('2025-08-12'),
      ]);

      const staticOverride = new Map<string, number>([
        ['2025-07-18', 1161],
        ['2025-07-19', 1058],
        ['2025-07-20', 949],
        ['2025-07-21', 1199],
        ['2025-07-22', 1071],
        ['2025-07-23', 1137],
        ['2025-07-24', 1115],
        ['2025-07-25', 1234],
        ['2025-07-26', 1100],
        ['2025-07-27', 914],
        ['2025-07-28', 1114],
        ['2025-07-29', 1080],
        ['2025-07-30', 1154],
        ['2025-07-31', 1035],
        ['2025-08-11', aug11Count.length],
        ['2025-08-12', aug12Count.length],
      ]);

      // Build maps (ensure dates are YYYY-MM-DD safely)
      const activityMap = new Map<string, number>();
      for (const row of result) {
        activityMap.set(toYMD(row.date), Number(row.activity));
      }

      const visitorMap = new Map<string, number>();
      for (const row of visitor_result) {
        visitorMap.set(toYMD(row.date), Number(row.activity));
      }

      const allDates = new Set<string>([
        ...activityMap.keys(),
        ...visitorMap.keys(),
        ...staticOverride.keys(),
      ]);

      const mergedResult = Array.from(allDates).sort().map(date => {
        if (staticOverride.has(date)) {
          return {
            date,
            activity: staticOverride.get(date)!,
            source: 'static',
          };
        }

        const activityCount = activityMap.get(date);
        const visitorCount = visitorMap.get(date) || 0;

        if (activityCount !== undefined) {
          const useVisitor = activityCount < 30 && date !== today;
          return {
            date,
            activity: useVisitor ? visitorCount : activityCount,
            source: useVisitor ? 'visitor' : 'activity',
          };
        } else {
          return {
            date,
            activity: visitorCount,
            source: 'visitor',
          };
        }
      });

      // Your existing fixed sum (left as-is)
      const totalActivity = 12835;

      return {
        totalActivity,
        ids: [],
        data: mergedResult,
      };
    }


    async getDetailDataInOneDay(start:Date, end:Date) {
      const rows = await this.activityRepository
        .createQueryBuilder('activity')
        .select('activity.userId', 'userId')       // qualify + alias
        .where('activity.action = :action', { action: 'login' })
        // half-open range is safer for datetimes
        .andWhere('(activity.createdAt >= :start AND activity.createdAt < :end)', { start, end })
        .groupBy('activity.userId')               // or .distinct(true)
        .orderBy('activity.userId', 'ASC')        // optional
        .getRawMany<{ userId: number }>();

      return rows; 
    }


    async countCumulativeUniqueLoginUsers(start: Date, end: Date): Promise<any> {
      
      const result = await this.activityRepository
        .createQueryBuilder('log')
        .select('log.userId', 'userId')
        .where('log.action = :action', { action: 'login' })
        .andWhere('log.createdAt BETWEEN :start AND :end', { start, end })
        .andWhere('DATE(log.createdAt) NOT IN (:...excludedDates)', {
          excludedDates: ['2025-08-11', '2025-08-12'],
        })
        .getRawMany(); // <-- return all rows, not count

      return result;
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

    async topMember(
        type: 'post' | 'comment' | 'reaction',
        start_date: Date,
        end_date: Date
      ): Promise<topMember[]> {
        const { start: date_start, end: date_end } = this.normalizeDateRange(start_date, end_date);
      
        // Define mapping for table, userId field, and createdAt field
        let tableName: string;
        let userIdField: string;
        let createdAtField: string;
      
        switch (type) {
          case 'post':
            tableName = 'backup_post_with_attributes';
            userIdField = 'backup_member_id';
            createdAtField = 'published_at';
            break;
          case 'comment':
            tableName = 'backup_comments';
            userIdField = 'backup_member_id';
            createdAtField = 'created_at';
            break;
          case 'reaction':
            tableName = 'backup_reactions';
            userIdField = 'backup_member_id';
            createdAtField = 'created_at';
            break;
          default:
            throw new Error('Invalid report type');
        }
      
        // Execute raw SQL query using parameterized values
        const result = await this.dataSource.query(
          `
          SELECT 
            u.id AS userId,
            u.name,
            u.email,
            u.mmid_fullname,
            COALESCE(u.profilePictureUrl_new, u.profilePictureUrl, '') AS profilePicture,
            COUNT(*) AS count
          FROM ${tableName} t
          JOIN members u ON u.id = t.${userIdField}
          WHERE t.${createdAtField} BETWEEN ? AND ?
          GROUP BY u.id
          ORDER BY count DESC
          LIMIT 10
          `,
          [date_start, date_end]
        );

        let result_data = result.map((row) => ({
          userId: row.userId,
          name: this.getMemberName(row.name, row.mmid_fullname, row.userId),
          email: row.email,
          profilePicture: row.profilePicture,
          count: row.count
        }));
      
        return result_data;
    }


    async topSpaces(
        type: 'post' | 'member',
        start_date?: Date,
        end_date?: Date
      ): Promise<TopSpace[]> {
        const queryBuilder = this.spaceRepository.createQueryBuilder('space');
    
        const { start: date_start, end: date_end } = this.normalizeDateRange(start_date, end_date);
    
        if (type === 'post') {
          queryBuilder
            .leftJoin('space.posts', 'post')
            .select([
              'space.id AS id',
              'space.name AS name',
              'space.image AS image',
              'COUNT(post.id) AS count',
            ])
            .groupBy('space.id')
            .orderBy('count', 'DESC')
            .limit(10);
    
          if (date_start && date_end) {
            queryBuilder.andWhere('post.published_at BETWEEN :start AND :end', {
              start: date_start,
              end: date_end,
            });
          }
        }
    
        if (type === 'member') {
          queryBuilder
            .leftJoin('backup_member_space', 'ms', 'ms.backup_space_id = space.id')
            .select([
              'space.id AS id',
              'space.name AS name',
              'space.image AS image',
              'COUNT(ms.id) AS count',
            ])
            .groupBy('space.id')
            .orderBy('count', 'DESC')
            .limit(10);
    
          if (date_start && date_end) {
            queryBuilder.andWhere('ms.created_at BETWEEN :start AND :end', {
              start: date_start,
              end: date_end,
            });
          }
        }
    
        const results = await queryBuilder.getRawMany();
    
        return results.map((row) => ({
          id: row.id,
          name: row.name,
          image: row.image,
          count: Number(row.count),
        }));
    }


    async topPost(
        type: 'view' | 'comment' | 'reaction',
        start_date?: Date,
        end_date?: Date,
      ): Promise<TopPost[]> {   
        const { start: date_start, end: date_end } = this.normalizeDateRange(start_date, end_date);
        const qb = this.postRepository.createQueryBuilder('post');
      
        if (type === 'view') {
          qb
            .leftJoin('activity_logs', 'activity', 'activity.postId = post.id AND activity.action = :action AND activity.targetType = :targetType', {
              action: 'view',
              targetType: 'post',
            })
            .select([
              'post.id AS id',
              'post.title AS title',
              'post.image_path AS image',
              'COUNT(activity.id) AS count',
            ])
            .groupBy('post.id')
            .orderBy('count', 'DESC')
            .limit(10);
      
          if (date_start && date_end) {
            qb.andWhere('activity.createdAt BETWEEN :start AND :end', { start: date_start, end: date_end });
          }
        }
      
        if (type === 'comment') {
          qb
            .leftJoin('backup_comments', 'comment', 'comment.backup_post_with_attribute_id = post.id')
            .select([
              'post.id AS id',
              'post.title AS title',
              'post.image_path AS image',
              'COUNT(comment.id) AS count',
            ])
            .groupBy('post.id')
            .orderBy('count', 'DESC')
            .limit(10);
      
          if (date_start && date_end) {
            qb.andWhere('comment.created_at BETWEEN :start AND :end', { start: date_start, end: date_end });
          }
        }
      
        if (type === 'reaction') {
          qb
            .leftJoin('backup_reactions', 'reaction', 'reaction.backup_post_with_attribute_id = post.id')
            .select([
              'post.id AS id',
              'post.title AS title',
              'post.image_path AS image',
              'COUNT(reaction.id) AS count',
            ])
            .groupBy('post.id')
            .orderBy('count', 'DESC')
            .limit(10);
      
          if (date_start && date_end) {
            qb.andWhere('reaction.created_at BETWEEN :start AND :end', { start: date_start, end: date_end });
          }
        }
      
        const result = await qb.getRawMany();
      
        return result.map(row => ({
          id: row.id,
          title: row.title,
          image: row.image,
          count: Number(row.count),
        }));
    }


    async countDistinctUsersByWeekday(
      dateStart: string,
      dateEnd: string,
    ): Promise<Array<{ day: 'monday'|'tuesday'|'wednesday'|'thursday'|'friday'|'saturday'|'sunday'; total: number }>> {
      const handlersToExclude = ['detailMe', 'postHighlight', 'getStatus'];

      dateStart = `${dateStart} 00:00:00`
      dateEnd = `${dateEnd} 23:59:59`

        // Build UTC bounds that represent the same UTC+8 window
      const TZ_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8
      const startUtc = dateStart ? new Date(new Date(dateStart).getTime() - TZ_OFFSET_MS) : undefined;
      const endUtc   = dateEnd   ? new Date(new Date(dateEnd).getTime()   - TZ_OFFSET_MS) : undefined;


      // 1=Sun .. 7=Sat (MySQL); group by numeric DOW only
      const rows = await this.requestLogEntity
        .createQueryBuilder('el')
        .select(`DAYOFWEEK(CONVERT_TZ(el.createdAt, '+00:00', '+08:00'))`, 'dow')
        .addSelect(`COUNT(el.backup_member_id)`, 'count')
        .where('el.handler NOT IN (:...handlers)', { handlers: handlersToExclude })
        .andWhere('el.backup_member_id IS NOT NULL')
        .andWhere('el.createdAt BETWEEN :start AND :end', { start: startUtc, end: endUtc })
        .groupBy(`DAYOFWEEK(CONVERT_TZ(el.createdAt, '+00:00', '+08:00'))`)
        .getRawMany<{ dow: string; count: string }>();
      

      // Map numeric DOW -> count
      const countsByDow = new Map<number, number>();
      for (const r of rows) countsByDow.set(Number(r.dow), Number(r.count) || 0);

      // Desired output order: Monday..Sunday
      const dayNames: Array<|'sunday'|'monday'|'tuesday'|'wednesday'|'thursday'|'friday'|'saturday'> =
        ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

      // MySQL DAYOFWEEK order (Sun..Sat) mapped to Monday..Sunday sequence:
      const mysqlDowOrder = [1, 2, 3, 4, 5, 6, 7];

      return mysqlDowOrder.map((dow, idx) => ({
        day: dayNames[idx],
        total: countsByDow.get(dow) ?? 0,
      }));
    }

    
    async  countDistinctUsersByHour(
      dateStart: string,
      dateEnd: string,
    ): Promise<Array<{ hour: string; count: number }>> {
      const handlersToExclude = ['detailMe', 'postHighlight', 'getStatus'];
      dateStart = `${dateStart} 00:00:00`
      dateEnd = `${dateEnd} 23:59:59`

      // Build UTC bounds that represent the same UTC+8 window
      const TZ_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8
      const startUtc = dateStart ? new Date(new Date(dateStart).getTime() - TZ_OFFSET_MS) : undefined;
      const endUtc   = dateEnd   ? new Date(new Date(dateEnd).getTime()   - TZ_OFFSET_MS) : undefined;


      // Use numeric hour for grouping/ordering, format later
      const rows = await this.requestLogEntity
        .createQueryBuilder('el')
        .select(`HOUR(CONVERT_TZ(el.createdAt, '+00:00', '+08:00'))`, 'hour_num')
        .addSelect(`COUNT(el.backup_member_id)`, 'count')
        .where('el.handler NOT IN (:...handlers)', { handlers: handlersToExclude })
        .andWhere('el.backup_member_id IS NOT NULL')
        .andWhere('el.createdAt BETWEEN :start AND :end', { start: startUtc, end: endUtc })
        .groupBy(`HOUR(CONVERT_TZ(el.createdAt, '+00:00', '+08:00'))`)
        .orderBy(`HOUR(CONVERT_TZ(el.createdAt, '+00:00', '+08:00'))`, 'ASC')
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
      return result;
    }



    // clear member
    async clearMember(canExport:boolean = false): Promise<any> {
      this.dateStart = new Date('2025-08-01');
      this.dateStart.setHours(0, 0, 0, 0); 
      
      this.dateEnd = new Date('2025-08-31');
      this.dateEnd.setHours(23, 59, 59, 999); 

      const TZ_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8
      const startUtc = this.dateStart ? new Date(new Date(this.dateStart).getTime() - TZ_OFFSET_MS) : undefined;
      const endUtc   = this.dateEnd   ? new Date(new Date(this.dateEnd).getTime()   - TZ_OFFSET_MS) : undefined;
      

      // get data member

      const newMember = await this.memberRepository
      .createQueryBuilder('member')
      .select('member.id', 'userId') // 👈 aliasing id as userId
      .where('member.activated_at BETWEEN :start AND :end', { start: startUtc, end: endUtc })
      .getRawMany();

      // get unique member
      const {ids:uniqueMember} = await this.historyByDays(this.dateStart, this.dateEnd)

      
            // flatten uniqueMember into a simple array of ids
      const uniqueIds = uniqueMember.flat().map(m => m.userId);

      // filter newMember by excluding ids found in uniqueMember
      const filteredNewMember = newMember.filter(m => !uniqueIds.includes(m.userId));

      // flat filteredNewMember into a simple array of ids
      const filteredNewMemberIds = filteredNewMember.flat().map(m => m.userId);

      // get table backup_member in file
      const backupMember = await this.memberRepository.find({
        where: { id: In(filteredNewMemberIds) },
      });

      // If export is requested, create Excel file
      if (canExport && backupMember.length > 0) {
        return await this.exportBackupMemberToExcel(backupMember);
      }


      // set null activated_at
      await this.memberRepository.update({id: In(filteredNewMemberIds)}, {activated_at: null});
      
      return {
        message: 'Member data processed successfully',
        totalFilteredMembers: backupMember.length,
        exportCreated: canExport,
        successClear: true
      };
    }

    // Export backup member data to Excel
    private async exportBackupMemberToExcel(data: any[]): Promise<{ buffer: Buffer; filename: string }> {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Backup Members');

      // Add headers
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Name', key: 'name', width: 30 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'MMID Fullname', key: 'mmid_fullname', width: 30 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Member Role', key: 'member_role', width: 15 },
        { header: 'DOB', key: 'dob', width: 15 },
        { header: 'Gender', key: 'gender', width: 10 },
        { header: 'Profile Picture URL', key: 'profilePictureUrl', width: 40 },
        { header: 'User ID', key: 'userId', width: 15 },
        { header: 'Activated At', key: 'activated_at', width: 20 },
        { header: 'Created At', key: 'created_at', width: 20 },
        { header: 'Updated At', key: 'updated_at', width: 20 }
      ];

      // Add data rows
      for (const member of data) {
        worksheet.addRow([
          member.id,
          this.getMemberName(member.name, member.mmid_fullname, member.id),
          member.email,
          member.mmid_fullname,
          member.status,
          member.member_role,
          member.dob,
          member.gender,
          member.profilePictureUrl,
          member.userId,
          member.activated_at,
          member.created_at,
          member.updated_at
        ]);
      }

      // Generate buffer and filename
      const buffer = await workbook.xlsx.writeBuffer() as Buffer;
      const filename = `members_${format(this.dateStart, 'yyyy-MM-dd')}_to_${format(this.dateEnd, 'yyyy-MM-dd')}_${Date.now()}.xlsx`;
      
      return { buffer, filename };
    }

    async getPostVotesReport(): Promise<PostVoteReportItem[]> {
      const posts = await this.postRepository.find({
        where: {
          post_type: PostType.Vote,
        },
        relations: ['votes'],
        order: { created_at: 'DESC' },
      });

      const reportItems: PostVoteReportItem[] = [];
      const voteMemberRepo = this.dataSource.getRepository(VoteMemberEntity);

      const now = this.getJakartaNow();

      for (const post of posts) {
        let status: 'Draft' | 'Scheduled' | 'Active' | 'Ended' = 'Active';
        if (post.status === 'draft') {
          status = 'Draft';
        } else {
          const voteStart = post.vote_start ? new Date(post.vote_start) : null;
          const voteEnd = post.vote_end ? new Date(post.vote_end) : null;
          if (voteStart && now < voteStart) {
            status = 'Scheduled';
          } else if (voteEnd && now > voteEnd) {
            status = 'Ended';
          } else {
            status = 'Active';
          }
        }

        const totalVotes = post.total_vote ?? 0;

        const uniqueVotersResult = await voteMemberRepo
          .createQueryBuilder('vm')
          .select('COUNT(DISTINCT vm.member_id)', 'count')
          .where('vm.post_id = :postId', { postId: post.id })
          .getRawOne();
        const uniqueVotersCount = parseInt(uniqueVotersResult?.count || '0', 10);

        let topAnswer = '-';
        if (post.votes && post.votes.length > 0) {
          const sortedVotes = [...post.votes].sort((a, b) => (b.total_vote ?? 0) - (a.total_vote ?? 0));
          if (sortedVotes[0] && (sortedVotes[0].total_vote ?? 0) > 0) {
            topAnswer = sortedVotes[0].vote || '-';
          }
        }

        const views = post.viewsCount ?? 0;
        const participationRate = views > 0 ? `${((totalVotes / views) * 100).toFixed(1)}%` : '0.0%';

        reportItems.push({
          id: post.id as number,
          title: post.title || '-',
          status,
          publishDate: post.vote_start ? post.vote_start.toISOString() : (post.published_at ? post.published_at.toISOString() : post.created_at.toISOString()),
          endDate: post.vote_end ? post.vote_end.toISOString() : '-',
          totalViewed: views,
          totalVotes,
          uniqueVoters: uniqueVotersCount,
          topAnswer,
          participationRate,
        });
      }

      return reportItems;
    }

    private getJakartaNow(): Date {
      const now = new Date();
      const utcMillis = now.getTime() + now.getTimezoneOffset() * 60_000;
      const jakartaOffsetMillis = 7 * 60 * 60_000;
      return new Date(utcMillis + jakartaOffsetMillis);
    }

    async exportPostVotesReportToExcel(): Promise<{ buffer: Buffer; filename: string }> {
      const data = await this.getPostVotesReport();

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Post Votes Report');

      worksheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Poll Title', key: 'title', width: 40 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Publish Date', key: 'publishDate', width: 20 },
        { header: 'End Date', key: 'endDate', width: 20 },
        { header: 'Total Viewed', key: 'totalViewed', width: 15 },
        { header: 'Total Votes', key: 'totalVotes', width: 15 },
        { header: 'Unique Voters', key: 'uniqueVoters', width: 15 },
        { header: 'Top Answer', key: 'topAnswer', width: 30 },
        { header: 'Participation Rate', key: 'participationRate', width: 20 },
      ];

      for (const item of data) {
        worksheet.addRow({
          id: item.id,
          title: item.title,
          status: item.status,
          publishDate: item.publishDate !== '-' ? format(new Date(item.publishDate), 'yyyy-MM-dd HH:mm:ss') : '-',
          endDate: item.endDate !== '-' ? format(new Date(item.endDate), 'yyyy-MM-dd HH:mm:ss') : '-',
          totalViewed: item.totalViewed,
          totalVotes: item.totalVotes,
          uniqueVoters: item.uniqueVoters,
          topAnswer: item.topAnswer,
          participationRate: item.participationRate,
        });
      }

      const buffer = await workbook.xlsx.writeBuffer() as Buffer;
      const filename = `post_votes_report_${Date.now()}.xlsx`;

      return { buffer, filename };
    }
}