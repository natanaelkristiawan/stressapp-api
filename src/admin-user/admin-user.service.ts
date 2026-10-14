import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminUserAnalyticsDto, AdminUserExportDto, AdminUserListDto, AdminUserSuspendDto, AdminUserUpdateDto, AdminUserUpdateQuizWinnerDto, AdminUserQuestDetailDto } from './dtos/admin-user.dto';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Between, Brackets, In, Repository } from 'typeorm';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { Datatable, DataUser } from './interfaces/datatable.interface';
import * as ExcelJS from 'exceljs';
import { Activity } from 'src/entity/activity.entity';
import { ActivityService } from 'src/activity/activity.service';
import { QuestPoint } from 'src/entity/quest-point.entity';
import { QuestPointDetail } from 'src/entity/quest-point-detail.entity';
import { format, addHours } from 'date-fns';
import { DataSource } from 'typeorm';
import { QuestService } from 'src/quest/quest.service';
import { DeductPointDto } from './dtos/deduct-point.dto';
@Injectable()
export class AdminUserService {

  private readonly baseUrl = process.env.BASE_URL;

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

  protected readonly siteRole = {
    "0": "Member",
    "1": "Admin",
  }

  // constructor
  constructor(
    @InjectRepository(UserMimateEntity, 'mimate')
    private readonly userMimateRepository: Repository<UserMimateEntity>,

    @InjectRepository(Activity, 'mimate')
    private readonly activityRepository: Repository<Activity>,

    @InjectRepository(QuestPoint, 'mimate')
    private readonly questPointRepository: Repository<QuestPoint>,

    @InjectRepository(QuestPointDetail, 'mimate')
    private readonly questPointDetailRepository: Repository<QuestPointDetail>,


    private readonly activityService: ActivityService,

    private readonly questService: QuestService,

    @InjectDataSource('mimate')
    private readonly dataSource: DataSource,



  ) { }

