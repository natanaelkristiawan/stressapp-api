import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestPointDetail } from 'src/entity/quest-point-detail.entity';
import { QuestPoint } from 'src/entity/quest-point.entity';
import { ReportFilterDto } from './dtos/report.dto';
import { HeadInfo, DailyPointItem, DailyPointCollectionResponse, PointTypeBreakdown, PointTypeDistributionResponse, PostPointItem, PostHighestPointResponse, UserPointLeaderItem, HigherUserPointResponse, PointCollectorItem, LatestPointCollectorResponse } from './interfaces/report.interface';

@Injectable()
export class ReportService {
    constructor(
        @InjectRepository(QuestPointDetail, 'mimate')
        private readonly questPointDetailRepository: Repository<QuestPointDetail>,
        @InjectRepository(QuestPoint, 'mimate')
        private readonly questPointRepository: Repository<QuestPoint>,
    ) { }

    private parseDateRangeUtc(dateStart?: string, dateEnd?: string): { startUtc?: Date; endUtc?: Date } {
        const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;
        let startUtc: Date | undefined;
        let endUtc: Date | undefined;

        if (dateStart && dateStart.trim() !== '') {
            const startLocal = new Date(dateStart.trim());
            startLocal.setHours(0, 0, 0, 0);
            startUtc = new Date(startLocal.getTime() - TZ_OFFSET_MS);
        }

        if (dateEnd && dateEnd.trim() !== '') {
            const endLocal = new Date(dateEnd.trim());
            endLocal.setHours(23, 59, 59, 999);
            endUtc = new Date(endLocal.getTime() - TZ_OFFSET_MS);
        }

        return { startUtc, endUtc };
    }

    private applyDateFilter(qb: any, dateStart?: string, dateEnd?: string): void {
        const { startUtc, endUtc } = this.parseDateRangeUtc(dateStart, dateEnd);
        if (startUtc) {
            qb.andWhere('qpd.created_at >= :startDate', { startDate: startUtc });
        }
        if (endUtc) {
            qb.andWhere('qpd.created_at <= :endDate', { endDate: endUtc });
        }
    }

