export interface CommentInterface {
    id: number;
    title: string;
    description: string;
    parent_id: number;
    post_id: number;
    member: Member;
    comments: CommentInterface[];
    repliesCount: number;
    published_at: Date;
    published_at_title: string;
    reactions?: CommentReactionInterface;
    /** Set by createComment when replying; used to skip reply notification when post owner === comment owner */
    postOwnerUserId?: number;
    parentCommentOwnerUserId?: number;
    postOwnerId?:number
}



export interface CommentCollectionResponse {
    totalData: number
    hasNext: boolean
    page: number
    limit: number
    offset: number
    after: string
    data: CommentInterface[]
}


export interface Member {
    id: number
    name: string
    userId: number
    profilePictureUrl: string
}

export interface CommentReactionInterface {
   reaction: string
   count: number
   reacted: boolean
}