  // datatable
  async getUserList(dto: AdminUserListDto): Promise<Datatable> {
    const { page, limit, search, sort, order, start_date, end_date, filter } = dto;

    const query = this.userMimateRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.questPoint', 'questPoint');

    // Default order
    query.orderBy('user.id', 'DESC').where('user.activated_at IS NOT NULL');;

    // Sorting
    if (sort) {
      if (sort === 'name') {
        query.orderBy('user.name', order === 'asc' ? 'ASC' : 'DESC');
      } else if (sort === 'created_at') {
        query.orderBy('user.created_at', order === 'asc' ? 'ASC' : 'DESC');
      } else if (sort === 'updated_at') {
        query.orderBy('user.updated_at', order === 'asc' ? 'ASC' : 'DESC');
      } else if (sort === 'posts') {
        query.orderBy('user.total_posts', order === 'asc' ? 'ASC' : 'DESC');
      } else if (sort === 'comments') {
        query.orderBy('user.total_comments', order === 'asc' ? 'ASC' : 'DESC');
      } else if (sort === 'mimate_point') {
        query.orderBy('questPoint.totalPoints', order === 'asc' ? 'ASC' : 'DESC');
      } else if (sort === 'shares') {
        query.orderBy('user.total_shares', order === 'asc' ? 'ASC' : 'DESC');
      }
    }

    // Search
    if (search) {
      const trimmed = search.trim();
      const isNumeric = /^\d+$/.test(trimmed);

      if (filter === 'name') {
        query.andWhere('LOWER(user.name) LIKE :search', { search: `%${search.toLowerCase()}%` });
      } else if (filter === 'userId') {
        if (isNumeric) {
          query.andWhere('user.userId = :search', { search: Number(trimmed) });
        } else {
          query.andWhere('1 = 0');
        }
      } else if (filter === 'mmid_fullname') {
        query.andWhere('LOWER(user.mmid_fullname) LIKE :search', { search: `%${search.toLowerCase()}%` });
      } else if (filter === 'email') {
        query.andWhere('LOWER(user.email) LIKE :search', { search: `%${search.toLowerCase()}%` });
      } else {
        query.andWhere(
          new Brackets((qb) => {
            qb.where('LOWER(user.name) LIKE :search', { search: `%${search.toLowerCase()}%` })
              .orWhere('LOWER(user.mmid_fullname) LIKE :search', { search: `%${search.toLowerCase()}%` })
              .orWhere('LOWER(user.email) LIKE :search', { search: `%${search.toLowerCase()}%` });

            if (isNumeric) {
              qb.orWhere('user.userId = :searchUserId', { searchUserId: Number(trimmed) });
            }
          }),
        );
      }
    }

    // Date filter (treat start_date/end_date as LOCAL UTC+8 days)
    if (start_date && end_date) {
      // Build local 00:00:00.000 → 23:59:59.999
      const startLocal = new Date(start_date as any);
      startLocal.setHours(0, 0, 0, 0);

      const endLocal = new Date(end_date as any);
      endLocal.setHours(23, 59, 59, 999);

      // Convert LOCAL → UTC for DB filtering
      const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;
      const startUtc = new Date(startLocal.getTime() - TZ_OFFSET_MS);
      const endUtc = new Date(endLocal.getTime() - TZ_OFFSET_MS);

      query.andWhere('user.activated_at BETWEEN :start_date AND :end_date', {
        start_date: startUtc,
        end_date: endUtc,
      });
    }

    const siteRole: Record<string, string> = {
      '0': 'Member',
      '1': 'Admin',
    };

    // Count BEFORE pagination (this is your filtered count)
    const countQuery = query.clone();
    const recordsFiltered = await countQuery.getCount();

    // Page
    const queryResult = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getRawAndEntities();

    const data = queryResult.entities;

    // Vehicle details belonged to the retired external identity system.
    const vehicleMap = new Map<number, string[]>();

    // 3) Fetch latest quest points for these users in ONE query to guarantee latest points
    const memberIds = Array.from(
      new Set(
        data
          .map((u: any) => u.id)
          .filter((id: any): id is number => id !== null && id !== undefined)
      )
    );

    const questPoints = memberIds.length > 0 ? await this.questPointRepository.find({
      where: { memberId: In(memberIds) },
    }) : [];

    const questPointMap = new Map<number, number>();
    for (const qp of questPoints) {
      if (qp.memberId !== null && qp.memberId !== undefined) {
        questPointMap.set(qp.memberId, Number(qp.totalPoints || 0));
      }
    }

    // 4) Build mapped result
    const mapData: DataUser[] = data.map((user: any) => ({
      id: user.id,
      userId: user.userId,
      name: this.getMemberName(user.name, user.mmid_fullname, user.id),
      email: user.email,
      createdAt: user.activated_at,
      updatedAt: user.updated_at,
      username: user.mmid_fullname,
      mmid_fullname: user.mmid_fullname,
      status: user.status,
      siteRole: siteRole[user.member_role],
      vehicleList: vehicleMap.get(user.userId) ?? [], // if your entity uses 'id', switch to vehicleMap.get(user.id)
      dob: user.dob,
      gender: user.gender,
      mimatePoint: questPointMap.has(user.id)
        ? questPointMap.get(user.id)!
        : (user.questPoint?.totalPoints ?? 0),
      posts: user.total_posts,
      comments: user.total_comments,
      likes: user.total_likes,
      shares: user.total_shares,
      quizWinner: user.quiz_winner,
    }));

    return {
      items: mapData,
      recordsTotal: recordsFiltered,      // total after filters
      recordsFiltered: recordsFiltered,   // keep consistent
    };
  }



  // get detail user by id and return as DatauserInterface
  async getUserById(id: number): Promise<DataUser> {
    const user = await this.userMimateRepository.findOne({ where: { id }, relations: ['questPoint'] });
    // map data
    return {
      id: user.id,
      name: this.getMemberName(user.name, user.mmid_fullname, user.id),
      email: user.email,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      username: user.mmid_fullname,
      status: user.status,
      siteRole: this.siteRole[user.member_role],
      vehicleList: [],
      dob: user.dob,
      gender: user.gender,
      mimatePoint: user.questPoint?.totalPoints ?? 0,
      posts: user.total_posts,
      comments: user.total_comments,
      likes: user.total_likes,
      shares: user.total_shares,
      quizWinner: user.quiz_winner,
    };
  }

