import { PostBrief, Author } from './reaction.interface';

export interface CommentItem {
    id: number;
    commentId?: string;
    title: string;
    description: string;
    externalId?: string;
    repliesCount?: number;
    created_at: Date;
    updated_at: Date;
    deleted_at?: Date;
    parent?: CommentItem | null;
    post: PostBrief;
    author?: Author;
}

export interface DatatableComment {
    items: CommentItem[];
    recordsTotal: number;
    recordsFiltered: number;
}


