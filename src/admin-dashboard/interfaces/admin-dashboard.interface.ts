export interface topMember {
  userId: number;
  name: string;
  email: string;
  profilePicture: string;
  count: string;
}

export interface TopSpace {
  id: number;
  name: string;
  image: string;
  count: number;
}

export interface TopPost {
  id: number;
  title: string;
  image: string;
  count: number;
}

export interface PostVoteReportItem {
  id: number;
  title: string;
  status: 'Draft' | 'Scheduled' | 'Active' | 'Ended';
  publishDate: string;
  endDate: string;
  totalViewed: number;
  totalVotes: number;
  uniqueVoters: number;
  topAnswer: string;
  participationRate: string;
}
/** Current member fields used by dashboard exports; retired vehicle/quiz placeholders are excluded. */
export interface DashboardMemberExport {
  id: number;
  userId?: number;
  name: string;
  username: string | null;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  siteRole: string;
  dob: Date | null;
  gender: string;
  posts: number;
  comments: number;
  likes: number;
  shares: number;
  status: string;
  last_seen_at?: Date;
}
