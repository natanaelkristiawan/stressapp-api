export interface PostReportInterface {
    id: number;
    reason: string;
    description?: string;
    createdAt: Date;
    post:PostInterface;
    reportedById: MemberInterface;
  }

export interface PostInterface {
    id: number;
    title: string;
}

export interface MemberInterface {
    id: number;
    name: string;
    profilePictureUrl: string;
}

export interface PostReportCollectionResponse {
    totalData: number;
    hasNext: boolean;
    page: number;
    limit: number;
    offset: number;
    after: string;
    data: PostReportInterface[];
}
  