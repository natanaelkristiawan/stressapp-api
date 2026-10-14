import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { Activity } from 'src/entity/activity.entity';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { SpaceEntity } from 'src/entity/space.entity';
import { PostEntity } from 'src/entity/post.entity';
import * as ExcelJS from 'exceljs';
import { DataUser } from '../admin-user/interfaces/datatable.interface';
import { DataPost } from '../admin-post/interfaces/datatable.interface';
import { topMember } from './interfaces/admin-dashboard.interface';



@Injectable()
export class AdminDashboardService {

    protected readonly siteRole = {
        "0": "Member",
        "1": "Admin",
    }

    private start_date_before: Date;
    private end_date_before: Date;

    private start_date: Date;
    private end_date: Date;


    private getMemberName(name:string, mmid_fullname:string,  id:number): string {

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


    constructor(
        // repository
        @InjectRepository(Activity, 'mimate')
        private readonly activityRepository: Repository<Activity>,

        // member repository
        @InjectRepository(UserMimateEntity, 'mimate')
        private readonly memberRepository: Repository<UserMimateEntity>,


        // space repository
        @InjectRepository(SpaceEntity, 'mimate')
        private readonly spaceRepository: Repository<SpaceEntity>,


        // post repository
        @InjectRepository(PostEntity, 'mimate')
        private readonly postRepository: Repository<PostEntity>,
    ){

    }


    // for export data to excel new member base on start_date and end_date
    async exportDataToExcelNewMember(start_date: Date, end_date: Date): Promise<{ buffer: Buffer; filename: string }> {
        // Get new members created between start_date and end_date
        const query = this.memberRepository.createQueryBuilder('user');
        
        // Add time to dates for proper filtering
        const startDate = new Date(start_date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(end_date);
        endDate.setHours(23, 59, 59, 999);
        
        query.where('user.created_at BETWEEN :start_date AND :end_date', { 
            start_date: startDate, 
            end_date: endDate 
        });

        const data = await query.getMany();

        // Map data to DataUser interface
        let mapData: DataUser[] = data.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
            username: user.mmid_fullname,
            status: user.status,
            siteRole: this.siteRole[user.member_role],
            vehicleList: [],
            dob: user.dob,
            gender: user.gender,
            mimatePoint: 0,
            posts: user.total_posts,
            comments: user.total_comments,
            likes: user.total_likes,
            shares: user.total_shares,
            quizWinner: 0,
            last_seen_at: user.last_seen_at
        }));   

