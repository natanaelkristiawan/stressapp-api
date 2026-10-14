export interface MostExistActivityBreakdown {
  postPoints: number;
  commentPoints: number;
  reactionPoints: number;
  sharePoints: number;
}

export interface MostExistWinnerItem {
  rank: number;
  memberId: number;
  name: string;
  email: string;
  profilePictureUrl?: string;
  monthlyPoints: number;
  totalQuestPoints: number;
  isPointValid: boolean;
  pointDiscrepancy: number;
  activityBreakdown: MostExistActivityBreakdown;
}

export interface MostExistPeriod {
  month: number;
  year: number;
  startDate: string;
  endDate: string;
}

export interface MostExistResponseInterface {
  category: string;
  period: MostExistPeriod;
  totalWinners: number;
  items: MostExistWinnerItem[];
}