  // export user list (CSV only)
  async exportUserList(dto: AdminUserExportDto): Promise<{ buffer: Buffer; filename: string }> {
    return await this.exportUserListCsv(dto);
  }

  // export user list as Excel
  async exportUserListExcel(dto: AdminUserExportDto): Promise<{ buffer: Buffer; filename: string }> {
    const { search, start_date, end_date } = dto;

    // Build base query
    const baseQuery = this.userMimateRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.questPoint', 'questPoint');

    if (search) {
      baseQuery.where('user.name LIKE :search OR user.email LIKE :search', { search: `%${search}%` });
    }

    // Treat start_date/end_date as LOCAL (UTC+8) calendar days
    if (start_date && end_date) {
      const startLocal = new Date(start_date as any);
      startLocal.setHours(0, 0, 0, 0);

      const endLocal = new Date(end_date as any);
      endLocal.setHours(23, 59, 59, 999);

      // Convert LOCAL → UTC for DB filtering
      const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;
      const startUtc = new Date(startLocal.getTime() - TZ_OFFSET_MS);
      const endUtc = new Date(endLocal.getTime() - TZ_OFFSET_MS);

      baseQuery.andWhere('user.activated_at BETWEEN :start_date AND :end_date', {
        start_date: startUtc,
        end_date: endUtc,
      });
    }

    baseQuery.orderBy('user.activated_at', 'ASC');

    // Show timestamps in LOCAL (UTC+8) in the export
    const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;
    const toLocal = (d?: Date | null) => (d ? new Date(new Date(d).getTime() + TZ_OFFSET_MS) : null);

    // Create workbook first
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('User List');

    // Add headers
    worksheet.addRow(['Name', 'Email', 'Status', 'Site Role', 'Vehicle List', 'DOB', 'Gender', 'Mimate Point', 'Posts', 'Comments', 'Likes', 'Shares', 'Quiz Winner', 'Created At', 'Updated At']);

    // Process in chunks to avoid memory issues
    const CHUNK_SIZE = 500; // Process 500 users at a time
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      // Clone the base query for each chunk
      const query = baseQuery.clone()
        .skip(skip)
        .take(CHUNK_SIZE);

      const chunk = await query.getMany();

      if (chunk.length === 0) {
        hasMore = false;
        break;
      }

      // Process and write chunk to Excel immediately
      for (const user of chunk) {
        const rowData = [
          this.getMemberName(user.name, user.mmid_fullname, user.id),
          user.email,
          user.status,
          this.siteRole[user.member_role],
          '', // vehicleList
          user.dob || '',
          user.gender || '',
          user.questPoint?.totalPoints ?? 0,
          user.total_posts || 0,
          user.total_comments || 0,
          user.total_likes || 0,
          user.total_shares || 0,
          0, // quizWinner
          toLocal(user.activated_at) || '',
          toLocal(user.updated_at) || '',
        ];
        worksheet.addRow(rowData);
      }

      // Check if there are more records
      hasMore = chunk.length === CHUNK_SIZE;
      skip += CHUNK_SIZE;

      // Optional: Add a small delay to prevent overwhelming the system
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    // Generate buffer after all data is written
    // @ts-ignore
    const buffer = await workbook.xlsx.writeBuffer() as Buffer;
    const filename = `user_list_${Date.now()}.xlsx`;

    return { buffer, filename };
  }

