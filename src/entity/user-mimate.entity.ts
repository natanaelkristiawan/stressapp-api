import { AfterLoad, Column, CreateDateColumn, DeleteDateColumn, Entity, Index, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { UserFollowEntity } from "./user-follow.entity";
import { PostReport } from "./post-report.entity";
import { Quest } from "./quest.entity";
import { QuestPointDetail } from "./quest-point-detail.entity";
import { UserAdmin } from "./user-admin.entity";
import { QuestPoint } from "./quest-point.entity";
@Entity({engine: 'InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin',name: "members"})
export class Member {
    @Column({ length: 60, nullable: true, select: false })
    passwordHash: string | null;

    @Column({ type: 'datetime', nullable: true })
    verifiedAt: Date | null;

    @Column({ type: 'datetime', nullable: true })
    termsAcceptedAt: Date | null;

    @Column({ default: false })
    memberAuthEnabled: boolean;

    @Index('UQ_members_username', { unique: true })
    @Column({ length: 100, nullable: true })
    username: string | null;

    @Column({ length: 100, nullable: true })
    location: string | null;

    @Column({ type: 'json', nullable: true })
    preferences: string[] | null;

    @PrimaryGeneratedColumn()
    id?: number;

    @Column({nullable: true})
    name: string;

    @Index()
    @Column({nullable: true})
    memberId?: string;

    @Column({nullable: true})
    status?: string;

    @Index('UQ_members_email', { unique: true })
    @Column({nullable: true})
    email: string;

    @Index()
    @Column({nullable: true})
    spaces?: string;


    @Index()
    @Column({nullable: true})
    externalId?: string;

    @Index()
    @Column({nullable: true})
    userId?: number;

    @Index()
    @Column({nullable: true})
    email_mmid?: string;

    @Column({ nullable: true})
    image_path?: string;

    @Column({ nullable: true})
    profilePictureUrl?: string;
    
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
    last_seen_at?: Date;


    @Column({
        type: 'datetime',
        nullable: true,
    })
    activated_at?: Date;

    @Column({nullable: true})
    total_posts?: number;

    @Column({nullable: true})
    total_followers?: number;

    @Column({nullable: true})
    total_followings?: number;

    @Column({nullable: true})
    total_spaces?: number;


    @Column({ nullable: true})
    tagline?: string;

    @Column({ nullable: true})
    bio?: string;

    @Column({ nullable: true})
    gender?: string;

    @Column({
        type: 'date',
        nullable: true,
    })
    dob?: Date;

    @Column({ nullable: true})
    hobby?: string;

    @Column({ nullable: true})
    link?: string;

    @Column({ nullable: true})
    post_code?: string;

    @Column({ nullable: true})
    address?: string;

    @Column({
        type: 'date',
        nullable: true,
    })
    sim_expired?: Date;

    @Column({ nullable: true})
    total_comments?: number;

    @Column({ nullable: true})
    total_likes?: number;

    @Column({ nullable: true})
    total_shares?: number;
    
    
    // 0: User, 1: Admin, 2: Moderator
    @Column({ nullable: true})
    member_role?: number;
    


    @OneToMany(() => UserFollowEntity, follow => follow.follower)
    following?: UserFollowEntity[];

    @OneToMany(() => UserFollowEntity, follow => follow.following)
    followers?: UserFollowEntity[];

    @Column({ nullable: false, default: false})
    is_dealer?: boolean;

    @OneToMany(() => PostReport, report => report.reportedBy)
    reports?: PostReport[];

    @OneToMany(() => Quest, quest => quest.createdBy)
    quests?: Quest[];

    @OneToMany(() => QuestPointDetail, (questPointDetail) => questPointDetail.member)
    questPointDetails?: QuestPointDetail[];

    // Inverse side: FK lives on users.backup_member_id → members.id (see UserAdmin)
    @OneToOne(() => UserAdmin, (userAdmin) => userAdmin.userMimate)
    userAdmin?: UserAdmin;

    @Column({ nullable: true})
    mmid_fullname?: string;


    // is_suspended
    @Column({ nullable: false, default: false})
    is_suspended?: boolean;

    // suspend_reason
    @Column({ nullable: true})
    suspend_reason?: string;
    
    // member_verified
    @Column({ nullable: false, default: false})
    member_verified?: boolean;

    // Inverse side: FK lives on quest_points.member_id → members.id (see QuestPoint)
    @OneToOne(() => QuestPoint, (questPoint) => questPoint.member)
    questPoint?: QuestPoint;


    @Column({ nullable: true})
    profilePictureUrl_bak?: string;

    @Column({ nullable: true})
    profilePictureUrl_new?: string;

    @Column({ nullable: true})
    quiz_winner?: number;
}
// Compatibility export: one mapped entity, not a second identity table.
export { Member as UserMimateEntity };
