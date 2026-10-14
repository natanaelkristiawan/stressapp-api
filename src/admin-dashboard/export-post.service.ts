import { Injectable } from "@nestjs/common";
import { PostEntity } from "src/entity/post.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, IsNull, Not, Repository } from "typeorm";
import { CommentEntity } from "src/entity/comment.entity";
import { ReactionEntity } from "src/entity/reaction.entity";
import * as ExcelJS from 'exceljs';


interface DataPost {
    id: number;
    title: string;
    userId: number;
    userMmid:number
    name: string;
    email: string;
    mmid_fullname: string;
    totalRepliesCount: number;
    reactionsCount: number;
    sharesCount: number;
    published_at: Date;
}

interface DataReply {

    id: number;
    comment: string;
    userId: number;
    userMmid:number
    name: string;
    email: string;
    mmid_fullname: string;
    postId: number;
    postTitle: string;
    created_at: Date;
}

interface DataReaction {

    id: number;
    reaction: string;
    userId: number;
    userMmid:number
    name: string;
    email: string;
    mmid_fullname: string;
    postId: number;
    postTitle: string;
    created_at: Date;
}

@Injectable()   
export class ExportPostService {

    protected  dateStart: Date;
    protected  dateEnd: Date;

    protected  dateStartBefore: Date;
    protected  dateEndBefore: Date;

    constructor(
        @InjectRepository(PostEntity, 'mimate')
        private readonly postRepository: Repository<PostEntity>,

        @InjectRepository(CommentEntity, 'mimate')
        private readonly commentRepository: Repository<CommentEntity>,

        @InjectRepository(ReactionEntity, 'mimate')
        private readonly reactionRepository: Repository<ReactionEntity>,
    ) {}

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

    async exportNewPosts(start_date: Date, end_date: Date) {
        // Build LOCAL (UTC+8) bounds
        this.dateStart = new Date(start_date);
        this.dateStart.setHours(0, 0, 0, 0);
      
        this.dateEnd = new Date(end_date);
        this.dateEnd.setHours(23, 59, 59, 999);
      
        // Convert those LOCAL bounds to UTC for querying
        const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;
        const startUtc = new Date(this.dateStart.getTime() - TZ_OFFSET_MS);
        const endUtc   = new Date(this.dateEnd.getTime()   - TZ_OFFSET_MS);
      
        const detail = await this.postRepository.find({
          where: {
            published_at: Between(startUtc, endUtc),     // <-- use UTC bounds
            member: { id: Not(IsNull()) },
          },
          select: {
            id: true,
            title: true,
            member: {
              id: true,
              name: true,
              email: true,
              mmid_fullname: true,
              userId: true,
            },
            totalRepliesCount: true,
            reactionsCount: true,
            sharesCount: true,
            published_at: true,
          },
          relations: ['member'],
          order: { published_at: 'ASC' },
        });
      
        // Map to export shape. If you want the export in LOCAL time, convert below.
        const mapData: DataPost[] = detail.map((post) => {
          // Optional: convert to UTC+8 for export display
          const localPublishedAt = new Date(post.published_at.getTime() + TZ_OFFSET_MS);
      
          return {
            id: post.id,
            title: post.title,
            userId: post.member?.id,
            userMmid: post.member?.userId,
            name: post.member?.name,
            email: post.member?.email,
            mmid_fullname: post.member?.mmid_fullname,
            totalRepliesCount: post.totalRepliesCount,
            reactionsCount: post.reactionsCount,
            sharesCount: post.sharesCount,
            published_at: localPublishedAt, // <- uncomment to export LOCAL (UTC+8)
            // published_at: post.published_at,  // <- keep UTC as-is if you prefer
          };
        });
      
        const { buffer, filename } = await this.writeToExcelNewPost(
          mapData,
          'New Post List',
          'new_post_list'
        );
        return { buffer, filename };
      }
      


    async writeToExcelNewPost(data: any, worksheetName: string, filenamePrefix: string): Promise<{ buffer: Buffer; filename: string }> {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(worksheetName);
        
        // Add headers
        worksheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Title', key: 'title', width: 50 },
            { header: 'User ID', key: 'userId', width: 10 },
            { header: 'User MMID', key: 'userMmid', width: 10 },
            { header: 'Name', key: 'name', width: 30 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'MMID Fullname', key: 'mmid_fullname', width: 30 },
            { header: 'Total Replies Count', key: 'totalRepliesCount', width: 20 },
            { header: 'Reactions Count', key: 'reactionsCount', width: 20 },
            { header: 'Shares Count', key: 'sharesCount', width: 20 },
            { header: 'Published At', key: 'published_at', width: 20 }
        ];  

        // Add data
        worksheet.addRows(data);

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer() as Buffer;
        const filename = `${filenamePrefix}_${Date.now()}.xlsx`;
        
