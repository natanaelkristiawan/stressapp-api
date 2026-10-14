export interface MemberVoteMember {
  id: number;
  name: string;
  profilePictureUrl?: string;
  /** ISO date string when the user voted */
  votedAt?: string;
}

export interface MemberVote {
  id: number;
  post_id: number;
  vote_id: number;
  member: MemberVoteMember;
}

export interface VoteDetailItem {
  id: number;
  vote: string;
  total_vote: number;
  percentage: number;
}

export interface VoteDetailResponse {
  post_id: number;
  vote_start?: Date | string | null;
  vote_end?: Date | string | null;
  total_votes: number;
  votes: VoteDetailItem[];
  /** Vote option id the current user selected; null if not voted or not authenticated */
  my_vote_id?: number | null;
}

export interface VoteOptionMembersResponse {
  vote_id: number;
  vote: string;
  total_vote: number;
  members: MemberVoteMember[];
}
