export interface Reaction {
    id: number;
    reaction: string;
    member: Member;
    post_id: number;
    post_member?: number;
    post_member_id?: number;
    isFollow?: boolean;
}


export interface Member {
    id: number;
    name: string;
    profilePictureUrl: string;
    bio?: string;
}