    async getHeadInfo(filterDto?: ReportFilterDto): Promise<HeadInfo> {
        // 1. Total Points Awarded
        const totalAwardedQb = this.questPointDetailRepository
            .createQueryBuilder('qpd')
            .select('COALESCE(SUM(CASE WHEN qpd.points > 0 THEN qpd.points ELSE 0 END), 0)', 'total')
            .where('qpd.points > 0')
            .andWhere('qpd.note != :none', { none: 'Get point for activated account' })
            .andWhere('(qpd.post_id IS NOT NULL OR qpd.comment_id IS NOT NULL OR qpd.reaction_id IS NOT NULL)');

        this.applyDateFilter(totalAwardedQb, filterDto?.date_start, filterDto?.date_end);

        const totalAwardedRaw = await totalAwardedQb.getRawOne();
        const totalPointsAwarded = Number(totalAwardedRaw?.total || 0);

        // 2. Active Point Collectors (Unique members who received points)
        const activeCollectorsQb = this.questPointDetailRepository
            .createQueryBuilder('qpd')
            .select('COUNT(DISTINCT qpd.member_id)', 'total')
            .where('qpd.points > 0')
            .andWhere('qpd.note != :none', { none: 'Get point for activated account' })
            .andWhere('(qpd.post_id IS NOT NULL OR qpd.comment_id IS NOT NULL OR qpd.reaction_id IS NOT NULL)');

        this.applyDateFilter(activeCollectorsQb, filterDto?.date_start, filterDto?.date_end);

        const activeCollectorsRaw = await activeCollectorsQb.getRawOne();
        const totalActiveCollectors = Number(activeCollectorsRaw?.total || 0);

        // 3. Highest Single Post Reward
        const highestPostQb = this.questPointDetailRepository
            .createQueryBuilder('qpd')
            .leftJoin('qpd.post', 'post')
            .select('qpd.post_id', 'postId')
            .addSelect('COALESCE(SUM(qpd.points), 0)', 'totalPoints')
            .addSelect('post.title', 'postTitle')
            .where('qpd.post_id IS NOT NULL AND qpd.points > 0')
            .andWhere('qpd.note != :none', { none: 'Get point for activated account' })
            .groupBy('qpd.post_id')
            .addGroupBy('post.title')
            .orderBy('totalPoints', 'DESC')
            .limit(1);

        this.applyDateFilter(highestPostQb, filterDto?.date_start, filterDto?.date_end);

        const highestPostRaw = await highestPostQb.getRawOne();
        const highestPostTotal = Number(highestPostRaw?.totalPoints || 0);
        const highestPostDescription = highestPostRaw
            ? highestPostRaw.postTitle
                ? highestPostRaw.postTitle.length > 35
                    ? `${highestPostRaw.postTitle.slice(0, 35)}...`
                    : highestPostRaw.postTitle
                : `Post #${highestPostRaw.postId}`
            : 'No post reward yet';

        // 4. User Most Collected Points
        const topUserQb = this.questPointDetailRepository
            .createQueryBuilder('qpd')
            .leftJoin('qpd.member', 'member')
            .select('qpd.member_id', 'memberId')
            .addSelect('COALESCE(SUM(qpd.points), 0)', 'totalPoints')
            .addSelect('member.name', 'name')
            .addSelect('member.mmid_fullname', 'mmid_fullname')
            .where('qpd.points > 0')
            .andWhere('qpd.note != :none', { none: 'Get point for activated account' })
            .andWhere('(qpd.post_id IS NOT NULL OR qpd.comment_id IS NOT NULL OR qpd.reaction_id IS NOT NULL)')
            .groupBy('qpd.member_id')
            .addGroupBy('member.name')
            .addGroupBy('member.mmid_fullname')
            .orderBy('totalPoints', 'DESC')
            .limit(1);

        this.applyDateFilter(topUserQb, filterDto?.date_start, filterDto?.date_end);

        const topUserRaw = await topUserQb.getRawOne();

        const topUserTotal = Number(topUserRaw?.totalPoints || 0);
        const topUserName = topUserRaw?.name || topUserRaw?.mmid_fullname || 'Member';
        const topUserDescription = topUserTotal > 0 ? `${topUserName} • Top Collector` : 'No points yet';

        return {
            total_point_award: {
                total: totalPointsAwarded,
                description: 'From all quests & activities',
            },
            active_point_collector: {
                total: totalActiveCollectors,
                description: 'Unique participants',
            },
            high_single_post_reward: {
                total: highestPostTotal,
                description: highestPostDescription,
            },
            user_most_collected_point: {
                total: topUserTotal,
                description: topUserDescription,
            },
        };
    }


    async dailyPointCollection(filterDto?: ReportFilterDto): Promise<DailyPointCollectionResponse> {
        const qb = this.questPointDetailRepository
            .createQueryBuilder('qpd')
            .select('DAYOFWEEK(DATE_ADD(qpd.created_at, INTERVAL 8 HOUR))', 'day_num')
            .addSelect('COALESCE(SUM(qpd.points), 0)', 'total_points')
            .where('qpd.points > 0')
            .andWhere('qpd.note != :none', { none: 'Get point for activated account' })
            .andWhere('(qpd.post_id IS NOT NULL OR qpd.comment_id IS NOT NULL OR qpd.reaction_id IS NOT NULL)');

        this.applyDateFilter(qb, filterDto?.date_start, filterDto?.date_end);

        qb.groupBy('DAYOFWEEK(DATE_ADD(qpd.created_at, INTERVAL 8 HOUR))');

        const rawResults = await qb.getRawMany();

        const defaultDays: DailyPointItem[] = [
            { day: 'Sunday', shortDay: 'Sun', points: 0, highlight: true },
            { day: 'Monday', shortDay: 'Mon', points: 0, highlight: true },
            { day: 'Tuesday', shortDay: 'Tue', points: 0 },
            { day: 'Wednesday', shortDay: 'Wed', points: 0 },
            { day: 'Thursday', shortDay: 'Thu', points: 0 },
            { day: 'Friday', shortDay: 'Fri', points: 0 },
            { day: 'Saturday', shortDay: 'Sat', points: 0 },
        ];

        for (const row of rawResults) {
            const dayIndex = Number(row.day_num) - 1;
            if (dayIndex >= 0 && dayIndex < 7) {
                defaultDays[dayIndex].points = Number(row.total_points || 0);
            }
        }

        const pointsArray = defaultDays.map((d) => d.points);
        const totalPoints = pointsArray.reduce((acc, curr) => acc + curr, 0);
        const dailyAverage = Math.round(totalPoints / 7);

        let peakDay = { day: defaultDays[0].day, points: defaultDays[0].points };
        for (const item of defaultDays) {
            if (item.points > peakDay.points) {
                peakDay = { day: item.day, points: item.points };
            }
        }

        const sundayPoints = defaultDays[0].points;
        const mondayPoints = defaultDays[1].points;

        let mondayVsSundayGrowth = '0%';
        if (sundayPoints === 0 && mondayPoints > 0) {
            mondayVsSundayGrowth = `+${mondayPoints.toLocaleString()} pts`;
        } else if (sundayPoints > 0) {
            const diff = ((mondayPoints - sundayPoints) / sundayPoints) * 100;
            const sign = diff >= 0 ? '+' : '';
            mondayVsSundayGrowth = `${sign}${Math.round(diff).toLocaleString()}%`;
        }

        return {
            list: defaultDays,
            series: [
                {
                    name: 'Collected Points',
                    data: pointsArray,
                },
            ],
            categories: defaultDays.map((d) => d.shortDay),
            totalPoints,
            dailyAverage,
            peakDay,
            sundayPoints,
            mondayPoints,
            mondayVsSundayGrowth,
        };
    }


