export interface Datatable {
    items: DataPost[];
    recordsTotal: number;
    recordsFiltered: number;
}
export interface DataPost {
    id: number;
    version?: string;
    textContent?: string;
    backup_member_id?: number;
    backup_space_id?: number;    
    title: string;
    description?: string;
    thumbnail?: string;
    image?: string;
    status: string;
    type: string;
    reactionsCount: number;
    totalRepliesCount: number;
    totalViewsCount?: number;
    created_at: Date;
    updated_at: Date;
    published_at: Date;
    deleted_at?: Date;
    space?: Space;
    author?: User;
    isHidden: boolean;
    post_type?: string;
    vote_start?: Date | null;
    vote_end?: Date | null;
    total_vote?: number;
    tags?: Tag[];
}

export interface Tag {
    id?: number | string;
    slug: string;
    title: string;
}

export interface Space {
    id?: number;
    name: string;
    description: string;
}

export interface User {
    id: number;
    name: string;
    email: string;
    profilePictureUrl: string;
    userId: number;
}