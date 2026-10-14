export interface PostBrief {
    id: number;
    backup_member_id: number;
    backup_space_id: number;
    title: string;
    description: string;
    image: string;
    status: string;
}

export interface Author {
    id: number;
    name: string;
    email: string;
    profilePictureUrl: string;
    userId: number;
}

export interface ReactionItem {
    id: number;
    reaction: string;
    reactionId?: string;
    name?: string;
    post?: PostBrief;
    author?: Author;
    created_at: Date;
    updated_at: Date;
}

export interface DatatableReaction {
    items: ReactionItem[];
    recordsTotal: number;
    recordsFiltered: number;
}


