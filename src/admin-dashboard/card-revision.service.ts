import { formatUtc as format } from '../common/helpers/date.helper';
import { BadRequestException, Injectable } from '@nestjs/common';
import { PostEntity, PostType } from 'src/entity/post.entity';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { CommentEntity } from 'src/entity/comment.entity';
import { ReactionEntity } from 'src/entity/reaction.entity';
import { Member } from 'src/entity/user-mimate.entity';
import { Activity } from 'src/entity/activity.entity';
import {
  topMember,
  TopPost,
  PostVoteReportItem,
} from './interfaces/admin-dashboard.interface';
import { VoteMemberEntity } from 'src/entity/vote-member.entity';
import { TopSpace } from './interfaces/admin-dashboard.interface';
import { DataSource } from 'typeorm';
import { SpaceEntity } from 'src/entity/space.entity';
import { Visitor } from 'src/entity/visitor.entity';

import { RequestLogEntity } from 'src/entity/log.entity';
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

    @InjectRepository(Member, 'mimate')
    private readonly memberRepository: Repository<Member>,

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

  async getActivity(start_date: Date, end_date: Date) {
    this.dateStart = new Date(start_date);
    this.dateStart.setUTCHours(0, 0, 0, 0);

    this.dateEnd = new Date(end_date);
    this.dateEnd.setUTCHours(23, 59, 59, 999);

    const range_day = this.getRangeDay();

    this.dateStartBefore = new Date(
      this.dateStart.getTime() - range_day * 24 * 60 * 60 * 1000,
    );
    this.dateStartBefore.setUTCHours(0, 0, 0, 0);

    this.dateEndBefore = new Date(
      this.dateEnd.getTime() - range_day * 24 * 60 * 60 * 1000,
    );
    this.dateEndBefore.setUTCHours(23, 59, 59, 999);

    // new member
    const {
      total: new_member,
      percentage: new_member_percentage,
      detailCount: new_member_detailCount,
    } = await this.cardNewMembers();
    const query_new_member = {
      text: 'New Member',
      total: new_member,
      allMember: await this.memberRepository.count({
        where: { memberAuthEnabled: true },
      }),
      percentage: new_member_percentage,
      detailCount: new_member_detailCount,
    };

    // active member
    const {
      total: active_member,
      percentage: active_member_percentage,
      detailCount: active_member_detailCount,
    } = await this.cardActiveMembers();
    const query_active_member = {
      text: 'Active Member',
      total: active_member,
      percentage: active_member_percentage,
      detailCount: active_member_detailCount,
    };

    // page view
    const {
      total: page_view,
      percentage: page_view_percentage,
      detailCount: page_view_detailCount,
    } = await this.cardPageView();
    const query_page_view = {
      text: 'Page View',
      total: page_view,
      percentage: page_view_percentage,
      detailCount: page_view_detailCount,
    };

    // online members
    const online_members = await this.countUsersSeenInLast10Minutes();
    const offline_members = await this.memberRepository.count();
    const query_online_members = {
      text: 'Online Members',
      active: online_members,
      total: offline_members,
    };

    // activity members
    const { new_post, new_reply, new_reaction } =
      await this.cardActivityMembers();
    const query_activity_members = {
      text: 'Activity Members',
      post: new_post,
      comment: new_reply,
      reaction: new_reaction,
    };

    return {
      new_member: query_new_member,
      active_member: query_active_member,
      page_view: query_page_view,
      online_member: query_online_members,
      new_activity: query_activity_members,
    };
  }

  async getPostActivity(start_date: Date, end_date: Date) {
    this.dateStart = new Date(start_date);
    this.dateStart.setUTCHours(0, 0, 0, 0);

    this.dateEnd = new Date(end_date);
    this.dateEnd.setUTCHours(23, 59, 59, 999);

    const range_day = this.getRangeDay();

    this.dateStartBefore = new Date(
      this.dateStart.getTime() - range_day * 24 * 60 * 60 * 1000,
    );
    this.dateStartBefore.setUTCHours(0, 0, 0, 0);

    this.dateEndBefore = new Date(
      this.dateEnd.getTime() - range_day * 24 * 60 * 60 * 1000,
    );
    this.dateEndBefore.setUTCHours(23, 59, 59, 999);

    // new posts
    const {
      total: new_posts,
      percentage: new_posts_percentage,
      detailCount: new_posts_detailCount,
    } = await this.cardNewPosts();
    const query_new_posts = {
      text: 'New Posts',
      total: new_posts,
      percentage: new_posts_percentage,
      detailCount: new_posts_detailCount,
    };

    // new replies
    const {
      total: new_replies,
      percentage: new_replies_percentage,
      detailCount: new_replies_detailCount,
    } = await this.cardNewReplies();
    const query_new_replies = {
      text: 'New Replies',
      total: new_replies,
      percentage: new_replies_percentage,
      detailCount: new_replies_detailCount,
    };

    // new reactions
    const {
      total: new_reactions,
      percentage: new_reactions_percentage,
      detailCount: new_reactions_detailCount,
    } = await this.cardNewReactions();
    const query_new_reactions = {
      text: 'New Reactions',
      total: new_reactions,
      percentage: new_reactions_percentage,
      detailCount: new_reactions_detailCount,
    };

    return {
      new_posts: query_new_posts,
      new_replies: query_new_replies,
      new_reactions: query_new_reactions,
    };
  }

  // card new posts
  async cardNewPosts() {
    // Treat this.dateStart/End as UTC bounds like "YYYY-MM-DD 00:00:00" → "23:59:59.999"

    // Current window: local -> UTC for WHERE
    const startUtc = new Date(this.dateStart.getTime());
    const endUtc = new Date(this.dateEnd.getTime());

    // Previous window: local -> UTC for WHERE
    const startUtcPrev = new Date(this.dateStartBefore.getTime());
    const endUtcPrev = new Date(this.dateEndBefore.getTime());

    // Total posts (current range, deduped by row)
    const count_1 = await this.postRepository.count({
      where: { published_at: Between(startUtc, endUtc) },
    });

    // Daily breakdown by UTC day: group published_at directly with DATE()
    const detailRows = await this.postRepository
      .createQueryBuilder('post')
      .select('DATE(post.published_at)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('post.published_at BETWEEN :start AND :end', {
        start: startUtc,
        end: endUtc,
      })
      .groupBy('DATE(post.published_at)')
      .orderBy('date', 'ASC')
      .getRawMany<{ date: string; count: string }>();

    const detailCount = detailRows.map((r) => ({
      date: r.date,
      count: parseInt(r.count, 10) || 0,
    }));

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
    // Current window (treat this.dateStart/End as UTC; use UTC for WHERE)
    const startUtc = new Date(this.dateStart.getTime());
    const endUtc = new Date(this.dateEnd.getTime());

    // Previous window
    const startUtcPrev = new Date(this.dateStartBefore.getTime());
    const endUtcPrev = new Date(this.dateEndBefore.getTime());

    // Totals
    const count_1 = await this.commentRepository.count({
      where: { created_at: Between(startUtc, endUtc) },
    });

    const detailRows = await this.commentRepository
      .createQueryBuilder('comment')
      .select('DATE(comment.created_at)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('comment.created_at BETWEEN :start AND :end', {
        start: startUtc,
        end: endUtc,
      })
      .groupBy('DATE(comment.created_at)')
      .orderBy('date', 'ASC')
      .getRawMany<{ date: string; count: string }>();

    const detailCount = detailRows.map((r) => ({
      date: r.date,
      count: parseInt(r.count, 10) || 0,
    }));

    const count_2 = await this.commentRepository.count({
      where: { created_at: Between(startUtcPrev, endUtcPrev) },
    });

    let percentage: number;
    if (count_2 > 0)
      percentage = Math.ceil(((count_1 - count_2) / count_2) * 100);
    else if (count_1 > 0) percentage = 100;
    else percentage = 0;

    return { total: count_1, percentage, detailCount };
  }

  // card new reactions
  async cardNewReactions() {
    // Current window (local -> UTC)
    const startUtc = new Date(this.dateStart.getTime());
    const endUtc = new Date(this.dateEnd.getTime());

    // Previous window (local -> UTC)
    const startUtcPrev = new Date(this.dateStartBefore.getTime());
    const endUtcPrev = new Date(this.dateEndBefore.getTime());

    // Totals
    const count_1 = await this.reactionRepository.count({
      where: { created_at: Between(startUtc, endUtc) },
    });

    const detailRows = await this.reactionRepository
      .createQueryBuilder('reaction')
      .select('DATE(reaction.created_at)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('reaction.created_at BETWEEN :start AND :end', {
        start: startUtc,
        end: endUtc,
      })
      .groupBy('DATE(reaction.created_at)')
      .orderBy('date', 'ASC')
      .getRawMany<{ date: string; count: string }>();

    const detailCount = detailRows.map((r) => ({
      date: r.date,
      count: parseInt(r.count, 10) || 0,
    }));

    const count_2 = await this.reactionRepository.count({
      where: { created_at: Between(startUtcPrev, endUtcPrev) },
    });

    let percentage: number;
    if (count_2 > 0)
      percentage = Math.ceil(((count_1 - count_2) / count_2) * 100);
    else if (count_1 > 0) percentage = 100;
    else percentage = 0;

    return { total: count_1, percentage, detailCount };
  }

  async getDailyPostCounts(
    startDate: Date,
    endDate: Date,
  ): Promise<{ date: string; activity: number }[]> {
    // Build UTC 00:00:00.000 → 23:59:59.999
    const startDay = new Date(startDate.getTime());
    startDay.setUTCHours(0, 0, 0, 0);

    const endDay = new Date(endDate.getTime());
    endDay.setUTCHours(23, 59, 59, 999);

    // Convert that same local window to UTC bounds for WHERE

    const startUtc = new Date(startDay.getTime());
    const endUtc = new Date(endDay.getTime());

    // Group by UTC day: shift published_at directly with DATE()
    const rows = await this.postRepository
      .createQueryBuilder('post')
      .select('DATE(post.published_at)', 'date')
      .addSelect('COUNT(*)', 'activity')
      .where('post.published_at BETWEEN :start AND :end', {
        start: startUtc,
        end: endUtc,
      })
      .groupBy('DATE(post.published_at)')
      .orderBy('date', 'ASC')
      .getRawMany<{ date: string; activity: string }>();

    // Normalize return types
    return rows.map((r) => ({
      date: r.date, // 'YYYY-MM-DD'
      activity: parseInt(r.activity, 10) || 0,
    }));
  }

  // card new members
  async cardNewMembers() {
    // Current window (treat this.dateStart/End as UTC; use UTC for WHERE)
    const startUtc = new Date(this.dateStart.getTime());
    const endUtc = new Date(this.dateEnd.getTime());

    // Previous window (local → UTC)
    const startUtcPrev = new Date(this.dateStartBefore.getTime());
    const endUtcPrev = new Date(this.dateEndBefore.getTime());

    // Total new members in current window
    const count_1 = await this.memberRepository.count({
      where: { memberAuthEnabled: true, created_at: Between(startUtc, endUtc) },
    });

    // Daily breakdown by UTC day
    const detailRows = await this.memberRepository
      .createQueryBuilder('member')
      .select('DATE(member.created_at)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('member.created_at BETWEEN :start AND :end', {
        start: startUtc,
        end: endUtc,
      })
      .andWhere('member.memberAuthEnabled = :enabled', { enabled: true })
      .groupBy('DATE(member.created_at)')
      .orderBy('date', 'ASC')
      .getRawMany<{ date: string; count: string }>();

    const detailCount = detailRows.map((r) => ({
      date: r.date,
      count: parseInt(r.count, 10) || 0,
    }));

    // Total for previous window (for % change)
    const count_2 = await this.memberRepository.count({
      where: {
        memberAuthEnabled: true,
        created_at: Between(startUtcPrev, endUtcPrev),
      },
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
    // Local → UTC bounds
    const startUtc = new Date(this.dateStart.getTime());
    const endUtc = new Date(this.dateEnd.getTime());
    const startUtcPrev = new Date(this.dateStartBefore.getTime());
    const endUtcPrev = new Date(this.dateEndBefore.getTime());

    // Current / previous unique active users (deduped across window)
    const currentActiveUsers = await this.getUniqueActiveUserIds(
      startUtc,
      endUtc,
    );
    const previousActiveUsers = await this.getUniqueActiveUserIds(
      startUtcPrev,
      endUtcPrev,
    );

    const count_1 = currentActiveUsers;
    const count_2 = previousActiveUsers;

    // Daily active user counts by UTC calendar day
    const detailCount = await this.getDailyActiveUserCounts(startUtc, endUtc);

    let percentage: number;
    if (count_2 > 0)
      percentage = Math.ceil(((count_1 - count_2) / count_2) * 100);
    else if (count_1 > 0) percentage = 100;
    else percentage = 0;

    return { total: count_1, percentage, detailCount };
  }

  /**
   * Unique active user IDs across the whole (UTC) window.
   * Pass in UTC bounds that correspond to your selected UTC days.
   */
  private async getUniqueActiveUserIds(
    startUtc: Date,
    endUtc: Date,
  ): Promise<any> {
    const data = await Promise.all([
      this.postRepository
        .createQueryBuilder('post')
        .select('COUNT(post.id)', 'total')
        .where('post.created_at BETWEEN :start AND :end', {
          start: startUtc,
          end: endUtc,
        })
        .getRawOne<{ total: number }>(),

      this.commentRepository
        .createQueryBuilder('comment')
        .select('COUNT(comment.id)', 'total')
        .where('comment.created_at BETWEEN :start AND :end', {
          start: startUtc,
          end: endUtc,
        })
        .getRawOne<{ total: number }>(),

      this.reactionRepository
        .createQueryBuilder('reaction')
        .select('COUNT(reaction.id)', 'total')
        .where('reaction.created_at BETWEEN :start AND :end', {
          start: startUtc,
          end: endUtc,
        })
        .getRawOne<{ total: number }>(),
    ]);

    const grandTotal = Object.values(data).reduce(
      (sum, x) => sum + Number(x?.total ?? 0),
      0,
    );

    return grandTotal;
  }

  /**
   * Daily active users by UTC calendar day.
   * - Filtering uses UTC bounds (startUtc/endUtc)
   * - Group buckets into UTC days using DATE(timestamp).
   */
  private async getDailyActiveUserCounts(
    startUtc: Date,
    endUtc: Date,
  ): Promise<Array<{ date: string; count: number }>> {
    // Each table: count(*) per UTC day
    const [postRows, commentRows, reactionRows] = await Promise.all([
      this.postRepository
        .createQueryBuilder('post')
        .select('DATE(post.created_at)', 'date')
        .addSelect('COUNT(*)', 'count')
        .where('post.created_at BETWEEN :start AND :end', {
          start: startUtc,
          end: endUtc,
        })
        .groupBy('DATE(post.created_at)')
        .getRawMany<{ date: string; count: string }>(),

      this.commentRepository
        .createQueryBuilder('comment')
        .select('DATE(comment.created_at)', 'date')
        .addSelect('COUNT(*)', 'count')
        .where('comment.created_at BETWEEN :start AND :end', {
          start: startUtc,
          end: endUtc,
        })
        .groupBy('DATE(comment.created_at)')
        .getRawMany<{ date: string; count: string }>(),

      this.reactionRepository
        .createQueryBuilder('reaction')
        .select('DATE(reaction.created_at)', 'date')
        .addSelect('COUNT(*)', 'count')
        .where('reaction.created_at BETWEEN :start AND :end', {
          start: startUtc,
          end: endUtc,
        })
        .groupBy('DATE(reaction.created_at)')
        .getRawMany<{ date: string; count: string }>(),
    ]);

    const toYMD = (val: any): string => {
      if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val))
        return val;
      const d = new Date(val);
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    // Merge counts by date (sum across sources)
    const sumByDate = new Map<string, number>();
    const add = (rows: Array<{ date: string; count: string }>) => {
      for (const r of rows) {
        const c = Number(r.count) || 0;
        sumByDate.set(toYMD(r.date), (sumByDate.get(r.date) || 0) + c);
      }
    };
    add(postRows);
    add(commentRows);
    add(reactionRows);

    // Fill missing days with 0 (iterate local Z days)

    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const startYmd = new Date(startUtc.getTime()).toISOString().slice(0, 10);
    const endYmd = new Date(endUtc.getTime()).toISOString().slice(0, 10);
    const startDayUtc = new Date(`${startYmd}T00:00:00.000Z`);
    const endDayUtc = new Date(`${endYmd}T00:00:00.000Z`);

    const result: Array<{ date: string; count: number }> = [];
    for (
      let t = startDayUtc.getTime();
      t <= endDayUtc.getTime();
      t += ONE_DAY_MS
    ) {
      const ymd = toYMD(new Date(t));
      result.push({ date: ymd, count: sumByDate.get(ymd) ?? 0 });
    }

    return result; // [{ date: 'YYYY-MM-DD', count: number }, ...] sorted ASC
  }
  // card page view
  async cardPageView() {
    // Treat this.dateStart/End and *Before as UTC bounds.
    const startUtc = new Date(this.dateStart.getTime());
    const endUtc = new Date(this.dateEnd.getTime());
    const startUtcPrev = new Date(this.dateStartBefore.getTime());
    const endUtcPrev = new Date(this.dateEndBefore.getTime());

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
      .andWhere('log.createdAt BETWEEN :start AND :end', {
        start: startUtc,
        end: endUtc,
      })
      .getRawOne<{ total: string }>();

    // Daily breakdown by UTC calendar day
    const detailRows = await this.requestLogEntity
      .createQueryBuilder('log')
      .select('DATE(log.createdAt)', 'date')
      .addSelect('COUNT(log.backup_member_id)', 'count')
      .where('log.handler IN (:...handlers)', { handlers })
      .andWhere('log.backup_member_id IS NOT NULL')
      .andWhere('log.createdAt BETWEEN :start AND :end', {
        start: startUtc,
        end: endUtc,
      })
      .groupBy('DATE(log.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany<{ date: string; count: string }>();

    const detailCount = detailRows.map((r) => ({
      date: r.date, // 'YYYY-MM-DD' (UTC day)
      count: parseInt(r.count, 10) || 0, // number
    }));

    // Total events (previous window)
    const { total: count_2_str } = await this.requestLogEntity
      .createQueryBuilder('log')
      .select('COUNT(log.backup_member_id)', 'total')
      .where('log.handler IN (:...handlers)', { handlers })
      .andWhere('log.backup_member_id IS NOT NULL')
      .andWhere('log.createdAt BETWEEN :start AND :end', {
        start: startUtcPrev,
        end: endUtcPrev,
      })
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
    const { total: new_post } = await this.cardNewPosts();

    // new reply
    const { total: new_reply } = await this.cardNewReplies();

    // new reaction
    const { total: new_reaction } = await this.cardNewReactions();

    return { new_post, new_reply, new_reaction };
  }

  protected normalizeDateRange(
    start_date?: Date,
    end_date?: Date,
  ): { start?: Date; end?: Date } {
    if (!start_date || !end_date) return {};

    const start = new Date(start_date);
    start.setUTCHours(0, 0, 0, 0);

    const end = new Date(end_date);
    end.setUTCHours(23, 59, 59, 999);

    return { start, end };
  }

  /** Returns actual distinct member logins; no static counts, excluded dates or visitor substitutions. */
  async historyByDays(start_date: Date, end_date: Date) {
    const end = end_date ? new Date(end_date) : new Date();
    const start = start_date
      ? new Date(start_date)
      : new Date(end.getTime() - 29 * 86400000);
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(0, 0, 0, 0);
    const days = (end.getTime() - start.getTime()) / 86400000 + 1;
    if (!Number.isInteger(days) || days < 1 || days > 366) {
      throw new BadRequestException('Select a valid range of 1–366 UTC days.');
    }
    end.setUTCDate(end.getUTCDate() + 1);
    const scope = this.activityRepository
      .createQueryBuilder('activity')
      .innerJoin('activity.user', 'member')
      .where('member.memberAuthEnabled = :enabled', { enabled: true })
      .andWhere(
        'NOT EXISTS (SELECT 1 FROM users staff WHERE staff.backup_member_id = member.id)',
      )
      .andWhere('activity.action = :action', { action: 'login' })
      .andWhere('activity.createdAt >= :start AND activity.createdAt < :end', {
        start,
        end,
      });
    const [rows, ids] = await Promise.all([
      scope
        .clone()
        .select("DATE_FORMAT(activity.createdAt, '%Y-%m-%d')", 'date')
        .addSelect('COUNT(DISTINCT activity.userId)', 'activity')
        .groupBy("DATE_FORMAT(activity.createdAt, '%Y-%m-%d')")
        .orderBy('date', 'ASC')
        .getRawMany<{ date: string; activity: string }>(),
      scope
        .clone()
        .select('activity.userId', 'userId')
        .distinct(true)
        .orderBy('activity.userId', 'ASC')
        .getRawMany<{ userId: number }>(),
    ]);
    return {
      totalActivity: ids.length,
      ids,
      data: rows.map((row) => ({
        date: row.date,
        activity: Number(row.activity),
      })),
    };
  }

  /** Returns the current display name, username, or stable internal member label. */
  private getMemberName(name: string, username: string, id: number): string {
    return name?.trim() || username?.trim() || `Member ${id}`;
  }

  async topMember(
    type: 'post' | 'comment' | 'reaction',
    start_date: Date,
    end_date: Date,
  ): Promise<topMember[]> {
    const { start: date_start, end: date_end } = this.normalizeDateRange(
      start_date,
      end_date,
    );

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
            u.username,
            COALESCE(u.profilePictureUrl, '') AS profilePicture,
            COUNT(*) AS count
          FROM ${tableName} t
          JOIN members u ON u.id = t.${userIdField}
          WHERE t.${createdAtField} BETWEEN ? AND ?
            AND u.memberAuthEnabled = 1 AND u.deleted_at IS NULL
            AND NOT EXISTS (SELECT 1 FROM users staff WHERE staff.backup_member_id = u.id)
          GROUP BY u.id
          ORDER BY count DESC
          LIMIT 10
          `,
      [date_start, date_end],
    );

    const result_data = result.map((row) => ({
      userId: row.userId,
      name: this.getMemberName(row.name, row.username, row.userId),
      email: row.email,
      profilePicture: row.profilePicture,
      count: row.count,
    }));

    return result_data;
  }

  async topSpaces(
    type: 'post' | 'member',
    start_date?: Date,
    end_date?: Date,
  ): Promise<TopSpace[]> {
    const queryBuilder = this.spaceRepository.createQueryBuilder('space');

    const { start: date_start, end: date_end } = this.normalizeDateRange(
      start_date,
      end_date,
    );

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
    const { start: date_start, end: date_end } = this.normalizeDateRange(
      start_date,
      end_date,
    );
    const qb = this.postRepository.createQueryBuilder('post');

    if (type === 'view') {
      qb.leftJoin(
        'activity_logs',
        'activity',
        'activity.postId = post.id AND activity.action = :action AND activity.targetType = :targetType',
        {
          action: 'view',
          targetType: 'post',
        },
      )
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
        qb.andWhere('activity.createdAt BETWEEN :start AND :end', {
          start: date_start,
          end: date_end,
        });
      }
    }

    if (type === 'comment') {
      qb.leftJoin(
        'backup_comments',
        'comment',
        'comment.backup_post_with_attribute_id = post.id',
      )
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
        qb.andWhere('comment.created_at BETWEEN :start AND :end', {
          start: date_start,
          end: date_end,
        });
      }
    }

    if (type === 'reaction') {
      qb.leftJoin(
        'backup_reactions',
        'reaction',
        'reaction.backup_post_with_attribute_id = post.id',
      )
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
        qb.andWhere('reaction.created_at BETWEEN :start AND :end', {
          start: date_start,
          end: date_end,
        });
      }
    }

    const result = await qb.getRawMany();

    return result.map((row) => ({
      id: row.id,
      title: row.title,
      image: row.image,
      count: Number(row.count),
    }));
  }

  async countDistinctUsersByWeekday(
    dateStart: string,
    dateEnd: string,
  ): Promise<
    Array<{
      day:
        | 'monday'
        | 'tuesday'
        | 'wednesday'
        | 'thursday'
        | 'friday'
        | 'saturday'
        | 'sunday';
      total: number;
    }>
  > {
    const handlersToExclude = ['detailMe', 'postHighlight', 'getStatus'];

    dateStart = `${dateStart} 00:00:00`;
    dateEnd = `${dateEnd} 23:59:59`;

    // Build UTC bounds that represent the same UTC window

    const startUtc = dateStart
      ? new Date(new Date(dateStart).getTime())
      : undefined;
    const endUtc = dateEnd ? new Date(new Date(dateEnd).getTime()) : undefined;

    // 1=Sun .. 7=Sat (MySQL); group by numeric DOW only
    const rows = await this.requestLogEntity
      .createQueryBuilder('el')
      .select(`DAYOFWEEK(el.createdAt)`, 'dow')
      .addSelect(`COUNT(el.backup_member_id)`, 'count')
      .where('el.handler NOT IN (:...handlers)', {
        handlers: handlersToExclude,
      })
      .andWhere('el.backup_member_id IS NOT NULL')
      .andWhere('el.createdAt BETWEEN :start AND :end', {
        start: startUtc,
        end: endUtc,
      })
      .groupBy(`DAYOFWEEK(el.createdAt)`)
      .getRawMany<{ dow: string; count: string }>();

    // Map numeric DOW -> count
    const countsByDow = new Map<number, number>();
    for (const r of rows) countsByDow.set(Number(r.dow), Number(r.count) || 0);

    // Desired output order: Monday..Sunday
    const dayNames: Array<
      | 'sunday'
      | 'monday'
      | 'tuesday'
      | 'wednesday'
      | 'thursday'
      | 'friday'
      | 'saturday'
    > = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];

    // MySQL DAYOFWEEK order (Sun..Sat) mapped to Monday..Sunday sequence:
    const mysqlDowOrder = [1, 2, 3, 4, 5, 6, 7];

    return mysqlDowOrder.map((dow, idx) => ({
      day: dayNames[idx],
      total: countsByDow.get(dow) ?? 0,
    }));
  }

  async countDistinctUsersByHour(
    dateStart: string,
    dateEnd: string,
  ): Promise<Array<{ hour: string; count: number }>> {
    const handlersToExclude = ['detailMe', 'postHighlight', 'getStatus'];
    dateStart = `${dateStart} 00:00:00`;
    dateEnd = `${dateEnd} 23:59:59`;

    // Build UTC bounds that represent the same UTC window

    const startUtc = dateStart
      ? new Date(new Date(dateStart).getTime())
      : undefined;
    const endUtc = dateEnd ? new Date(new Date(dateEnd).getTime()) : undefined;

    // Use numeric hour for grouping/ordering, format later
    const rows = await this.requestLogEntity
      .createQueryBuilder('el')
      .select(`HOUR(el.createdAt)`, 'hour_num')
      .addSelect(`COUNT(el.backup_member_id)`, 'count')
      .where('el.handler NOT IN (:...handlers)', {
        handlers: handlersToExclude,
      })
      .andWhere('el.backup_member_id IS NOT NULL')
      .andWhere('el.createdAt BETWEEN :start AND :end', {
        start: startUtc,
        end: endUtc,
      })
      .groupBy(`HOUR(el.createdAt)`)
      .orderBy(`HOUR(el.createdAt)`, 'ASC')
      .getRawMany<{ hour_num: string; count: string }>();

    // Build a full, ordered 00..23 array
    const countsByHour = new Map<number, number>();
    for (const r of rows)
      countsByHour.set(Number(r.hour_num), Number(r.count) || 0);

    const result: Array<{ hour: string; count: number }> = [];
    for (let h = 0; h < 24; h++) {
      result.push({
        hour: String(h).padStart(2, '0'),
        count: countsByHour.get(h) ?? 0,
      });
    }
    return result;
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

    const now = new Date();

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
        const sortedVotes = [...post.votes].sort(
          (a, b) => (b.total_vote ?? 0) - (a.total_vote ?? 0),
        );
        if (sortedVotes[0] && (sortedVotes[0].total_vote ?? 0) > 0) {
          topAnswer = sortedVotes[0].vote || '-';
        }
      }

      const views = post.viewsCount ?? 0;
      const participationRate =
        views > 0 ? `${((totalVotes / views) * 100).toFixed(1)}%` : '0.0%';

      reportItems.push({
        id: post.id as number,
        title: post.title || '-',
        status,
        publishDate: post.vote_start
          ? post.vote_start.toISOString()
          : post.published_at
          ? post.published_at.toISOString()
          : post.created_at.toISOString(),
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

  async exportPostVotesReportToExcel(): Promise<{
    buffer: Buffer;
    filename: string;
  }> {
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
        publishDate:
          item.publishDate !== '-'
            ? format(new Date(item.publishDate), 'yyyy-MM-dd HH:mm:ss')
            : '-',
        endDate:
          item.endDate !== '-'
            ? format(new Date(item.endDate), 'yyyy-MM-dd HH:mm:ss')
            : '-',
        totalViewed: item.totalViewed,
        totalVotes: item.totalVotes,
        uniqueVoters: item.uniqueVoters,
        topAnswer: item.topAnswer,
        participationRate: item.participationRate,
      });
    }

    const buffer = (await workbook.xlsx.writeBuffer()) as Buffer;
    const filename = `post_votes_report_${Date.now()}.xlsx`;

    return { buffer, filename };
  }
}