    async pointTypeDistribution(filterDto?: ReportFilterDto): Promise<PointTypeDistributionResponse> {
        const caseTypeCondition = `
            CASE
                WHEN quest.action = 'share' OR LOWER(COALESCE(qpd.note, '')) LIKE '%share%' THEN 'Share'
                WHEN qpd.post_id IS NOT NULL AND qpd.comment_id IS NOT NULL AND qpd.reaction_id IS NULL THEN 'Comment'
                WHEN qpd.post_id IS NOT NULL AND qpd.reaction_id IS NOT NULL AND qpd.comment_id IS NULL THEN 'Reaction'
                WHEN qpd.post_id IS NOT NULL AND qpd.comment_id IS NULL AND qpd.reaction_id IS NULL THEN 'Create'
                ELSE 'Create'
            END
        `;

        const qb = this.questPointDetailRepository
            .createQueryBuilder('qpd')
            .leftJoin('qpd.quest', 'quest')
            .select(caseTypeCondition, 'type')
            .addSelect('COALESCE(SUM(qpd.points), 0)', 'total_points')
            .where('qpd.points > 0')
            .andWhere('qpd.note != :none', { none: 'Get point for activated account' })
            .andWhere('(qpd.post_id IS NOT NULL OR qpd.comment_id IS NOT NULL OR qpd.reaction_id IS NOT NULL)');

        this.applyDateFilter(qb, filterDto?.date_start, filterDto?.date_end);

        qb.groupBy(caseTypeCondition);

        const rawResults = await qb.getRawMany();

        const typeMap: Record<'Share' | 'Create' | 'Comment' | 'Reaction', number> = {
            Share: 0,
            Create: 0,
            Comment: 0,
            Reaction: 0,
        };

        for (const row of rawResults) {
            const type = row.type as 'Share' | 'Create' | 'Comment' | 'Reaction';
            if (typeMap[type] !== undefined) {
                typeMap[type] = Number(row.total_points || 0);
            }
        }

        const totalPoints = typeMap.Share + typeMap.Create + typeMap.Comment + typeMap.Reaction;

        const breakdown: PointTypeBreakdown[] = [
            {
                type: 'Share',
                points: typeMap.Share,
                percentage: totalPoints > 0 ? Math.round((typeMap.Share / totalPoints) * 100) : 0,
                color: '#3B82F6',
                badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            },
            {
                type: 'Create',
                points: typeMap.Create,
                percentage: totalPoints > 0 ? Math.round((typeMap.Create / totalPoints) * 100) : 0,
                color: '#EF4444',
                badgeClass: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            },
            {
                type: 'Comment',
                points: typeMap.Comment,
                percentage: totalPoints > 0 ? Math.round((typeMap.Comment / totalPoints) * 100) : 0,
                color: '#10B981',
                badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            },
            {
                type: 'Reaction',
                points: typeMap.Reaction,
                percentage: totalPoints > 0 ? Math.round((typeMap.Reaction / totalPoints) * 100) : 0,
                color: '#F59E0B',
                badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            },
        ];

        const series = [typeMap.Share, typeMap.Create, typeMap.Comment, typeMap.Reaction];
        const labels = ['Share', 'Create', 'Comment', 'Reaction'];

        return {
            breakdown,
            series,
            labels,
            totalPoints,
        };
    }

