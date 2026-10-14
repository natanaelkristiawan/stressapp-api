export interface topMember {
    userId: number
    name: string
    email: string
    profilePicture: string
    count: string
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