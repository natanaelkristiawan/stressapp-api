import { Injectable } from '@nestjs/common';
import { PostEntity } from 'src/entity/post.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, Not, Repository } from 'typeorm';
import { CommentEntity } from 'src/entity/comment.entity';
import { ReactionEntity } from 'src/entity/reaction.entity';
import * as ExcelJS from 'exceljs';

interface DataPost {
  id: number;
  title: string;
  userId: number;
  name: string;
  email: string;
  username: string;
  totalRepliesCount: number;
  reactionsCount: number;
  sharesCount: number;
  published_at: Date;
}

interface DataReply {
  id: number;
  comment: string;
  userId: number;
  name: string;
  email: string;
  username: string;
  postId: number;
  postTitle: string;
  created_at: Date;
}

interface DataReaction {
  id: number;
  reaction: string;
  userId: number;
  name: string;
  email: string;
  username: string;
  postId: number;
  postTitle: string;
  created_at: Date;
}

@Injectable()
export class ExportPostService {
  protected dateStart: Date;
  protected dateEnd: Date;

  protected dateStartBefore: Date;
  protected dateEndBefore: Date;

  constructor(
    @InjectRepository(PostEntity, 'mimate')
    private readonly postRepository: Repository<PostEntity>,

    @InjectRepository(CommentEntity, 'mimate')
    private readonly commentRepository: Repository<CommentEntity>,

    @InjectRepository(ReactionEntity, 'mimate')
    private readonly reactionRepository: Repository<ReactionEntity>,
  ) {}

  /** Returns the current display name, username, or stable internal member label. */
  private getMemberName(name: string, username: string, id: number): string {
    return name?.trim() || username?.trim() || `Member ${id}`;
  }

  async exportNewPosts(start_date: Date, end_date: Date) {
    // Build UTC bounds
    this.dateStart = new Date(start_date);
    this.dateStart.setUTCHours(0, 0, 0, 0);

    this.dateEnd = new Date(end_date);
    this.dateEnd.setUTCHours(23, 59, 59, 999);

    // Convert those UTC bounds to UTC for querying

    const startUtc = new Date(this.dateStart.getTime());
    const endUtc = new Date(this.dateEnd.getTime());

    const detail = await this.postRepository.find({
      where: {
        isPsychoeducation: false,
        isHidden: false,
        published_at: Between(startUtc, endUtc), // UTC publication date
        member: {
          id: Not(IsNull()),
          memberAuthEnabled: true,
          userAdmin: { id: IsNull() },
        },
      },
      select: {
        id: true,
        title: true,
        member: {
          id: true,
          name: true,
          email: true,
          username: true,
        },
        totalRepliesCount: true,
        reactionsCount: true,
        sharesCount: true,
        published_at: true,
      },
      relations: ['member'],
      order: { published_at: 'ASC' },
    });

    // Map to export shape. If you want the export in UTC time, convert below.
    const mapData: DataPost[] = detail.map((post) => {
      // Optional: convert to UTC for export display
      const publishedAtUtc = new Date(post.published_at.getTime());

      return {
        id: post.id,
        title: post.title,
        userId: post.member?.id,
        name: post.member?.name,
        email: post.member?.email,
        username: post.member?.username,
        totalRepliesCount: post.totalRepliesCount,
        reactionsCount: post.reactionsCount,
        sharesCount: post.sharesCount,
        published_at: publishedAtUtc, // <- uncomment to export UTC
        // published_at: post.published_at,  // <- keep UTC as-is if you prefer
      };
    });

    const { buffer, filename } = await this.writeToExcelNewPost(
      mapData,
      'New Post List',
      'new_post_list',
    );
    return { buffer, filename };
  }

  async writeToExcelNewPost(
    data: any,
    worksheetName: string,
    filenamePrefix: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(worksheetName);

    // Add headers
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Title', key: 'title', width: 50 },
      { header: 'User ID', key: 'userId', width: 10 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Username', key: 'username', width: 30 },
      { header: 'Total Replies Count', key: 'totalRepliesCount', width: 20 },
      { header: 'Reactions Count', key: 'reactionsCount', width: 20 },
      { header: 'Shares Count', key: 'sharesCount', width: 20 },
      { header: 'Published At', key: 'published_at', width: 20 },
    ];

    // Add data
    worksheet.addRows(data);

    // Generate buffer
    const buffer = (await workbook.xlsx.writeBuffer()) as Buffer;
    const filename = `${filenamePrefix}_${Date.now()}.xlsx`;

    return { buffer, filename };
  }

