import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { UserMimateEntity } from "./user-mimate.entity";
import { SpaceEntity } from "./space.entity";
import { ReactionEntity } from "./reaction.entity";
import { AssetsEntity } from "./asset.entity";
import { PostReport } from "./post-report.entity";
import { PostTagsEntity } from "./post-tags.entity";
import { CommentEntity } from "./comment.entity";
import { QuestPointDetail } from "./quest-point-detail.entity";
import { VoteEntity } from "./vote.entity";

export enum PostType {
  Post = 'post',
  Vote = 'vote',
}

@Entity({engine: 'InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin',name: "backup_post_with_attributes"})
export class PostEntity {
    @PrimaryGeneratedColumn()
    id?: number;

    @Index()
    @Column({nullable: true,})
    postId?: string;

    @Column({ nullable: true, type: "longtext"})
    mappingFields?: string;

    @Column({ nullable: true, type: "longtext"})
    fields?: string;
    
    @Column({nullable: true,})
    subscribersCount: number;

    @Column({nullable: true, default: false})
    isHidden?: boolean;

    @Column({nullable: true,})
    postTypeId?: string;

    @Column({nullable: true,})
    reactionsCount: number;

    @Column({nullable: true,})
    hasMoreContent: number;

    @Column({nullable: true,})
    isAnonymous?: string;

    @Column({nullable: true,  type: "longtext"})
    shortContent?: string;

    @Column({nullable: true,  type: "longtext"})
    htmlContent?: string;

    @Column({nullable: true,})
    createdAt?: string;

    @Column({nullable: true,})
    publishedAt?: string;

    @Index()
    @Column({nullable: true,})
    ownerId?: string;

    @Index()
    @Column({nullable: true,})
    externalId?: string;

    @Index()
    @Column({nullable: true,})
    userId?: number;
    
    @Index()
    @Column({nullable: true,})
    createdById?: string;

    @Column({nullable: true,})
    status: string;

    @Index()
    @Column({nullable: true,})
    spaceId: string;

    @Column({nullable: true,})
    repliesCount: number;

    @Column({nullable: true,})
    totalRepliesCount: number;

    @Column({nullable: true,})
    locked?: string;

    @Column({nullable: true,  type: "longtext"})
    title: string;

    @Column({nullable: true,})
    description: string;

    @Column({nullable: true,  type: "longtext"})
    textContent: string;

    @Column({ nullable: true, type: "longtext"})
    thumbnail: string;

    @Column({ nullable: true, type: "longtext"})
    mediaIds?: string;

    @Column({ nullable: true})
    is_checked_asset?: boolean;

    @Column({ nullable: true})
    is_download_asset?: boolean;

    @Column({ nullable: true})
    image?: string;

    @Index()
    @Column({ nullable: true})
    image_path?: string;

    @Column({nullable: true,})
    relativeUrl?: string;

    @Column({nullable: true,})
    url?: string;

    @Column({ nullable: true, type: "longtext"})
    createdBy?: string;

    @Column({ nullable: true, type: "longtext"})
    tags: string;

    @Column({ nullable: true, type: "longtext"})
    reactions?: string;

    @Index()
    @Column({nullable: true,})
    is_check_comment?: boolean;


    @Index()
    @Column({nullable: false, default: false})
    is_highlight?: boolean;

    @Index()
    @Column({nullable: true,})
    is_check_reaction?: boolean;

    @Column({nullable: true,})
    after?: string;
    
    @Column({
        type: 'datetime',
        nullable: true,
    })
    curlAt?: Date;


    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @DeleteDateColumn()
    deleted_at?: Date;

    @Column({
        type: 'datetime',
        nullable: true,
    })
    published_at: Date;


    @ManyToOne(()=>UserMimateEntity, (member) => member.id)
    @JoinColumn({ name: 'backup_member_id' })
    member?: UserMimateEntity


    @ManyToOne(()=>SpaceEntity, (space) => space.id)
    @JoinColumn({ name: 'backup_space_id' })
    space?: SpaceEntity


    @OneToMany(()=>ReactionEntity, (reaction) => reaction.post)
    @JoinColumn({ name: 'id' })
    reactionList?: ReactionEntity[]


    @OneToMany(()=>AssetsEntity, (asset) => asset.post)
    @JoinColumn({ name: 'id' })
    medias?: AssetsEntity[]

    // comments
    @OneToMany(()=>CommentEntity, (comment) => comment.post)
    @JoinColumn({ name: 'id' })
    comments?: CommentEntity[]
    

    // create type with enum image or video default is image
    @Column({
        type: 'enum',
        enum: ['image', 'video'],
        default: 'image'
    })
    type?: string;



    @OneToMany(() => PostReport, report => report.post)
    reports?: PostReport[];


    // quest point details
    @OneToMany(() => QuestPointDetail, (questPointDetail) => questPointDetail.post)
    questPointDetails?: QuestPointDetail[];


    @Column({nullable: true,})
    backup_member_id?: number;

    @Column({nullable: true,})
    backup_space_id?: number;

    @Column({nullable: true,})
    order?: number;

    @Column({nullable: true,})
    image_backup?:string;

    // image_open_url
    @Column({nullable: true,})
    image_open_url?:string;


    @Column({nullable: true, default: 0})
    viewsCount?: number;

    // shares
    @Column({nullable: true, default: 0})
    sharesCount?: number;

    post_view_count?: number;

    @Column({
        type: 'enum',
        enum: PostType,
        default: PostType.Post,
        nullable: true,
    })
    post_type?: PostType;

    @Column({
        type: 'datetime',
        nullable: true,
    })
    vote_start?: Date;

    @Column({
        type: 'datetime',
        nullable: true,
    })
    vote_end?: Date;

    @Column({ nullable: true, default: 0 })
    total_vote?: number;

    @OneToMany(() => VoteEntity, (vote) => vote.post)
    votes?: VoteEntity[];
}