    async postHighestPoint(filterDto?: ReportFilterDto): Promise<PostHighestPointResponse> {
        const qb = this.questPointDetailRepository
            .createQueryBuilder('qpd')
            .leftJoin('qpd.post', 'post')
            .leftJoin('post.member', 'member')
            .leftJoin('post.space', 'space')
            .select('qpd.post_id', 'postId')
            .addSelect('COALESCE(SUM(qpd.points), 0)', 'totalPoints')
            .addSelect('MAX(post.title)', 'postTitle')
            .addSelect('MAX(post.reactionsCount)', 'reactionsCount')
            .addSelect('MAX(COALESCE(post.totalRepliesCount, post.repliesCount, 0))', 'repliesCount')
            .addSelect('MAX(post.sharesCount)', 'sharesCount')
            .addSelect('MAX(post.createdBy)', 'createdBy')
            .addSelect('MAX(member.name)', 'memberName')
            .addSelect('MAX(member.mmid_fullname)', 'memberMmid')
            .addSelect('MAX(space.name)', 'spaceName')
            .where('qpd.post_id IS NOT NULL AND qpd.points > 0')
            .andWhere('qpd.note != :none', { none: 'Get point for activated account' })
            .andWhere('(qpd.post_id IS NOT NULL OR qpd.comment_id IS NOT NULL OR qpd.reaction_id IS NOT NULL)');

        this.applyDateFilter(qb, filterDto?.date_start, filterDto?.date_end);

        qb.groupBy('qpd.post_id')
            .orderBy('totalPoints', 'DESC')
            .limit(5);

        const rawResults = await qb.getRawMany();

        const posts: PostPointItem[] = rawResults.map((row, idx) => {
            const author =
                row.memberName ||
                row.memberMmid ||
                row.createdBy ||
                'Admin Mimate';
            const category = row.spaceName || 'General';
            const title = row.postTitle || `Post #${row.postId}`;
            const points = Number(row.totalPoints || 0);
            const reactions = Number(row.reactionsCount || 0);
            const comments = Number(row.repliesCount || 0);
            const shares = Number(row.sharesCount || 0);

            return {
                id: `post-${row.postId || idx + 1}`,
                title,
                points,
                author,
                category,
                reactions,
                comments,
                shares,
            };
        });

        const categories = posts.map((p) => {
            if (p.title.length > 25) {
                return `${p.title.slice(0, 22)}...`;
            }
            return p.title;
        });

        const series = [
            {
                name: 'Collectable Points',
                data: posts.map((p) => p.points),
            },
        ];

        const topPost = posts.length > 0 ? posts[0] : null;

        return {
            posts,
            series,
            categories,
            topPost,
        };
    }

