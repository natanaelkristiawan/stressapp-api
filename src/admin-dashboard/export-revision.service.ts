import { Activity } from "src/entity/activity.entity";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository, In } from "typeorm";
import { PostEntity } from "src/entity/post.entity";
import { SpaceEntity } from "src/entity/space.entity";
import { UserMimateEntity } from "src/entity/user-mimate.entity";
import { ReactionEntity } from "src/entity/reaction.entity";
import { CommentEntity } from "src/entity/comment.entity";
import * as ExcelJS from 'exceljs';
import { DataUser } from "src/admin-user/interfaces/datatable.interface";
import { DataPost } from "src/admin-post/interfaces/datatable.interface";
import { CardRevisionService } from "./card-revision.service";
import { RequestLogEntity } from "src/entity/log.entity";


export class ExportRevisionService {

    protected readonly siteRole = {
        "0": "Member",
        "1": "Admin",
    }

    constructor(
        // inject acr
        @InjectRepository(Activity, 'mimate')
        private readonly activityRepository: Repository<Activity>,

        // inject post repository
        @InjectRepository(PostEntity, 'mimate')
        private readonly postRepository: Repository<PostEntity>,

        @InjectRepository(CommentEntity, 'mimate')
        private readonly commentRepository: Repository<CommentEntity>,

        @InjectRepository(ReactionEntity, 'mimate')
        private readonly reactionRepository: Repository<ReactionEntity>,

        @InjectRepository(UserMimateEntity, 'mimate')
        private readonly memberRepository: Repository<UserMimateEntity>,

        @InjectRepository(SpaceEntity, 'mimate')
        private readonly spaceRepository: Repository<SpaceEntity>,

        @InjectRepository(RequestLogEntity, 'mimate')
        private readonly requestLogEntity: Repository<RequestLogEntity>,

        @InjectDataSource('mimate')
        private readonly dataSource: DataSource,

        // card revision service
        private readonly cardRevisionService: CardRevisionService,
    ) { }

    private getMemberName(name: string, mmid_fullname: string, id: number): string {

        let tempName = name
        if (!tempName || tempName.trim() === '') {
            tempName = mmid_fullname;
        }


        if (!tempName || tempName.trim() === '') {
            tempName = `user_${String(id).padStart(4, '0')}`;
        }

        return tempName
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }
    // for export data to excel new member base on start_date and end_date
    async exportDataToExcelNewMember(
        start_date: Date,
        end_date: Date
    ): Promise<{ buffer: Buffer; filename: string }> {
        // Build LOCAL (UTC+8) bounds
        const startLocal = new Date(start_date);
        startLocal.setHours(0, 0, 0, 0);

        const endLocal = new Date(end_date);
        endLocal.setHours(23, 59, 59, 999);

        // Convert LOCAL → UTC for DB query
        const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;
        const startUtc = new Date(startLocal.getTime() - TZ_OFFSET_MS);
        const endUtc = new Date(endLocal.getTime() - TZ_OFFSET_MS);

        // Query using UTC bounds
        const data = await this.memberRepository
            .createQueryBuilder('user')
            .where('user.activated_at BETWEEN :start AND :end', { start: startUtc, end: endUtc })
            .orderBy('user.activated_at', 'ASC')
            .getMany();



        let vehicleMap = new Map<number, string[]>();

        // External vehicle enrichment is retired; compatibility cells remain empty.








        // Map to LOCAL (UTC+8) for display in Excel
        const mapData: DataUser[] = data.map(user => {
            const toLocal = (date: Date | null) =>
                date ? new Date(date.getTime() + TZ_OFFSET_MS) : null;






            return {
                id: user.id,
                userId: user.userId,
                name: this.getMemberName(user.name, user.mmid_fullname, user.id),
                email: user.email,
                createdAt: toLocal(user.activated_at) as any,   // now LOCAL
                updatedAt: toLocal(user.updated_at) as any,   // now LOCAL
                username: user.mmid_fullname,
                status: user.status,
                siteRole: this.siteRole[user.member_role],
                vehicleList: vehicleMap.get(user.userId) ?? [],
                dob: user.dob,
                gender: user.gender,
                mimatePoint: 0,
                posts: user.total_posts,
                comments: user.total_comments,
                likes: user.total_likes,
                shares: user.total_shares,
                quizWinner: 0,
                last_seen_at: toLocal(user.last_seen_at) as any, // now LOCAL
            };
        });

        const { buffer, filename } = await this.writeToExcel(mapData, 'New Member List', 'new_member_list');
        return { buffer, filename };
    }