  // export user list as CSV (more memory efficient)
  async exportUserListCsv(dto: AdminUserExportDto): Promise<{ buffer: Buffer; filename: string }> {
    const { search, start_date, end_date } = dto;

    // Build the export from local profiles only.
    const baseQuery = this.userMimateRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.questPoint', 'questPoint');

    if (search) {
      baseQuery.where('user.name LIKE :search OR user.email LIKE :search', { search: `%${search}%` });
    }

    // Treat start_date/end_date as LOCAL (UTC+8) calendar days
    if (start_date && end_date) {
      const startLocal = new Date(start_date as any);
      startLocal.setHours(0, 0, 0, 0);

      const endLocal = new Date(end_date as any);
      endLocal.setHours(23, 59, 59, 999);

      // Convert LOCAL → UTC for DB filtering
      const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;
      const startUtc = new Date(startLocal.getTime() - TZ_OFFSET_MS);
      const endUtc = new Date(endLocal.getTime() - TZ_OFFSET_MS);

      baseQuery.andWhere('user.activated_at BETWEEN :start_date AND :end_date', {
        start_date: startUtc,
        end_date: endUtc,
      });
    }

    baseQuery.orderBy('user.activated_at', 'ASC');

    // Show timestamps in LOCAL (UTC+8) in the export
    const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;
    const toLocal = (d?: Date | null) => (d ? new Date(new Date(d).getTime() + TZ_OFFSET_MS) : null);

    // Helper function to escape CSV values
    const escapeCsv = (value: any): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      // If contains comma, quote, or newline, wrap in quotes and escape quotes
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Build CSV header
    const headers = ['Name', 'Email', 'Status', 'Site Role', 'Vehicle List', 'DOB', 'Gender', 'Mimate Point', 'Posts', 'Comments', 'Likes', 'Shares', 'Quiz Winner', 'Created At', 'Updated At', 'MMID ID', 'Phone'];
    const csvRows: string[] = [headers.map(escapeCsv).join(',')];

    // Process in chunks to avoid memory issues
    const CHUNK_SIZE = 1000; // CSV can handle larger chunks since it's lighter
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      // Clone the base query for each chunk
      const query = baseQuery.clone()
        .skip(skip)
        .take(CHUNK_SIZE);

      const chunk = await query.getMany();

      if (chunk.length === 0) {
        hasMore = false;
        break;
      }

      // Process and add chunk to CSV immediately
      for (const user of chunk) {
        const phone = ''; // No local phone source; do not query external identity tables.
        const rowData = [
          this.getMemberName(user.name, user.mmid_fullname, user.id),
          user.email,
          user.status,
          this.siteRole[user.member_role],
          '', // vehicleList
          user.dob || '',
          user.gender || '',
          user.questPoint?.totalPoints ?? 0,
          user.total_posts || 0,
          user.total_comments || 0,
          user.total_likes || 0,
          user.total_shares || 0,
          0, // quizWinner
          toLocal(user.activated_at) || '',
          toLocal(user.updated_at) || '',

          user.userId,
          phone,
        ];
        csvRows.push(rowData.map(escapeCsv).join(','));
      }

      // Check if there are more records
      hasMore = chunk.length === CHUNK_SIZE;
      skip += CHUNK_SIZE;

      // Optional: Add a small delay to prevent overwhelming the system
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    // Convert CSV string to buffer
    const csvContent = csvRows.join('\n');
    const buffer = Buffer.from(csvContent, 'utf-8');
    const filename = `user_list_${Date.now()}.csv`;

    return { buffer, filename };
  }

  //  write to excel
  async writeToExcel(data: any): Promise<{ buffer: Buffer; filename: string }> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('User List');

    //add header in interface DataUser
    worksheet.addRow(['Name', 'Email', 'Status', 'Site Role', 'Vehicle List', 'DOB', 'Gender', 'Mimate Point', 'Posts', 'Comments', 'Likes', 'Shares', 'Quiz Winner', 'Created At', 'Updated At']);

    for (const user of data) {
      worksheet.addRow([this.getMemberName(user.name, user.mmid_fullname, user.id), user.email, user.status, user.siteRole, user.vehicleList, user.dob, user.gender, user.mimatePoint, user.posts, user.comments, user.likes, user.shares, user.quizWinner, user.createdAt, user.updatedAt]);
    }

    // @ts-ignore
    const buffer = await workbook.xlsx.writeBuffer() as Buffer;
    const filename = `user_list_${Date.now()}.xlsx`;

