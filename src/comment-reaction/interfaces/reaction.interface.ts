export interface Reaction {
    id: number;
    reaction: string;
    member: Member;
    comment_id: number;
    post_id?:number,
    comment_owner?:number
}


export interface Member {
    id: number;
    name: string;
    profilePictureUrl: string;
}