        const { buffer, filename } = await this.writeToExcel(mapData, 'New Member List', 'new_member_list');
        return { buffer, filename };
    }

    // for export data to excel active member base on start_date and end_date
    async exportDataToExcelActiveMember(start_date: Date, end_date: Date): Promise<{ buffer: Buffer; filename: string }> {
        // Get active members with last_seen_at between start_date and end_date
        const query = this.memberRepository.createQueryBuilder('user');
        
        // Add time to dates for proper filtering
        const startDate = new Date(start_date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(end_date);
        endDate.setHours(23, 59, 59, 999);
        
        query.where('user.last_seen_at BETWEEN :start_date AND :end_date', { 
            start_date: startDate, 
            end_date: endDate 
        });

        const data = await query.getMany();

        // Map data to DataUser interface
        let mapData: DataUser[] = data.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
            username: user.mmid_fullname,
            status: user.status,
            siteRole: this.siteRole[user.member_role],
            vehicleList: [],
            dob: user.dob,
            gender: user.gender,
            mimatePoint: 0,
            posts: user.total_posts,
            comments: user.total_comments,
            likes: user.total_likes,
            shares: user.total_shares,
            quizWinner:  0,
            last_seen_at: user.last_seen_at
        }));   

        const { buffer, filename } = await this.writeToExcel(mapData, 'Active Member List', 'active_member_list');
        return { buffer, filename };
    }

    // Write to excel helper method - single function for all exports
    async writeToExcel(data: any, worksheetName: string, filenamePrefix: string): Promise<{ buffer: Buffer; filename: string }> {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(worksheetName);

        // Add header based on DataUser interface
        worksheet.addRow(['Name', 'Email', 'Status', 'Site Role', 'Vehicle List', 'DOB', 'Gender', 'Mimate Point', 'Posts', 'Comments', 'Likes', 'Shares', 'Quiz Winner', 'Created At', 'Updated At', 'Last Seen At']);

        for (const user of data) {
            worksheet.addRow([
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
    async exportDataToExcelPageView(start_date: Date, end_date: Date): Promise<{ buffer: Buffer; filename: string }> {
        // Get posts that were viewed between start_date and end_date
        const query = this.postRepository
            .createQueryBuilder('post')
            .leftJoinAndMapOne('post.space', SpaceEntity, 'space', 'space.id = post.backup_space_id')
            .leftJoinAndMapOne('post.member', UserMimateEntity, 'member', 'member.id = post.backup_member_id')
            .leftJoin(Activity, 'activity', 'activity.postId = post.id')
            .where('activity.targetType = :targetType', { targetType: 'post' })
            .andWhere('activity.action = :action', { action: 'view' })
            .andWhere('activity.createdAt BETWEEN :start_date AND :end_date', {
                start_date: start_date,
                end_date: end_date,
            })
            .groupBy('post.id')
            .addSelect('COUNT(activity.id)', 'viewCount');

        const data = await query.getMany();

        // Map data to DataPost interface
        let mapData: DataPost[] = data.map(post => ({
            id: post.id,
            backup_member_id: post.backup_member_id,
            backup_space_id: post.backup_space_id,
            title: post.title,
            description: post.description,
            image: post.image,
            status: post.status,
            type: post.type,
            reactionsCount: post.reactionsCount,
            totalRepliesCount: post.totalRepliesCount,
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
        }));   

        const { buffer, filename } = await this.writeToExcelPost(mapData, 'Page View List', 'page_view_list');
        return { buffer, filename };
    }

    // for export data to excel history by days with daily and monthly tabs
    async exportDataToExcelHistoryByDays(start_date: Date, end_date: Date): Promise<{ buffer: Buffer; filename: string }> {
        return null       // // // Get daily data
        // const dailyData = await this.historyByDays('daily', start_date, end_date);
        
        // // // Get monthly data
        // // const monthlyData = await this.historyByDays('monthly');

        // const { buffer, filename } = await this.writeToExcelHistoryByDays(dailyData);
        // return { buffer, filename };

    }

    // for export data to excel top member with post, comment, reaction tabs
    async exportDataToExcelTopMember(start_date: Date, end_date: Date): Promise<{ buffer: Buffer; filename: string }> {
        // Get top members for each type
        const topPostMembers = await this.topMember('post', start_date, end_date);
        const topCommentMembers = await this.topMember('comment', start_date, end_date);
        const topReactionMembers = await this.topMember('reaction', start_date, end_date);

        const { buffer, filename } = await this.writeToExcelTopMember(topPostMembers, topCommentMembers, topReactionMembers);
        return { buffer, filename };
    }

    // for export data to excel top spaces with post and member tabs
    async exportDataToExcelTopSpaces(start_date: Date, end_date: Date): Promise<{ buffer: Buffer; filename: string }> {
        // Get top spaces for each type
        const topPostSpaces = await this.topSpaces('post', start_date, end_date);
        const topMemberSpaces = await this.topSpaces('member', start_date, end_date);

        const { buffer, filename } = await this.writeToExcelTopSpaces(topPostSpaces, topMemberSpaces);
        return { buffer, filename };
    }

    // for export data to excel top post with view, comment, reaction tabs
    async exportDataToExcelTopPost(start_date: Date, end_date: Date): Promise<{ buffer: Buffer; filename: string }> {
        // Get top posts for each type
        const topViewPosts = await this.topPost('view', start_date, end_date);
        const topCommentPosts = await this.topPost('comment', start_date, end_date);
        const topReactionPosts = await this.topPost('reaction', start_date, end_date);

        const { buffer, filename } = await this.writeToExcelTopPost(topViewPosts, topCommentPosts, topReactionPosts);
        return { buffer, filename };
    }

    // for export data to excel online member
    async exportDataToExcelOnlineMember(): Promise<{ buffer: Buffer; filename: string }> {
        // Get online member data
        const { total_online_member, total_member } = await this.onlineMember();

        const { buffer, filename } = await this.writeToExcelOnlineMember(total_online_member, total_member);
        return { buffer, filename };
    }

    // Write to excel helper method for history by days with multiple tabs
    async writeToExcelHistoryByDays(dailyData: any[]): Promise<{ buffer: Buffer; filename: string }> {
        const workbook = new ExcelJS.Workbook();
        
        // Create Daily tab
        const dailyWorksheet = workbook.addWorksheet('Daily History');
        dailyWorksheet.addRow(['Date', 'Activity Count']);
        for (const item of dailyData) {
            dailyWorksheet.addRow([item.date, item.activity]);
        }

        // Generate buffer and filename
        const buffer = await workbook.xlsx.writeBuffer() as Buffer;
        const filename = `history_by_days_${Date.now()}.xlsx`;
        
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
                    where: { id: item.postId },
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
                    reactionsCount: type === 'reaction' ? parseInt(item.count) : post.reactionsCount,
                    totalRepliesCount: type === 'comment' ? parseInt(item.count) : post.totalRepliesCount,
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
                post.reactionsCount, // This will be the view count for view tab
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

    async getActivity(start_date: Date, end_date: Date){

       
        this.start_date = new Date(start_date);
        this.start_date.setHours(0, 0, 0, 0); // Set time to 00:00:00
        
        this.end_date = new Date(end_date);
        this.end_date.setHours(23, 59, 59, 999); // Set time to 23:59:59.999
        
        const range_day = this.getRangeDay() + 1;
        
        this.start_date_before = new Date(this.start_date.getTime() - (range_day * 24 * 60 * 60 * 1000));
        this.start_date_before.setHours(0, 0, 0, 0);
        
        this.end_date_before = new Date(this.end_date.getTime() - (range_day * 24 * 60 * 60 * 1000));
        this.end_date_before.setHours(23, 59, 59, 999);



        // get count member who created between start_date and end_date
        const {total_member: total_new_member, percentage: percentage_new_member} = await this.getNewMember();


        // response new member
        let query_new_member = {
            text: 'New Member',
            total: total_new_member,
            percentage: percentage_new_member
        }

        // get count member who active between start_date and end_date
        const {total_member: total_active_member, percentage: percentage_active_member} = await this.getActiveMember();

        // response active member
        let query_active_member = {
            text: 'Active Member',
            total: total_active_member,
            percentage: percentage_active_member
        }

        // get page view
        const {total_page_view, percentage: percentage_page_view} = await this.pageView();

        // response page view
        let query_page_view = {
            text: 'Page View',
            total: total_page_view,
            percentage: percentage_page_view
        }   

        // online member
        const {total_online_member, total_member} = await this.onlineMember();
        let query_online_member = {
            text: 'Online Member',
            active: total_online_member,
            total: total_member
        }

        // new activity
        const {post_activity, comment_activity, reaction_activity} = await this.newActivity();
        let query_new_activity = {
            text: 'New Activity',
            post: post_activity,
            comment: comment_activity,
            reaction: reaction_activity
        }

        return {
            new_member: query_new_member, active_member: query_active_member, page_view: query_page_view, online_member: query_online_member, new_activity: query_new_activity  
        }
    }
    
    private getRangeDay() {
        const range_day = this.end_date.getTime() - this.start_date.getTime();
        return Math.ceil(range_day / (24 * 60 * 60 * 1000));
    }


    async getNewMember(){
        // get count member who created between start_date and end_date
        const count_1 = await this.memberRepository.count({
            where: {
                created_at: Between(this.start_date, this.end_date)
            }
        })

        const count_2 = await this.memberRepository.count({
            where: {
                created_at: Between(this.start_date_before, this.end_date_before)
            }
        })

        let percentage:number

        if(count_2 > 0) {
            percentage = Math.ceil((count_1 - count_2) / count_2 * 100);
        } else {
            percentage = 100;
        }

        // get percentage 2 dgit ceil 
        return {total_member: count_1, percentage};
    }


    async getActiveMember(){
        // get member last_seen between start_date and end_date
        const count_1 = await this.memberRepository.count({
            where: {
                last_seen_at: Between(this.start_date, this.end_date)
            }
        })

        const count_2 = await this.memberRepository.count({
            where: {
                last_seen_at: Between(this.start_date_before, this.end_date_before)
            }
        })

        let percentage:number

        if(count_2 > 0) {
            percentage = Math.ceil((count_1 - count_2) / count_2 * 100);
        } else {
            percentage = 100;
        }

        return {total_member: count_1, percentage};
    }


    async pageView(){
        // get activity type login
        const result_1 = await this.activityRepository
        .createQueryBuilder('activity')
        .select('activity.userId', 'userId')
        .addSelect('COUNT(*)', 'count')
        .where('activity.targetType = :targetType', { targetType: 'login' })
        .andWhere('activity.createdAt BETWEEN :start AND :end', {
          start: this.start_date,
          end: this.end_date,
        })
        .groupBy('activity.userId')
        .getRawMany();

        const result_2 = await this.activityRepository
        .createQueryBuilder('activity')
        .select('activity.userId', 'userId')
        .addSelect('COUNT(*)', 'count')
        .where('activity.targetType = :targetType', { targetType: 'login' })
        .andWhere('activity.createdAt BETWEEN :start AND :end', {
          start: this.start_date_before,    
          end: this.end_date_before,
        })
        .groupBy('activity.userId')
        .getRawMany();

        // get count from result
        const count_1 = result_1.length
        const count_2 = result_2.length
        let percentage:number

        if(count_2 > 0) {
            percentage = Math.ceil((count_1 - count_2) / count_2 * 100);
        } else {
            percentage = 100;
        }
        return {total_page_view: count_1, percentage}
    }

    async onlineMember(){


        const result =  await this.activityRepository
            .createQueryBuilder('activity')
            .select('activity.userId', 'userId')
            .addSelect('COUNT(*)', 'loginCount')
            .where('activity.createdAt BETWEEN :start AND :end', {
            start: this.start_date,
            end: this.end_date,
            })
            .andWhere('activity.targetType = :targetType', { targetType: 'login' })
            .groupBy('activity.userId')
            .getRawMany();
     

        // get all member
        const all_member = await this.memberRepository.count()

        return {total_online_member: result.length, total_member: all_member}
        
    }


    async newActivity(){
        // get activity type login
        const get_post_activity = await this.activityRepository.find({
            where: {
                // target in post, comment, reaction
                targetType: In(['post', 'comment', 'reaction']),
                createdAt: Between(this.start_date, this.end_date)
            }
        })

        let post_activity = []
        let comment_activity = []
        let reaction_activity = []

        // collect group by activity    
        for (let index = 0; index < get_post_activity.length; index++) {
            const element = get_post_activity[index];

            if(element.targetType === 'post') {
                post_activity.push(element)
            } else if(element.targetType === 'comment') {
                comment_activity.push(element)
            } else if(element.targetType === 'reaction') {
                reaction_activity.push(element)
            }
            
        }

        // get count post activity
        const count_post_activity = post_activity.length
        const count_comment_activity = comment_activity.length
        const count_reaction_activity = reaction_activity.length

        return {
            post_activity: count_post_activity,
            comment_activity: count_comment_activity,
            reaction_activity: count_reaction_activity
        }
        
    }


    async activityByAdmin(){
        
        return {
            post_activity: 0,
            comment_activity: 0,
            reaction_activity: 0
        }
    }


    // get history by days
    async historyByDays(type: string, start_date: Date, end_date: Date){

        // date end + 1 day
        const date_end_plus_1 = new Date(end_date.getTime() + 24 * 60 * 60 * 1000);
      
        const result = await this.activityRepository
        .createQueryBuilder('activity')
        .select("DATE(activity.createdAt)", "date")
        .addSelect("COUNT(DISTINCT activity.userId)", "activity")
        .where("activity.createdAt BETWEEN :start AND :end", { start: start_date, end: date_end_plus_1 })
        .groupBy("DATE(activity.createdAt)")
        .orderBy("date", "ASC")
        .getRawMany();

        return result
    }



  
    // get top member
    async topMember(type: 'post' | 'comment' | 'reaction', start_date?: Date, end_date?: Date) : Promise<topMember[]>{

        const date_now = new Date()

        // get date 30 days before date now
        let date_start = new Date(date_now.getTime() - 30 * 24 * 60 * 60 * 1000)
        let date_end = new Date(date_now.getTime())

        if(start_date && end_date) {
            date_start = start_date
            date_end = end_date
        }
        
        //    type in post, comment, reaction join with user
        const query = await this.activityRepository
            .createQueryBuilder('activity')
            .select('activity.userId', 'userId')
            .addSelect('user.name', 'name')
            .addSelect('user.email', 'email')
            .addSelect('user.profilePictureUrl', 'profilePicture')
            .addSelect('COUNT(*)', 'count')
            .where('activity.targetType = :targetType', { targetType: type })
            .andWhere('activity.createdAt BETWEEN :start AND :end', {
                start: date_start,
                end: date_end,
            })
            // order by count desc
            .orderBy('count', 'DESC')
            // limit 10
            .limit(10)
            // join with user_mimate    
            .leftJoin(UserMimateEntity, 'user', 'user.id = activity.userId')
            .groupBy('activity.userId')
            .getRawMany();
        
        // map to topMember
        const top_member = query.map((item) => {
            return {
                userId: item.userId,
                name: this.getMemberName(item.name, item.mmid_fullname, item.userId),
                email: item.email,
                profilePicture: item.profilePicture,
                count: item.count
            }
        })
        
        

        return top_member

    }


    // get top spaces
    async topSpaces(type: 'post' | 'member', start_date?: Date, end_date?: Date){

        const date_now = new Date()

        // get date 30 days before date now
        let date_start = new Date(date_now.getTime() - 30 * 24 * 60 * 60 * 1000)
        let date_end = new Date(date_now.getTime())

        if(start_date && end_date) {
            date_start = start_date
            date_end = end_date
        }

        // get all activity
        const query = await this.activityRepository.find({
            where: {
                createdAt: Between(date_start, date_end),
                targetType: 'post'
            },
            relations: ['post.space']
        })

        // get all space home
        const space_home = await this.spaceRepository.find({
            where: {
                backup_space_id : 15
            }
        })

         interface spaces {
            id: number,
            name: string,
            image: string,
            count: number
        }

        interface keySpace {
            [key: number]: spaces
        }
        // loop space home to create result
        const result: keySpace = {}

        for (let index = 0; index < space_home.length; index++) {
            const element = space_home[index];

            // get count post by space
            result[element.id] = {
                id: element.id,
                name: element.name,
                image: element.image,
                count: 0
            }
        }   

        // loop query to count post by space
        for (let index = 0; index < query.length; index++) {
            const element = query[index];

            if (element.post == null || element.post.space == null) {
                continue;
            }

            if(result[element.post.space.id] == undefined) {
                continue;
            }

            result[element.post.space.id].count++
        }

        // sort result by count desc
        const result_sort = Object.values(result).sort((a, b) => b.count - a.count)

        return result_sort
    }

    // top post by view, comment, reaction
    async topPost(type: 'view' | 'comment' | 'reaction', start_date?: Date, end_date?: Date){
        const date_now = new Date()

        // get date 30 days before date now
        let date_start = new Date(date_now.getTime() - 30 * 24 * 60 * 60 * 1000)
        let date_end = new Date(date_now.getTime())

        if(start_date && end_date) {
            date_start = start_date
            date_end = end_date
        }

        let target_type = ''
        let action = ''


        if(type === 'view') {
            target_type = 'post'
            action= 'view'
        }

        if(type === 'comment') {
            target_type = 'comment'
            action= 'create'
        }
        

        if(type === 'reaction') {
            target_type = 'reaction'
            action= 'create'
        }
        
        
        
        
        //    type in post, comment, reaction join with user
        const query = await this.activityRepository
            .createQueryBuilder('activity')
            .select('activity.postId', 'postId')
            .addSelect('COUNT(*)', 'count')
            .where('activity.targetType = :targetType', { targetType: target_type })
            .andWhere('activity.action = :action', { action: action })
            .andWhere('activity.createdAt BETWEEN :start AND :end', {
                start: date_start,
                end: date_end,
            })
            // limit 10
            .orderBy('count', 'DESC')
            .limit(10)
            // join with post
            .leftJoin(PostEntity, 'post', 'post.id = activity.postId')
            .addSelect('post.title', 'title')
            .groupBy('activity.postId')
            .getRawMany();

        return query
    }


    // unique visit daily
    async uniqueVisitDaily(start_date?: Date, end_date?: Date){
        const date_now = new Date()

        // get date 30 days before date now
        let date_start = new Date(date_now.getTime() - 30 * 24 * 60 * 60 * 1000)
        let date_end = new Date(date_now.getTime())

        if(start_date && end_date) {
            date_start = start_date
            date_end = end_date
        }
        
        
    }
}
