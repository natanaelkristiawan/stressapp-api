// interface
 export interface Information {
    totalData: number
    hasNext: boolean
    page: number
    limit: number
    offset: number
    after: string
}

export interface Post {
    id: number
    textContent: string
    title: string
    description: string
    image: string
    reactionCount:number
    repliesCount:number
    tags?: Tag[]
    reaction?: Reaction[]
    member:Member
    mmidUserId:number
    medias:Media[]
    space:Space
    created_at:string
    published_at:string
    totalRepliesCount:number
    type:string
    post_type?: 'post' | 'vote'
    vote_start?: Date | string
    vote_end?: Date | string
    total_vote?: number
    votes?: { id: number; vote: string }[]
    published_at_title?:string,
    is_post_owner?:boolean,
    share_url?:string
    // Report information for admin view
    reportCount?: number
    reporterCount?: number
    reportDescription?: string,
    my_vote_id?:number
    is_hidden?:boolean  
}


export interface Space {
    id: number
    name: string
    description: string
    membersCount:number
    postsCount:number
}

export interface Member {
    name: string
    id: number
    email: string
    profilePictureUrl:string
    is_dealer?:boolean
}


export interface Media {
    id: number
    url:string
    width?:number
    height?:number
    type:string
    thumbnail?:Thumbnail
}


export interface Thumbnail {
    url:string
    width?:number
    height?:number
    type:string
}




export interface Tag {
    description?: string
    slug: string
    id: string
    title: string
}

export interface Reaction {
    reaction: string
    count: number,
    reacted: boolean
}


export interface PostCollectionResponse {
    totalData: number
    hasNext: boolean
    page: number
    limit: number
    offset: number
    after: string
    data: Post[]
}