  // new replies
  async exportNewReplies(start_date: Date, end_date: Date) {
    // Build UTC bounds
    this.dateStart = new Date(start_date);
    this.dateStart.setUTCHours(0, 0, 0, 0);

    this.dateEnd = new Date(end_date);
    this.dateEnd.setUTCHours(23, 59, 59, 999);

    // Convert UTC bounds → UTC for querying

    const startUtc = new Date(this.dateStart.getTime());
    const endUtc = new Date(this.dateEnd.getTime());

    const detail = await this.commentRepository.find({
      where: {
        post: { isPsychoeducation: false, isHidden: false },
        moderationStatus: 'approved',
        created_at: Between(startUtc, endUtc), // UTC creation date
        member: {
          id: Not(IsNull()),
          memberAuthEnabled: true,
          userAdmin: { id: IsNull() },
        },
      },
      relations: ['member', 'post'],
      select: {
        id: true,
        description: true,
        member: {
          id: true,
          name: true,
          email: true,
          username: true,
        },
        post: {
          id: true,
          title: true,
        },
        created_at: true,
      },
      order: { created_at: 'ASC' },
    });

    // Map to export shape. If you want UTC time in the spreadsheet, convert below.
    const mapData: DataReply[] = detail.map((reply) => {
      // Optional: convert to UTC for export display
      const createdAtUtc = new Date(reply.created_at.getTime());

      return {
        id: reply.id,
        comment: reply.description,
        userId: reply.member?.id,
        name: reply.member?.name,
        email: reply.member?.email,
        username: reply.member?.username,
        postId: reply.post?.id,
        postTitle: reply.post?.title,
        created_at: createdAtUtc, // <- uncomment to export UTC
        // created_at: reply.created_at,  // <- keep UTC as-is if you prefer
      };
    });

    const { buffer, filename } = await this.writeToExcelNewReply(
      mapData,
      'New Reply List',
      'new_reply_list',
    );
    return { buffer, filename };
  }

  async writeToExcelNewReply(
    data: any,
    worksheetName: string,
    filenamePrefix: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(worksheetName);

    // Add headers
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Comment', key: 'comment', width: 50 },
      { header: 'User ID', key: 'userId', width: 10 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Username', key: 'username', width: 30 },
      { header: 'Post ID', key: 'postId', width: 10 },
      { header: 'Post Title', key: 'postTitle', width: 50 },
      { header: 'Created At', key: 'created_at', width: 20 },
    ];

    // Add data
    worksheet.addRows(data);

    // Generate buffer
    const buffer = (await workbook.xlsx.writeBuffer()) as Buffer;
    const filename = `${filenamePrefix}_${Date.now()}.xlsx`;

    return { buffer, filename };
  }

  // new reactions
  async exportNewReactions(start_date: Date, end_date: Date) {
    // Build UTC bounds
    this.dateStart = new Date(start_date);
    this.dateStart.setUTCHours(0, 0, 0, 0);

    this.dateEnd = new Date(end_date);
    this.dateEnd.setUTCHours(23, 59, 59, 999);

    // Convert UTC bounds → UTC for querying

    const startUtc = new Date(this.dateStart.getTime());
    const endUtc = new Date(this.dateEnd.getTime());

    const detail = await this.reactionRepository.find({
      where: {
        post: { isPsychoeducation: false, isHidden: false },
        created_at: Between(startUtc, endUtc), // UTC creation date
        member: {
          id: Not(IsNull()),
          memberAuthEnabled: true,
          userAdmin: { id: IsNull() },
        },
      },
      relations: ['member', 'post'],
      select: {
        id: true,
        reaction: true,
        member: {
          id: true,
          name: true,
          email: true,
          username: true,
        },
        post: {
          id: true,
          title: true,
        },
        created_at: true,
      },
      order: { created_at: 'ASC' },
    });

    // Map to export shape. If you want UTC time in the spreadsheet, convert below.
    const mapData: DataReaction[] = detail.map((reaction) => {
      // Optional: convert to UTC for export display
      const createdAtUtc = new Date(reaction.created_at.getTime());

      return {
        id: reaction.id,
        reaction: reaction.reaction,
        userId: reaction.member?.id,
        name: reaction.member?.name,
        email: reaction.member?.email,
        username: reaction.member?.username,
        postId: reaction.post?.id,
        postTitle: reaction.post?.title,
        created_at: createdAtUtc, // ← show UTC in export
        // created_at: reaction.created_at,  // ← keep UTC as-is if preferred
      };
    });

    const { buffer, filename } = await this.writeToExcelNewReaction(
      mapData,
      'New Reaction List',
      'new_reaction_list',
    );
    return { buffer, filename };
  }

  async writeToExcelNewReaction(
    data: any,
    worksheetName: string,
    filenamePrefix: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(worksheetName);

    // Add headers
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Reaction', key: 'reaction', width: 50 },
      { header: 'User ID', key: 'userId', width: 10 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Username', key: 'username', width: 30 },
      { header: 'Post ID', key: 'postId', width: 10 },
      { header: 'Post Title', key: 'postTitle', width: 50 },
      { header: 'Created At', key: 'created_at', width: 20 },
    ];

    // Add data
    worksheet.addRows(data);

    // Generate buffer
    const buffer = (await workbook.xlsx.writeBuffer()) as Buffer;
    const filename = `${filenamePrefix}_${Date.now()}.xlsx`;

    return { buffer, filename };
  }
}