    // for export data to excel active member base on start_date and end_date
    async exportDataToExcelActiveMember(
        start_date: Date,
        end_date: Date
    ): Promise<{ buffer: Buffer; filename: string }> {
        // Build LOCAL (UTC+8) bounds
        const startLocal = new Date(start_date);
        startLocal.setHours(0, 0, 0, 0);

        const endLocal = new Date(end_date);
        endLocal.setHours(23, 59, 59, 999);

        // Convert LOCAL → UTC for querying
        const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;
        const startUtc = new Date(startLocal.getTime() - TZ_OFFSET_MS);
        const endUtc = new Date(endLocal.getTime() - TZ_OFFSET_MS);

        // Query active members within the UTC bounds
        const activeUsers = await this.activityRepository
            .createQueryBuilder('activity')
            .innerJoin('members', 'member', 'member.id = activity.userId')
            .select([
                'member.id AS id',
                'member.name AS name',
                'member.email AS email',
                'member.created_at AS created_at',
                'member.updated_at AS updated_at',
                'member.mmid_fullname AS mmid_fullname',
                'member.status AS status',
                'member.member_role AS member_role',
                'member.dob AS dob',
                'member.gender AS gender',
                'member.total_posts AS total_posts',
                'member.total_comments AS total_comments',
                'member.total_likes AS total_likes',
                'member.total_shares AS total_shares',
                'member.last_seen_at AS last_seen_at',
            ])
            .where('activity.createdAt BETWEEN :start AND :end', { start: startUtc, end: endUtc })
            .groupBy('member.id')
            .orderBy('member.last_seen_at', 'DESC')
            .getRawMany<{
                id: number;
                name: string;
                email: string;
                created_at: Date;
                updated_at: Date;
                mmid_fullname: string;
                status: string;
                member_role: string;
                dob: Date | null;
                gender: string | null;
                total_posts: number;
                total_comments: number;
                total_likes: number;
                total_shares: number;
                last_seen_at: Date | null;
            }>();

        // Map to export shape in LOCAL (UTC+8)
        const toLocal = (d: Date | null) => (d ? new Date(new Date(d).getTime() + TZ_OFFSET_MS) : null);

        const mapData: DataUser[] = activeUsers.map((user) => ({
            id: Number(user.id),
            name: user.name,
            email: user.email,
            createdAt: toLocal(user.created_at) as any,  // LOCAL (UTC+8)
            updatedAt: toLocal(user.updated_at) as any,  // LOCAL (UTC+8)
            username: user.mmid_fullname,
            status: user.status,
            siteRole: this.siteRole[user.member_role],
            vehicleList: [],
            dob: user.dob,
            gender: user.gender,
            mimatePoint: 0,
            posts: Number(user.total_posts) || 0,
            comments: Number(user.total_comments) || 0,
            likes: Number(user.total_likes) || 0,
            shares: Number(user.total_shares) || 0,
            quizWinner: 0,
            last_seen_at: toLocal(user.last_seen_at) as any, // LOCAL (UTC+8)
        }));

        const { buffer, filename } = await this.writeToExcel(
            mapData,
            'Active Member List',
            'active_member_list'
        );
        return { buffer, filename };
    }


    // Write to excel helper method - single function for all exports
    async writeToExcel(data: any, worksheetName: string, filenamePrefix: string): Promise<{ buffer: Buffer; filename: string }> {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(worksheetName);

        // Add header based on DataUser interface
        worksheet.addRow(['Id', 'Name', 'Email', 'Status', 'Site Role', 'Vehicle List', 'DOB', 'Gender', 'Mimate Point', 'Posts', 'Comments', 'Likes', 'Shares', 'Quiz Winner', 'Created At', 'Updated At', 'Last Seen At']);

        for (const user of data) {
            worksheet.addRow([
                user.id,
                user.name,
                user.email,
                user.status,
                user.siteRole,
                user.vehicleList,
                user.dob,
                user.gender,
                user.mimatePoint,
                user.posts,
                user.comments,
                user.likes,
                user.shares,
                user.quizWinner,
                user.createdAt,
                user.updatedAt,
                user.last_seen_at
            ]);
        }

        // Generate buffer and filename
        const buffer = await workbook.xlsx.writeBuffer() as Buffer;
        const filename = `${filenamePrefix}_${Date.now()}.xlsx`;

        return { buffer, filename };
    }