    return { buffer, filename };
  }


  // analytics user
  async getUserAnalytics(id: number, dto: AdminUserAnalyticsDto): Promise<any> {
    const { start_date, end_date } = dto;

    const range_day = this.getRangeDay(start_date, end_date) + 1;


    const start_date_before = new Date(start_date.getTime() - (range_day * 24 * 60 * 60 * 1000));
    const end_date_before = new Date(end_date.getTime() - (range_day * 24 * 60 * 60 * 1000));

    // get page view
    const pageView = await this.getPageView(id, start_date, end_date, start_date_before, end_date_before);

    // get new posts    
    const newPosts = await this.getNewPosts(id, start_date, end_date, start_date_before, end_date_before);

    // get mimate point
    const mimatePoint = await this.getMimatePoint(id, start_date, end_date, start_date_before, end_date_before);

    // get activity
    const activity = await this.getActivity(id, start_date, end_date, start_date_before, end_date_before);

    return {
      pageView,
      newPosts,
      mimatePoint,
      activity,
    }
  }


  private getRangeDay(start_date: Date, end_date: Date) {
    const range_day = end_date.getTime() - start_date.getTime();
    return Math.ceil(range_day / (24 * 60 * 60 * 1000));
  }


  // page view
  async getPageView(id: number, start_date: Date, end_date: Date, start_date_before: Date, end_date_before: Date) {

    // get activity 
    const count_1 = await this.activityRepository.count({ where: { userId: id, targetType: 'login', createdAt: Between(start_date, end_date) } });
    const count_2 = await this.activityRepository.count({ where: { userId: id, targetType: 'login', createdAt: Between(start_date_before, end_date_before) } });

    // get calculation
    const range = count_1 - count_2;

    return {
      text: 'Page View',
      total: count_1,
      progress: range,
    }
  }


  async getNewPosts(id: number, start_date: Date, end_date: Date, start_date_before: Date, end_date_before: Date) {
    // get post
    const count_1 = await this.activityRepository.count({ where: { userId: id, targetType: 'post', action: 'create', createdAt: Between(start_date, end_date) } });
    const count_2 = await this.activityRepository.count({ where: { userId: id, targetType: 'post', action: 'create', createdAt: Between(start_date_before, end_date_before) } });

    // get calculation
    const range = count_1 - count_2;

    return {
      text: 'New Posts',
      total: count_1,
      progress: range,
    }
  }

  async getMimatePoint(id: number, start_date: Date, end_date: Date, start_date_before: Date, end_date_before: Date) {
    // get calculation

    return {
      text: 'Mimate Point',
      total: 0,
    }

  }


  async getActivity(id: number, start_date: Date, end_date: Date, start_date_before: Date, end_date_before: Date) {
    // get activity
    const query = await this.activityRepository.find({ where: { userId: id, targetType: In(['post', 'comment', 'reaction']), createdAt: Between(start_date, end_date) } });

    // get calculation
    const range = query.length;

    // split by target type
    const post = query.filter(item => item.targetType === 'post');
    const comment = query.filter(item => item.targetType === 'comment');
    const reaction = query.filter(item => item.targetType === 'reaction');

    // get calculation
    const post_range = post.length;
    const comment_range = comment.length;
    const reaction_range = reaction.length;

    return {
      text: 'Activity',
      total: range,
      post: post_range,
      comment: comment_range,
      reaction: reaction_range,
    }
  }

  // Get all activity for a user by userId (memberId)
  async getAllUserActivity(userId: number, page: number, limit: number): Promise<any> {
    // total data
    let total = await this.activityRepository.count({
      where: { userId: userId }
    });

    // get all activity by user id
    let query = await this.activityRepository.find({
      where: { userId: userId },
      relations: ['user'],
      skip: (page - 1) * limit,
      take: limit,
      order: {
        id: 'DESC'
      }
    });

    let data = [];

    for (let list of query) {
      if (list.user == null) {
        continue;
      }

      let wording = '';
      let memberName = this.getMemberName(list.user.name, list.user.mmid_fullname, list.user.id);

      // create wording
      if (list.targetType === 'comment') {
        wording = `${memberName} comment with action ${list.action} at ${list.postId ? 'post ' + list.postId : ''} on ${list.createdAt.toLocaleString()}`;
      } else if (list.targetType === 'reaction') {
        wording = `${memberName} reacted with action ${list.action} at ${list.postId ? 'post ' + list.postId : ''} on ${list.createdAt.toLocaleString()}`;
      } else if (list.targetType === 'post') {
        wording = `${memberName} created a post with action ${list.action} at ${list.createdAt.toLocaleString()}`;
      } else if (list.targetType === 'login') {
        wording = `${memberName} logged in with action ${list.action} at ${list.createdAt.toLocaleString()}`;
      } else {
        wording = `${memberName} activity at ${list.createdAt.toLocaleString()}`;
      }

      data.push({
        id: list.id,
        status: wording,
        type: list.targetType,
        createdAt: list.createdAt.toLocaleString(),
      });
    }
    return {
      items: data,
      recordsTotal: total,
      recordsFiltered: total,
    };
  }


  // delete user
  async deleteUser(id: number): Promise<{ message: string }> {
    // check if user is exist
    const user = await this.userMimateRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // delete user
    await this.userMimateRepository.softDelete(id);

    // return success
    return { message: 'User deleted successfully' };
  }


  // suspend user
  async suspendUserOnOff(id: number, dto: AdminUserSuspendDto, is_suspended: boolean): Promise<{ message: string }> {
    // check if user is exist
    const user = await this.userMimateRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // update user
    await this.userMimateRepository.update(id, { is_suspended: is_suspended, suspend_reason: dto.suspend_reason });

    // return success
    return { message: 'User suspended successfully' };
  }


  // update user
  async updateUser(id: number, dto: AdminUserUpdateDto): Promise<DataUser> {
    // check if user is exist
    const user = await this.userMimateRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    // update user
    user.name = dto.name;
    user.mmid_fullname = dto.username;
    user.dob = dto.dob;
    user.gender = dto.gender;

    // save user
    await this.userMimateRepository.save(user);

    return await this.getUserById(id);



  }


  // set unset member verified
  async setUnsetMemberVerified(id: number, is_verified: boolean): Promise<{ message: string }> {
    // check if user is exist
    const user = await this.userMimateRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // update user
    user.member_verified = is_verified;
    await this.userMimateRepository.save(user);

    // return success
    return { message: 'User verified successfully' };
  }


  // get member id with duplicate email
  async getMemberIdWithDuplicateEmail(): Promise<any> {
    const subQuery =
      this.dataSource
        .createQueryBuilder(UserMimateEntity, "sub")
        .select("sub.email_mmid")
        .where("sub.email_mmid IS NOT NULL")
        .andWhere("sub.email_mmid <> ''")
        .groupBy("sub.email_mmid")
        .having("COUNT(*) > 1");

    const duplicatedMembers = await this.dataSource
      .getRepository(UserMimateEntity)
      .createQueryBuilder("bm")
      .select([
        "id",
        "email_mmid",
        "email",
        "userId",
        "total_posts",
        "created_at",
      ])
      .where("email_mmid IS NOT NULL")
      .andWhere("email_mmid <> ''")
      .andWhere(`email_mmid IN (${subQuery.getQuery()})`)
      .setParameters(subQuery.getParameters())
      .orderBy("email_mmid", "ASC")
      .getRawMany();

    let data = await this.groupDuplicateEmailMmid(duplicatedMembers);


    // loop again skip when the group have userId in both data

    let data_final = [];

    for (const item of data) {
      let is_skip = false;
      let count = 0;
      for (const user of item.users) {
        if (user.userId) {
          count++;
        }
      }
      if (count == 2) {
        is_skip = true;
      }

      if (item.users.length > 2) {
        is_skip = true;
      }

      if (!is_skip) {
        data_final.push(item);
      }
    }

    let data_final_sorted = this.sortUsersByCreatedAtInGroups(data_final);


    // loop data_final_sorted
    for (const item of data_final_sorted) {
      let userID: number | null = null;
      for (const user of item.users) {


        if (user.userId) {
          userID = user.userId;
        }

        // update null userId
        await this.userMimateRepository.update(user.id, { userId: null });


      }

      // change in data 0 to userID
      await this.userMimateRepository.update(item.users[0].id, { userId: userID });

    }

    return data_final_sorted;
  }

  private sortUsersByCreatedAtInGroups(data: any) {
    return data.map(group => {
      const sortedUsers = [...group.users].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      return {
        ...group,
        users: sortedUsers
      };
    });
  }


  private async groupDuplicateEmailMmid(users: UserMimateEntity[]) {
    const grouped: Record<string, UserMimateEntity[]> = {};



    for (const user of users) {
      if (!user.email_mmid) continue;

      if (!grouped[user.email_mmid]) {
        grouped[user.email_mmid] = [];
      }
      grouped[user.email_mmid].push(user);
    }

    // Only return duplicates
    const duplicates = Object.entries(grouped)
      .filter(([_, group]) => group.length > 1)
      .map(([mmid, group]) => ({ email_mmid: mmid, users: group }));

    return duplicates;
  }


  //   update quiz winner
  async updateQuizWinner(id: number, dto: AdminUserUpdateQuizWinnerDto): Promise<{ message: string }> {
    // check if user is exist
    const user = await this.userMimateRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // update quiz winner
    await this.userMimateRepository.update(id, { quiz_winner: dto.quiz_winner });

    // return success
    return { message: 'Quiz winner updated successfully' };
  }

  // get quest detail
  async getQuestDetail(id: number, dto: AdminUserQuestDetailDto): Promise<Datatable<QuestPointDetail>> {
    const { page, limit } = dto;

    const [data, total] = await this.questPointDetailRepository.findAndCount({
      where: { member_id: id },
      relations: ['quest', 'post', 'comment', 'reaction'],
      take: limit,
      skip: (page - 1) * limit,
      order: { created_at: 'DESC' }
    });

    const formattedData = data.map((item) => ({
      ...item,
      created_at: format(addHours(new Date(item.created_at), 7), 'yyyy-MM-dd HH:mm:ss'),
    }));

    return {
      items: formattedData as any,
      recordsTotal: total,
      recordsFiltered: total
    };
  }

  async exportQuestDetail(id: number): Promise<{ buffer: Buffer; filename: string }> {
    const [data, total] = await this.questPointDetailRepository.findAndCount({
      where: { member_id: id },
      relations: ['quest', 'post', 'comment', 'reaction', 'member'],
      order: { created_at: 'DESC' }
    });



    const formattedData = data.map((item) => ({
      id: item.id,
      userId: item.member_id,
      userMmid: item.member?.id || '',
      name: item.member?.name || '',
      email: item.member?.email || '',
      mmid_fullname: item.member?.mmid_fullname || '',
      point: item.points,
      postId: item.post_id ? `${this.baseUrl}/post/${item.post_id}` : '',
      note: item.note || '',
      published_at: format(addHours(new Date(item.created_at), 7), 'yyyy-MM-dd HH:mm:ss'),
    }));

    return await this.writeToExcelQuestDetail(formattedData, 'Quest Detail', 'quest_detail');
  }


  async writeToExcelQuestDetail(data: any, worksheetName: string, filenamePrefix: string): Promise<{ buffer: Buffer; filename: string }> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(worksheetName);

    // Add headers
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'User ID', key: 'userId', width: 10 },
      { header: 'User MMID', key: 'userMmid', width: 10 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'MMID Fullname', key: 'mmid_fullname', width: 30 },
      { header: 'Point', key: 'point', width: 20 },
      { header: 'Post Id', key: 'postId', width: 20 },
      { header: 'Note', key: 'note', width: 20 },
      { header: 'Created At', key: 'published_at', width: 20 }
    ];

    // Add data
    worksheet.addRows(data);

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer() as any;
    const filename = `${filenamePrefix}_${Date.now()}.xlsx`;

    return { buffer, filename };
  }




  async deductPoint(id: number, dto: DeductPointDto): Promise<boolean> {
    try {
      const result = await this.questService.decreasePointById(id, dto.points, dto.note);
      return result;
    } catch (error) {
      return false;
    }
  }


}