    async higherUserPoint(filterDto?: ReportFilterDto): Promise<HigherUserPointResponse> {
        const qb = this.questPointDetailRepository
            .createQueryBuilder('qpd')
            .leftJoin('qpd.member', 'member')
            .select('qpd.member_id', 'memberId')
            .addSelect('COALESCE(SUM(qpd.points), 0)', 'totalPoints')
            .addSelect('MAX(member.name)', 'name')
            .addSelect('MAX(member.mmid_fullname)', 'mmid_fullname')
            .addSelect('MAX(member.email)', 'email')
            .addSelect('MAX(member.email_mmid)', 'email_mmid')
            .addSelect('MAX(member.profilePictureUrl)', 'avatar')
            .where('qpd.points > 0')
            .andWhere('qpd.note != :none', { none: 'Get point for activated account' })
            .andWhere('(qpd.post_id IS NOT NULL OR qpd.comment_id IS NOT NULL OR qpd.reaction_id IS NOT NULL)');

        this.applyDateFilter(qb, filterDto?.date_start, filterDto?.date_end);

        qb.groupBy('qpd.member_id')
            .orderBy('totalPoints', 'DESC')
            .limit(6);

        const rawResults = await qb.getRawMany();

        const getMemberLevel = (points: number, rank: number): string => {
            if (points >= 1400 || rank === 1) return 'Diamond Member';
            if (points >= 1000 || rank === 2) return 'Platinum Member';
            if (points >= 700 || rank <= 4) return 'Gold Member';
            if (points >= 400 || rank <= 6) return 'Silver Member';
            return 'Bronze Member';
        };

        const users: UserPointLeaderItem[] = rawResults.map((row, idx) => {
            const rank = idx + 1;
            const points = Number(row.totalPoints || 0);
            const name = row.name || row.mmid_fullname || `Member #${row.memberId}`;
            const email = row.email || row.email_mmid || `member_${row.memberId}@mimate.id`;
            const avatar = row.avatar || undefined;

            return {
                id: `u-${row.memberId || rank}`,
                rank,
                name,
                email,
                avatar,
                points,
                level: getMemberLevel(points, rank),
            };
        });

        const categories = users.map((u) => u.name);
        const series = [
            {
                name: 'Total Points',
                data: users.map((u) => u.points),
            },
        ];

        return {
            users,
            series,
            categories,
        };
    }

