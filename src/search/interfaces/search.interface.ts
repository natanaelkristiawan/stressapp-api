// search interface

export interface SearchAllResponse {
    post: PostSearchInterface[]
    tag: TagSearchInterface[]
    member: MemberSearchInterface[]
}

export interface SearchInterface {
    keyword: string;
    type: string;
}



export interface PostSearchResponse {
    totalData: number
    hasNext: boolean
    page: number
    limit: number
    offset: number
    after: string
    data: PostSearchInterface[]
}

export interface PostSearchInterface {
    postId: number;
    title: string;
    space: SpaceSearchInterface;
    published_at: Date;
    published_at_title: string;
}


export interface SpaceSearchInterface {
    spaceId: number;
    name: string;
}



export interface TagSearchResponse {
    totalData: number
    hasNext: boolean
    page: number
    limit: number
    offset: number
    after: string
    data: TagSearchInterface[]
}


export interface TagSearchInterface {
    tagId: number;
    title: string;
    totalPost: number;
    totalPostFormatted: string;
}


export interface MemberSearchResponse {
    totalData: number
    hasNext: boolean
    page: number
    limit: number
    offset: number
    after: string
    data: MemberSearchInterface[]
}


export interface MemberSearchInterface {
    memberId: number;
    name: string;
    profilePicture: string;
    bio?: string;
    email?: string;
}