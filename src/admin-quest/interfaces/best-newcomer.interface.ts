export interface BestNewcomerActivityBreakdown {
  postPoints: number;
  commentPoints: number;
  reactionPoints: number;
  sharePoints: number;
}

export interface BestNewcomerWinnerItem {
  rank: number;
  memberId: number;
  name: string;
  email: string;
  profilePictureUrl?: string;
  joinedAt: string;
  monthlyPoints: number;
  totalQuestPoints: number;
  isPointValid: boolean;
  pointDiscrepancy: number;
  activityBreakdown: BestNewcomerActivityBreakdown;
}

export interface BestNewcomerPeriod {
  month: number;
  year: number;
  startDate: string;
  endDate: string;
  joinWindowStartDate: string;
  joinWindowEndDate: string;
}

export interface BestNewcomerResponseInterface {
  category: string;
  period: BestNewcomerPeriod;
  totalWinners: number;
  items: BestNewcomerWinnerItem[];
}