    // for export data to excel page view base on start_date and end_date
    // pending export
    async exportDataToExcelPageView(start_date: Date, end_date: Date): Promise<{ buffer: Buffer; filename: string }> {

        // Add time to dates for proper filtering
        const startDate = new Date(start_date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(end_date);
        endDate.setHours(23, 59, 59, 999);

        const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;

        // Treat this.dateStart/End and *Before as LOCAL (UTC+8) bounds.
        const startUtc = new Date(startDate.getTime() - TZ_OFFSET_MS);
        const endUtc = new Date(endDate.getTime() - TZ_OFFSET_MS);

        const handlers = [
            'getAllHighlight',
            'detailPost',
            'createPost',
            'followers',
            'detail',
            'searchAll',
            'getMessages',
        ];


        // Daily breakdown by LOCAL (UTC+8) calendar day
        const detailRows = await this.requestLogEntity
            .createQueryBuilder('log')
            .select("DATE(DATE_ADD(log.createdAt, INTERVAL 8 HOUR))", "date")
            .addSelect("COUNT(log.backup_member_id)", "count")
            .where("log.handler IN (:...handlers)", { handlers })
            .andWhere("log.backup_member_id IS NOT NULL")
            .andWhere("log.createdAt BETWEEN :start AND :end", { start: startUtc, end: endUtc })
            .groupBy("DATE(DATE_ADD(log.createdAt, INTERVAL 8 HOUR))")
            .orderBy("date", "ASC")
            .getRawMany<{ date: string; count: string }>();

        const detailCount = detailRows.map(r => ({
            date: r.date,                      // 'YYYY-MM-DD' (local day)
            count: parseInt(r.count, 10) || 0, // number
        }));


        let mapData = detailCount

        const { buffer, filename } = await this.writeToExcelPageView(mapData, 'Page View List', 'page_view_list');
        return { buffer, filename };
    }


    // for export data to excel top member with post, comment, reaction tabs
    async exportDataToExcelTopMember(start_date: Date, end_date: Date): Promise<{ buffer: Buffer; filename: string }> {
        // Get top members for each type
        const topPostMembers = await this.cardRevisionService.topMember('post', start_date, end_date);
        const topCommentMembers = await this.cardRevisionService.topMember('comment', start_date, end_date);
        const topReactionMembers = await this.cardRevisionService.topMember('reaction', start_date, end_date);

        const { buffer, filename } = await this.writeToExcelTopMember(topPostMembers, topCommentMembers, topReactionMembers);
        return { buffer, filename };
    }


    // for export data to excel top spaces with post and member tabs
    async exportDataToExcelTopSpaces(start_date: Date, end_date: Date): Promise<{ buffer: Buffer; filename: string }> {
        // Get top spaces for each type
        const topPostSpaces = await this.cardRevisionService.topSpaces('post', start_date, end_date);
        const topMemberSpaces = await this.cardRevisionService.topSpaces('member', start_date, end_date);

        const { buffer, filename } = await this.writeToExcelTopSpaces(topPostSpaces, topMemberSpaces);
        return { buffer, filename };
    }


    // for export data to excel top post with view, comment, reaction tabs
    async exportDataToExcelTopPost(start_date: Date, end_date: Date): Promise<{ buffer: Buffer; filename: string }> {
        // Get top posts for each type
        const topViewPosts = await this.cardRevisionService.topPost('view', start_date, end_date);
        const topCommentPosts = await this.cardRevisionService.topPost('comment', start_date, end_date);
        const topReactionPosts = await this.cardRevisionService.topPost('reaction', start_date, end_date);

        const { buffer, filename } = await this.writeToExcelTopPost(topViewPosts, topCommentPosts, topReactionPosts);
        return { buffer, filename };
    }


    async writeToExcelPageView(data: any, worksheetName: string, filenamePrefix: string): Promise<{ buffer: Buffer; filename: string }> {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(worksheetName);

        // Add header based on DataPost interface
        worksheet.addRow(['date', 'count']);

        for (const post of data) {
            worksheet.addRow([
                post.date,
                post.count

            ]);
        }

        // Generate buffer and filename
        const buffer = await workbook.xlsx.writeBuffer() as Buffer;
        const filename = `${filenamePrefix}_${Date.now()}.xlsx`;

        return { buffer, filename };
    }

    // Write to excel helper method for posts - similar to admin-post service
    async writeToExcelPost(data: any, worksheetName: string, filenamePrefix: string): Promise<{ buffer: Buffer; filename: string }> {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(worksheetName);

        // Add header based on DataPost interface
        worksheet.addRow(['Id', 'Title', 'Author Id', 'Author MMID Id', 'Author Name', 'Space', 'Description', 'Is Hidden', 'Type', 'Reactions', 'Created At', 'Updated At', 'Published At']);

        for (const post of data) {
            worksheet.addRow([
                post.id,
                post.title,
                post.author ? post.author.id : 0,
                post.author ? post.author.userId : 0,
                post.author ? post.author.name : '',
                post.space ? post.space.name : '',
                post.description,
                post.isHidden,
                post.type,
                post.reactionsCount,
                post.created_at,
                post.updated_at,
                post.published_at
            ]);
        }

        // Generate buffer and filename
        const buffer = await workbook.xlsx.writeBuffer() as Buffer;
        const filename = `${filenamePrefix}_${Date.now()}.xlsx`;

        return { buffer, filename };
    }

    // Write to excel helper method for top member with multiple tabs
    async writeToExcelTopMember(postData: any[], commentData: any[], reactionData: any[]): Promise<{ buffer: Buffer; filename: string }> {
        const workbook = new ExcelJS.Workbook();

        // Map data to DataUser interface for each type
        const mapToDataUser = async (data: any[], type: string): Promise<DataUser[]> => {
            const mappedData = await Promise.all(data.map(async (item) => {
                // Get full user data from member repository
                const user = await this.memberRepository.findOne({ where: { id: item.userId } });

                return {
                    id: item.userId,
                    name: user?.name || item.name || '',
                    email: user?.email || item.email || '',
                    createdAt: user?.created_at || new Date(),
                    updatedAt: user?.updated_at || new Date(),
                    username: user?.mmid_fullname || '',
                    status: user?.status || '',
                    siteRole: user ? this.siteRole[user.member_role] : 'Member',
                    vehicleList: [],
                    dob: user?.dob || null,
                    gender: user?.gender || '',
                    mimatePoint: 0,
                    posts: type === 'post' ? parseInt(item.count) : 0,
                    comments: type === 'comment' ? parseInt(item.count) : 0,
                    likes: type === 'reaction' ? parseInt(item.count) : 0,
                    shares: user?.total_shares || 0,
                    quizWinner: 0,
                };
            }));
            return mappedData;
        };

        // Get mapped data for each type
        const postMembers = await mapToDataUser(postData, 'post');
        const commentMembers = await mapToDataUser(commentData, 'comment');
        const reactionMembers = await mapToDataUser(reactionData, 'reaction');

        // Create Post tab
        const postWorksheet = workbook.addWorksheet('Top Post Members');
        postWorksheet.addRow(['Name', 'Email', 'Status', 'Site Role', 'Vehicle List', 'DOB', 'Gender', 'Mimate Point', 'Posts', 'Shares', 'Quiz Winner', 'Created At', 'Updated At']);
        for (const user of postMembers) {
            postWorksheet.addRow([
                user.name,
                user.email,
                user.status,
                user.siteRole,
                user.vehicleList,
                user.dob,
                user.gender,
                user.mimatePoint,
                user.posts,
                user.shares,
                user.quizWinner,
                user.createdAt,
                user.updatedAt
            ]);
        }

        // Create Comment tab
        const commentWorksheet = workbook.addWorksheet('Top Comment Members');
        commentWorksheet.addRow(['Name', 'Email', 'Status', 'Site Role', 'Vehicle List', 'DOB', 'Gender', 'Mimate Point', 'Comments', 'Shares', 'Quiz Winner', 'Created At', 'Updated At']);
        for (const user of commentMembers) {
            commentWorksheet.addRow([
                user.name,
                user.email,
                user.status,
                user.siteRole,
                user.vehicleList,
                user.dob,
                user.gender,
                user.mimatePoint,
                user.comments,
                user.shares,
                user.quizWinner,
                user.createdAt,
                user.updatedAt
            ]);
        }

        // Create Reaction tab
        const reactionWorksheet = workbook.addWorksheet('Top Reaction Members');
        reactionWorksheet.addRow(['Name', 'Email', 'Status', 'Site Role', 'Vehicle List', 'DOB', 'Gender', 'Mimate Point', 'Likes', 'Shares', 'Quiz Winner', 'Created At', 'Updated At']);
        for (const user of reactionMembers) {
            reactionWorksheet.addRow([
                user.name,
                user.email,
                user.status,
                user.siteRole,
                user.vehicleList,
                user.dob,
                user.gender,
                user.mimatePoint,
                user.likes,
                user.shares,
                user.quizWinner,
                user.createdAt,
                user.updatedAt
            ]);
        }

        // Generate buffer and filename
        const buffer = await workbook.xlsx.writeBuffer() as Buffer;
        const filename = `top_member_${Date.now()}.xlsx`;

        return { buffer, filename };
    }

    // Write to excel helper method for top spaces with multiple tabs
    async writeToExcelTopSpaces(postData: any[], memberData: any[]): Promise<{ buffer: Buffer; filename: string }> {
        const workbook = new ExcelJS.Workbook();

        // Create Post tab
        const postWorksheet = workbook.addWorksheet('Top Spaces by Posts');
        postWorksheet.addRow(['ID', 'Space ID', 'Name', 'Description', 'Slug', 'Image', 'Banner', 'Members Count', 'Posts Count', 'Hidden', 'Invite Only', 'Backup Space ID', 'Is Dealer']);
        for (const space of postData) {
            postWorksheet.addRow([
                space.id,
                space.spaceId,
                space.name,
                space.description,
                space.slug,
                space.image,
                space.banner,
                space.membersCount,
                space.postsCount,
                space.hidden,
                space.inviteOnly,
                space.backup_space_id,
                space.is_dealer
            ]);
        }

        // Create Member tab
        const memberWorksheet = workbook.addWorksheet('Top Spaces by Members');
        memberWorksheet.addRow(['ID', 'Space ID', 'Name', 'Description', 'Slug', 'Image', 'Banner', 'Members Count', 'Posts Count', 'Hidden', 'Invite Only', 'Backup Space ID', 'Is Dealer']);
        for (const space of memberData) {
            memberWorksheet.addRow([
                space.id,
                space.spaceId,
                space.name,
                space.description,
                space.slug,
                space.image,
                space.banner,
                space.membersCount,
                space.postsCount,
                space.hidden,
                space.inviteOnly,
                space.backup_space_id,
                space.is_dealer
            ]);
        }

        // Generate buffer and filename
        const buffer = await workbook.xlsx.writeBuffer() as Buffer;
        const filename = `top_spaces_${Date.now()}.xlsx`;

        return { buffer, filename };
    }

    // Write to excel helper method for top post with multiple tabs
    async writeToExcelTopPost(viewData: any[], commentData: any[], reactionData: any[]): Promise<{ buffer: Buffer; filename: string }> {
        const workbook = new ExcelJS.Workbook();

        // Map data to DataPost interface for each type
        const mapToDataPost = async (data: any[], type: string): Promise<DataPost[]> => {
            const mappedData = await Promise.all(data.map(async (item) => {
                // Get full post data from post repository
                const post = await this.postRepository.findOne({
                    where: { id: item.id },
                    relations: ['space', 'member']
                });

                if (!post) return null;

                return {
                    id: post.id,
                    backup_member_id: post.backup_member_id,
                    backup_space_id: post.backup_space_id,
                    title: post.title,
                    description: post.description,
                    image: post.image,
                    status: post.status,
                    type: post.type,
                    reactionsCount: type === 'reaction' ? parseInt(item.count) : 0,
                    totalRepliesCount: type === 'comment' ? parseInt(item.count) : 0,
                    totalViewsCount: type === 'view' ? parseInt(item.count) : 0,
                    created_at: post.created_at,
                    updated_at: post.updated_at,
                    published_at: post.published_at,
                    deleted_at: post.deleted_at,
                    isHidden: post.isHidden,
                    space: post.space
                        ? {
                            id: post.space.id,
                            name: post.space.name,
                            description: post.space.description,
                        }
                        : null,
                    author: post.member
                        ? {
                            id: post.member.id,
                            name: post.member.name,
                            email: post.member.email,
                            profilePictureUrl: post.member.profilePictureUrl,
                            userId: post.member.userId,
                        }
                        : null,
                };
            }));
            return mappedData.filter(item => item !== null);
        };

        // Get mapped data for each type
        const viewPosts = await mapToDataPost(viewData, 'view');
        const commentPosts = await mapToDataPost(commentData, 'comment');
        const reactionPosts = await mapToDataPost(reactionData, 'reaction');

        // Create View tab
        const viewWorksheet = workbook.addWorksheet('Top Posts by Views');
        viewWorksheet.addRow(['ID', 'Title', 'Author Id', 'Author MMID Id', 'Author Name', 'Space', 'Description', 'Is Hidden', 'Type', 'Views', 'Created At', 'Updated At', 'Published At']);
        for (const post of viewPosts) {
            viewWorksheet.addRow([
                post.id,
                post.title,
                post.author ? post.author.id : 0,
                post.author ? post.author.userId : 0,
                post.author ? post.author.name : '',
                post.space ? post.space.name : '',
                post.description,
                post.isHidden,
                post.type,
                post.totalViewsCount, // This will be the view count for view tab
                post.created_at,
                post.updated_at,
                post.published_at
            ]);
        }

        // Create Comment tab
        const commentWorksheet = workbook.addWorksheet('Top Posts by Comments');
        commentWorksheet.addRow(['ID', 'Title', 'Author Id', 'Author MMID Id', 'Author Name', 'Space', 'Description', 'Is Hidden', 'Type', 'Comments', 'Created At', 'Updated At', 'Published At']);
        for (const post of commentPosts) {
            commentWorksheet.addRow([
                post.id,
                post.title,
                post.author ? post.author.id : 0,
                post.author ? post.author.userId : 0,
                post.author ? post.author.name : '',
                post.space ? post.space.name : '',
                post.description,
                post.isHidden,
                post.type,
                post.totalRepliesCount, // This will be the comment count for comment tab
                post.created_at,
                post.updated_at,
                post.published_at
            ]);
        }

        // Create Reaction tab
        const reactionWorksheet = workbook.addWorksheet('Top Posts by Reactions');
        reactionWorksheet.addRow(['ID', 'Title', 'Author Id', 'Author MMID Id', 'Author Name', 'Space', 'Description', 'Is Hidden', 'Type', 'Reactions', 'Created At', 'Updated At', 'Published At']);
        for (const post of reactionPosts) {
            reactionWorksheet.addRow([
                post.id,
                post.title,
                post.author ? post.author.id : 0,
                post.author ? post.author.userId : 0,
                post.author ? post.author.name : '',
                post.space ? post.space.name : '',
                post.description,
                post.isHidden,
                post.type,
                post.reactionsCount, // This will be the reaction count for reaction tab
                post.created_at,
                post.updated_at,
                post.published_at
            ]);
        }

        // Generate buffer and filename
        const buffer = await workbook.xlsx.writeBuffer() as Buffer;
        const filename = `top_post_${Date.now()}.xlsx`;

        return { buffer, filename };
    }

    // for export data to excel online member
    async exportDataToExcelOnlineMember(): Promise<{ buffer: Buffer; filename: string }> {
        // Get online member data
        const { online_members, offline_members } = await this.cardRevisionService.cardOnlineMembers();

        const { buffer, filename } = await this.writeToExcelOnlineMember(online_members, offline_members);
        return { buffer, filename };
    }

    // Write to excel helper method for online member
    async writeToExcelOnlineMember(total_online_member: number, total_member: number): Promise<{ buffer: Buffer; filename: string }> {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Online Member Statistics');

        worksheet.addRow(['Total Online Members', 'Total Members']);
        worksheet.addRow([total_online_member, total_member]);

        const buffer = await workbook.xlsx.writeBuffer() as Buffer;
        const filename = `online_member_statistics_${Date.now()}.xlsx`;

        return { buffer, filename };
    }

    // for export data to excel history by days with daily and monthly tabs
    async exportDataToExcelHistoryByDays(start_date: Date, end_date: Date): Promise<{ buffer: Buffer; filename: string }> {


        const { data: dailyData, ids } = await this.cardRevisionService.historyByDays(start_date, end_date);


        const { buffer, filename } = await this.writeToExcelHistoryByDays(dailyData, ids, end_date);
        return { buffer, filename };

    }

    // Write to excel helper method for history by days with multiple tabs
    async writeToExcelHistoryByDays(
        dailyData: Array<{ date: string | Date; activity: number }>,
        ids: Array<{ userId: number }>,
        endDate: Date
    ): Promise<{ buffer: Buffer; filename: string }> {
        const workbook = new ExcelJS.Workbook();

        // --- Collect & dedupe userIds from input
        const userIds = Array.from(new Set(ids.map(({ userId }) => userId).filter((v) => v != null)));

        // --- Build quick lookup from member.id -> userId (in case naming differs)
        const idToUserId = new Map<number, number>();
        for (const v of userIds) idToUserId.set(v, v);

        const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;

        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const endUtc = end ? new Date(end.getTime() - TZ_OFFSET_MS) : undefined;


        // --- Fetch users
        const queryUsers = userIds.length
            ? await this.memberRepository
                .createQueryBuilder('bm')
                .select([
                    'bm.id AS id',
                    'bm.email AS email',
                    'bm.mmid_fullname AS fullname',
                    'bm.userId AS userId',
                    'bm.activated_at AS activatedAt',
                ])
                .addSelect(subQuery => {
                    return subQuery
                        .select('al.createdAt')
                        .from('activity_logs', 'al')
                        .where('al.userId = bm.id')
                        .andWhere("al.action = 'login'")
                        .andWhere("al.createdAt < :endDate", { endDate: endUtc })
                        .orderBy('al.createdAt', 'DESC')
                        .limit(1);
                }, 'lastAccess')
                .where('bm.id IN (:...userIds)', { userIds: userIds })
                .getRawMany()
            : [];

        // ============== Sheet 1: Daily History ==============
        const dailyWorksheet = workbook.addWorksheet('Daily History');
        dailyWorksheet.views = [{ state: 'frozen', ySplit: 1 }];
        dailyWorksheet.addRow(['Date', 'Activity Count']);
        for (const item of dailyData) {
            dailyWorksheet.addRow([item.date, item.activity]);
        }

        // Optional: widths
        dailyWorksheet.getColumn(1).width = 20;
        dailyWorksheet.getColumn(2).width = 18;
        dailyWorksheet.getRow(1).font = { bold: true };

        // ============== Sheet 2: Users ==============
        const usersWorksheet = workbook.addWorksheet('Users');
        usersWorksheet.views = [{ state: 'frozen', ySplit: 1 }];
        usersWorksheet.addRow(['ID', 'Email', 'Full Name', 'userId', 'Activated At', 'Last Access']);


        let covertInUtc8 = (d: Date | null) => (d ? new Date(new Date(d).getTime() + TZ_OFFSET_MS) : null);

        for (const u of queryUsers) {
            usersWorksheet.addRow([
                u.id,
                u.email ?? '',
                u.fullname ?? '', // adjust if your entity uses a different property name
                u.userId,
                u.activatedAt ? covertInUtc8(new Date(u.activatedAt)) : null, // keep as Date so Excel formats it
                u.lastAccess ? covertInUtc8(new Date(u.lastAccess)) : null,
            ]);
        }

        // Optional: widths + date format
        usersWorksheet.getColumn(1).width = 12;
        usersWorksheet.getColumn(2).width = 28;
        usersWorksheet.getColumn(3).width = 24;
        usersWorksheet.getColumn(4).width = 12;
        usersWorksheet.getColumn(5).width = 22;
        usersWorksheet.getRow(1).font = { bold: true };
        usersWorksheet.getColumn(5).numFmt = 'yyyy-mm-dd hh:mm:ss';
        usersWorksheet.getColumn(6).numFmt = 'yyyy-mm-dd hh:mm:ss';

        // --- Generate buffer and filename
        const buffer = (await workbook.xlsx.writeBuffer()) as Buffer;
        const filename = `history_by_days_${Date.now()}.xlsx`;

        return { buffer, filename };
    }
}