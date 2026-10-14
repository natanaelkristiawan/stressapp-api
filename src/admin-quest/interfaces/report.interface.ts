export interface HeadInfo {
    total_point_award: HeadInfoDetail,
    active_point_collector: HeadInfoDetail,
    high_single_post_reward: HeadInfoDetail,
    user_most_collected_point: HeadInfoDetail
}

export interface HeadInfoDetail {
    total: number;
    description: string;
}

export interface DailyPointItem {
    day: string;
    shortDay: string;
    points: number;
    highlight?: boolean;
}

export interface DailyPointCollectionResponse {
    list: DailyPointItem[];
    series: Array<{ name: string; data: number[] }>;
    categories: string[];
    totalPoints: number;
    dailyAverage: number;
    peakDay: {
        day: string;
        points: number;
    };
    sundayPoints: number;
    mondayPoints: number;
    mondayVsSundayGrowth: string;
}

export interface PointTypeBreakdown {
    type: 'Share' | 'Create' | 'Comment' | 'Reaction';
    points: number;
    percentage: number;
    color: string;
    badgeClass: string;
    iconName?: string;
}

export interface PointTypeDistributionResponse {
    breakdown: PointTypeBreakdown[];
    series: number[];
    labels: string[];
    totalPoints: number;
}

export interface PostPointItem {
    id: string;
    title: string;
    points: number;
    author: string;
    category: string;
    reactions: number;
    comments: number;
    shares: number;
}

export interface PostHighestPointResponse {
    posts: PostPointItem[];
    series: Array<{ name: string; data: number[] }>;
    categories: string[];
    topPost: PostPointItem | null;
}

export interface UserPointLeaderItem {
    id: string;
    rank: number;
    name: string;
    email: string;
    avatar?: string;
    points: number;
    level: string;
}

export interface HigherUserPointResponse {
    users: UserPointLeaderItem[];
    series: Array<{ name: string; data: number[] }>;
    categories: string[];
}

export interface PointCollectorItem {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    points: number;
    activity: string;
    timeAgo: string;
    status: 'Completed' | 'Verified';
}

export interface LatestPointCollectorResponse {
    collectors: PointCollectorItem[];
    series: Array<{ name: string; data: number[] }>;
    categories: string[];
    totalRecentPoints: number;
    velocityGrowth: string;
}