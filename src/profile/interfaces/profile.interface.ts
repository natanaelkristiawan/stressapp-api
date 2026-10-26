export interface profile {
  id: number;
  name: string;
  photo: string;
  email: string;
  gender: string;
  dob: Date;
  tagline: string;
  bio: string;
  hobby: string;
  link: string;
  postCode: string;
  address: string;
  SIMExpired: Date;
  totalPosts: number;
  totalFollowers: number;
  totalFollowings: number;
  totalSpaces: number;
  following: boolean;
  is_dealer: boolean;
  share_url?: string;
  spaces?: space[];
  memberSince: string;
  lastSeenAt: string;
  vehicleList: string[];
  mimatePoint?: number;
}

export interface space {
  id: number;
  name: string;
}

export interface MemberFollowInterface {
  memberId: number;
  name: string;
  profilePicture: string;
  bio?: string;
  seen?: number;
}

export type FriendRelationshipState =
  | 'self'
  | 'none'
  | 'outgoing_pending'
  | 'incoming_pending'
  | 'accepted';

export interface FriendCardItemInterface {
  id: string;
  memberId: number;
  name: string;
  username: string;
  location: string;
  avatarUrl: string;
  isOnline: boolean;
  relationshipStatus: FriendRelationshipState;
}

export interface FriendDiscoverPageInterface {
  items: FriendCardItemInterface[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FriendConnectionsInterface {
  requests: FriendCardItemInterface[];
  friends: FriendCardItemInterface[];
  totalFriends: number;
}

export interface FriendProfilePostStatsInterface {
  views: string;
  likes: string;
  comments: string;
  shares: string;
}

export interface FriendProfilePostInterface {
  id: string;
  authorName: string;
  authorAvatar: string;
  publishedAt: string;
  title: string;
  excerpt: string;
  stats: FriendProfilePostStatsInterface;
}

export interface FriendMemberProfileInterface {
  id: string;
  memberId: number;
  name: string;
  username: string;
  location: string;
  avatarUrl: string;
  bio: string;
  preferences: string[];
  connectionsCount: number;
  connectionsLabel: string;
  relationshipStatus: FriendRelationshipState;
  postsCount: number;
  posts: FriendProfilePostInterface[];
}

export interface FriendMutationResultInterface {
  memberId: number;
  relationshipStatus: FriendRelationshipState;
}

export interface MemberSelfProfileInterface {
  id: number;
  name: string;
  email: string;
  emailVerified: boolean;
  username: string;
  location: string;
  bio: string;
  avatarUrl: string;
  preferences: string[];
}
