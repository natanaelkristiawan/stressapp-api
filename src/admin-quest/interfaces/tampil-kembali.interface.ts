export interface TampilKembaliActivityBreakdown {
  postPoints: number;
  commentPoints: number;
  reactionPoints: number;
  sharePoints: number;
}

export interface TampilKembaliWinnerItem {
  rank: number;
  memberId: number;
  name: string;
  email: string;
  profilePictureUrl?: string;
  lastActive: string | null;
  monthlyPoints: number;
  totalQuestPoints: number;
  isPointValid: boolean;
  pointDiscrepancy: number;
  activityBreakdown: TampilKembaliActivityBreakdown;
}

export interface TampilKembaliPeriod {
  month: number;
  year: number;
  startDate: string;
  endDate: string;
  inactiveCutoffDate: string;
}

export interface TampilKembaliResponseInterface {
  category: string;
  period: TampilKembaliPeriod;
  totalWinners: number;
  items: TampilKembaliWinnerItem[];
}