        return { buffer, filename };
    }



    // new replies
    async exportNewReplies(start_date: Date, end_date: Date) {
        // Build LOCAL (UTC+8) bounds
        this.dateStart = new Date(start_date);
        this.dateStart.setHours(0, 0, 0, 0);
      
        this.dateEnd = new Date(end_date);
        this.dateEnd.setHours(23, 59, 59, 999);
      
        // Convert LOCAL bounds → UTC for querying
        const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;
        const startUtc = new Date(this.dateStart.getTime() - TZ_OFFSET_MS);
        const endUtc   = new Date(this.dateEnd.getTime()   - TZ_OFFSET_MS);
      
        const detail = await this.commentRepository.find({
          where: {
            created_at: Between(startUtc, endUtc), // <-- use UTC bounds
            member: { id: Not(IsNull()) },
          },
          relations: ['member', 'post'],
          select: {
            id: true,
            description: true,
            member: {
              id: true,
              name: true,
              email: true,
              mmid_fullname: true,
              userId: true,
            },
            post: {
              id: true,
              title: true,
            },
            created_at: true,
          },
          order: { created_at: 'ASC' },
        });
      
        // Map to export shape. If you want LOCAL time in the spreadsheet, convert below.
        const mapData: DataReply[] = detail.map((reply) => {
          // Optional: convert to UTC+8 for export display
          const createdAtLocal = new Date(reply.created_at.getTime() + TZ_OFFSET_MS);
      
          return {
            id: reply.id,
            comment: reply.description,
            userId: reply.member?.id,
            userMmid: reply.member?.userId,
            name: reply.member?.name,
            email: reply.member?.email,
            mmid_fullname: reply.member?.mmid_fullname,
            postId: reply.post?.id,
            postTitle: reply.post?.title,
            created_at: createdAtLocal, // <- uncomment to export LOCAL (UTC+8)
            // created_at: reply.created_at,  // <- keep UTC as-is if you prefer
          };
        });
      
        const { buffer, filename } = await this.writeToExcelNewReply(
          mapData,
          'New Reply List',
          'new_reply_list'
        );
        return { buffer, filename };
      }
      


    async writeToExcelNewReply(data: any, worksheetName: string, filenamePrefix: string): Promise<{ buffer: Buffer; filename: string }> {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(worksheetName);
        
        // Add headers
        worksheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Comment', key: 'comment', width: 50 },
            { header: 'User ID', key: 'userId', width: 10 },
            { header: 'User MMID', key: 'userMmid', width: 10 },
            { header: 'Name', key: 'name', width: 30 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'MMID Fullname', key: 'mmid_fullname', width: 30 },
            { header: 'Post ID', key: 'postId', width: 10 },
            { header: 'Post Title', key: 'postTitle', width: 50 },
            { header: 'Created At', key: 'created_at', width: 20 }
        ];

        // Add data
        worksheet.addRows(data);

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer() as Buffer;
        const filename = `${filenamePrefix}_${Date.now()}.xlsx`;
        
        return { buffer, filename };
    }


    // new reactions
    async exportNewReactions(start_date: Date, end_date: Date) {
        // Build LOCAL (UTC+8) bounds
        this.dateStart = new Date(start_date);
        this.dateStart.setHours(0, 0, 0, 0);
    
        this.dateEnd = new Date(end_date);
        this.dateEnd.setHours(23, 59, 59, 999);
    
        // Convert LOCAL bounds → UTC for querying
        const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;
        const startUtc = new Date(this.dateStart.getTime() - TZ_OFFSET_MS);
        const endUtc   = new Date(this.dateEnd.getTime()   - TZ_OFFSET_MS);
    
        const detail = await this.reactionRepository.find({
        where: {
            created_at: Between(startUtc, endUtc), // use UTC bounds
            member: { id: Not(IsNull()) },
        },
        relations: ['member', 'post'],
        select: {
            id: true,
            reaction: true,
            member: {
            id: true,
            name: true,
            email: true,
            mmid_fullname: true,
            userId: true,
            },
            post: {
            id: true,
            title: true,
            },
            created_at: true,
        },
        order: { created_at: 'ASC' },
        });
    
        // Map to export shape. If you want LOCAL time in the spreadsheet, convert below.
        const mapData: DataReaction[] = detail.map((reaction) => {
        // Optional: convert to UTC+8 for export display
        const createdAtLocal = new Date(reaction.created_at.getTime() + TZ_OFFSET_MS);
    
        return {
            id: reaction.id,
            reaction: reaction.reaction,
            userId: reaction.member?.id,
            userMmid: reaction.member?.userId,
            name: reaction.member?.name,
            email: reaction.member?.email,
            mmid_fullname: reaction.member?.mmid_fullname,
            postId: reaction.post?.id,
            postTitle: reaction.post?.title,
            created_at: createdAtLocal, // ← show LOCAL (UTC+8) in export
            // created_at: reaction.created_at,  // ← keep UTC as-is if preferred
        };
        });
    
        const { buffer, filename } = await this.writeToExcelNewReaction(
        mapData,
        'New Reaction List',
        'new_reaction_list'
        );
        return { buffer, filename };
    }
  


    async writeToExcelNewReaction(data: any, worksheetName: string, filenamePrefix: string): Promise<{ buffer: Buffer; filename: string }> {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(worksheetName);
        
        // Add headers
        worksheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Reaction', key: 'reaction', width: 50 },
            { header: 'User ID', key: 'userId', width: 10 },
            { header: 'User MMID', key: 'userMmid', width: 10 },
            { header: 'Name', key: 'name', width: 30 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'MMID Fullname', key: 'mmid_fullname', width: 30 },
            { header: 'Post ID', key: 'postId', width: 10 },
            { header: 'Post Title', key: 'postTitle', width: 50 },
            { header: 'Created At', key: 'created_at', width: 20 }
        ];  

        // Add data
        worksheet.addRows(data);

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer() as Buffer;
        const filename = `${filenamePrefix}_${Date.now()}.xlsx`;
        
        return { buffer, filename };
    }
}