    async latestPointCollector(): Promise<LatestPointCollectorResponse> {
        // 1. Fetch the 10 most recent point records
        const collectorsQb = this.questPointDetailRepository
            .createQueryBuilder('qpd')
            .leftJoin('qpd.member', 'member')
            .leftJoin('qpd.post', 'post')
            .leftJoin('qpd.quest', 'quest')
            .select('qpd.id', 'id')
            .addSelect('qpd.points', 'points')
            .addSelect('qpd.note', 'note')
            .addSelect('qpd.created_at', 'created_at')
            .addSelect('qpd.post_id', 'post_id')
            .addSelect('qpd.comment_id', 'comment_id')
            .addSelect('qpd.reaction_id', 'reaction_id')
            .addSelect('member.name', 'memberName')
            .addSelect('member.mmid_fullname', 'memberMmid')
            .addSelect('member.email', 'memberEmail')
            .addSelect('member.email_mmid', 'memberEmailMmid')
            .addSelect('member.profilePictureUrl', 'avatar')
            .addSelect('post.title', 'postTitle')
            .addSelect('quest.title', 'questTitle')
            .addSelect('quest.action', 'questAction')
            .where('qpd.points > 0')
            .andWhere('qpd.note != :none', { none: 'Get point for activated account' })
            .andWhere('(qpd.post_id IS NOT NULL OR qpd.comment_id IS NOT NULL OR qpd.reaction_id IS NOT NULL)')
            .orderBy('qpd.created_at', 'DESC')
            .limit(10);

        const rawCollectors = await collectorsQb.getRawMany();

        const formatTimeAgo = (dateInput: Date | string): string => {
            if (!dateInput) return 'Recently';
            const date = new Date(dateInput);
            const now = new Date();
            const diffMs = Math.max(0, now.getTime() - date.getTime());
            const diffSecs = Math.floor(diffMs / 1000);
            const diffMins = Math.floor(diffSecs / 60);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins} mins ago`;
            if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return `${diffDays} days ago`;
            return `${date.toISOString().slice(0, 10)}`;
        };

        const getActivityName = (row: any): string => {
            const cleanPostTitle = row.postTitle
                ? row.postTitle.length > 35
                    ? `${row.postTitle.slice(0, 32)}...`
                    : row.postTitle
                : null;

            if (row.questAction === 'share' || (row.note && row.note.toLowerCase().includes('share'))) {
                return cleanPostTitle
                    ? `Shared "${cleanPostTitle}"`
                    : (row.questTitle || row.note || 'Shared Official Campaign Post');
            }

            if (row.post_id && row.comment_id && !row.reaction_id) {
                return cleanPostTitle
                    ? `Commented on "${cleanPostTitle}"`
                    : (row.note || 'Commented on Community Post');
            }

            if (row.post_id && row.reaction_id && !row.comment_id) {
                return cleanPostTitle
                    ? `Reacted to "${cleanPostTitle}"`
                    : (row.note || 'Reacted to Community Post');
            }

            if (row.post_id && !row.comment_id && !row.reaction_id) {
                return cleanPostTitle
                    ? `Created Post "${cleanPostTitle}"`
                    : (row.note || 'Created Community Discussion');
            }

            return row.questTitle || row.note || 'Completed Quest Activity';
        };

        const collectors: PointCollectorItem[] = rawCollectors.map((row, idx) => {
            const name = row.memberName || row.memberMmid || `Member #${idx + 1}`;
            const email = row.memberEmail || row.memberEmailMmid || `member_${idx + 1}@mimate.id`;

            return {
                id: `pc-${row.id || idx + 1}`,
                name,
                email,
                avatar: row.avatar || undefined,
                points: Number(row.points || 0),
                activity: getActivityName(row),
                timeAgo: formatTimeAgo(row.created_at),
                status: 'Completed',
            };
        });

        const totalRecentPoints = collectors.reduce((acc, curr) => acc + curr.points, 0);

        // 2. Fetch Hourly Velocity Trend for the latest active date (or today)
        const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;
        let latestDateStr = '';
        if (rawCollectors.length > 0 && rawCollectors[0].created_at) {
            const d = new Date(rawCollectors[0].created_at);
            const dLocal = new Date(d.getTime() + TZ_OFFSET_MS);
            latestDateStr = dLocal.toISOString().slice(0, 10);
        } else {
            const nowLocal = new Date(Date.now() + TZ_OFFSET_MS);
            latestDateStr = nowLocal.toISOString().slice(0, 10);
        }

        const hourlyQb = this.questPointDetailRepository
            .createQueryBuilder('qpd')
            .select('HOUR(DATE_ADD(qpd.created_at, INTERVAL 8 HOUR))', 'hour')
            .addSelect('COALESCE(SUM(qpd.points), 0)', 'total_points')
            .where('qpd.points > 0')
            .andWhere('qpd.note != :none', { none: 'Get point for activated account' })
            .andWhere('(qpd.post_id IS NOT NULL OR qpd.comment_id IS NOT NULL OR qpd.reaction_id IS NOT NULL)')
            .andWhere('DATE(DATE_ADD(qpd.created_at, INTERVAL 8 HOUR)) = :targetDate', { targetDate: latestDateStr })
            .groupBy('HOUR(DATE_ADD(qpd.created_at, INTERVAL 8 HOUR))')
            .orderBy('hour', 'ASC');

        const hourlyRaw = await hourlyQb.getRawMany();

        // Default 8-hour timeline
        const defaultHours = [9, 10, 11, 12, 13, 14, 15, 16];
        const hourDataMap: Record<number, number> = {};
        for (const h of hourlyRaw) {
            hourDataMap[Number(h.hour)] = Number(h.total_points || 0);
        }

        let categories: string[] = [];
        let pointsData: number[] = [];

        if (hourlyRaw.length >= 3) {
            categories = hourlyRaw.map((h) => `${String(h.hour).padStart(2, '0')}:00`);
            pointsData = hourlyRaw.map((h) => Number(h.total_points || 0));
        } else {
            categories = defaultHours.map((h) => `${String(h).padStart(2, '0')}:00`);
            pointsData = defaultHours.map((h) => hourDataMap[h] || 0);
        }

        let velocityGrowth = '+14.2% vs earlier';
        if (pointsData.length >= 2) {
            const lastVal = pointsData[pointsData.length - 1];
            const prevVal = pointsData[pointsData.length - 2];
            if (prevVal > 0) {
                const diff = Math.round(((lastVal - prevVal) / prevVal) * 100);
                const sign = diff >= 0 ? '+' : '';
                velocityGrowth = `${sign}${diff}% vs earlier`;
            } else if (lastVal > 0) {
                velocityGrowth = `+${lastVal} pts vs earlier`;
            }
        }

        const series = [
            {
                name: 'Points Collected',
                data: pointsData,
            },
        ];

        return {
            collectors,
            series,
            categories,
            totalRecentPoints,
            velocityGrowth,
        };
    }
}