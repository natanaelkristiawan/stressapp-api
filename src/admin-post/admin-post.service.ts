import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AdminPostAnalyticsDto, AdminPostExportDto, AdminPostListDto, CreatePostHighlightDto } from './dtos/admin-post.dto';
import { DataPost, Datatable } from './interfaces/datatable.interface';
import { PostEntity } from 'src/entity/post.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { SpaceEntity } from 'src/entity/space.entity';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import * as ExcelJS from 'exceljs';
import { PostTagsEntity } from 'src/entity/post-tags.entity';
import { TagsEntity } from 'src/entity/tags.entity';

@Injectable()
export class AdminPostService {
    private deeplink: string
    constructor(
        @InjectRepository(PostEntity, 'mimate') private postRepository: Repository<PostEntity>,
        @InjectRepository(SpaceEntity, 'mimate') private spaceRepository: Repository<SpaceEntity>,
        @InjectRepository(UserMimateEntity, 'mimate') private userRepository: Repository<UserMimateEntity>,
        @InjectRepository(TagsEntity, 'mimate') private tagRepository: Repository<TagsEntity>,

    ) {
        this.deeplink = process.env.DEEPLINK_URL
    }


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

    async getPost(
      dto: AdminPostListDto,
      spaceId?: number,
      is_highlight?: boolean,
      tagId?: number
    ): Promise<Datatable> {
      const { page, limit, search, sort, order, start_date, end_date, search_by } = dto;
    
      const qb = this.postRepository
        .createQueryBuilder('post')
        .leftJoinAndMapOne('post.space', SpaceEntity, 'space', 'space.id = post.backup_space_id')
        .leftJoinAndMapOne('post.member', UserMimateEntity, 'member', 'member.id = post.backup_member_id')
        // --- subquery for view count ---
        .addSelect((sub) => {
          return sub
            .select('COUNT(*)')
            .from('activity_logs', 'al')
            .where('al.postId = post.id')
            .andWhere("al.action = 'view'");
        }, 'post_view_count');
    
      // WHERE builder
      const whereParts: string[] = ['post.isPsychoeducation = false'];
      const params: Record<string, any> = {};
    
      if (spaceId) {
        whereParts.push('post.backup_space_id = :spaceId');
        params.spaceId = spaceId;
      }
    
      // tag search
      if (search_by === 'tag' && search) {
        const tag = await this.tagRepository.findOne({ where: { title: search } });
        if (!tag) {
          return { items: [], recordsTotal: 0, recordsFiltered: 0 };
        }
        tagId = tag.id;
      }
    
      if (tagId) {
        qb.leftJoinAndMapMany(
          'post.tags',
          PostTagsEntity,
          'post_tags',
          'post_tags.backup_post_id = post.id'
        );
        whereParts.push('post_tags.backup_tag_id = :tagId');
        params.tagId = tagId;
      }
    
      if (is_highlight) {
        whereParts.push('post.is_highlight = :is_highlight');
        params.is_highlight = true;
      }
    
      if (search && search_by) {
        const lowerSearch = `%${search.toLowerCase()}%`;
        switch (search_by) {
          case 'title':
            whereParts.push('LOWER(post.title) LIKE :search');
            params.search = lowerSearch;
            break;
          case 'author':
            whereParts.push(`
              LOWER(
                COALESCE(
                  NULLIF(TRIM(member.name), ''),
                  NULLIF(TRIM(member.mmid_fullname), ''),
                  CONCAT('user_', LPAD(member.id, 4, '0'))
                )
              ) LIKE :search
            `);
            params.search = lowerSearch;
            break;
          case 'space':
            whereParts.push('LOWER(space.name) LIKE :search');
            params.search = lowerSearch;
            break;
          case 'description':
            whereParts.push('LOWER(post.textContent) LIKE :search');
            params.search = lowerSearch;
            break;
          case 'published_at':
            // MySQL DATE_FORMAT; change if you’re on Postgres
            whereParts.push("LOWER(DATE_FORMAT(post.published_at, '%Y-%m-%d %H:%i:%s')) LIKE :search");
            params.search = lowerSearch;
            break;
        }
      }

    
      // Date filter: interpret start/end as UTC days → convert to UTC
      if (start_date && end_date) {
        const startDay = new Date(start_date as any);
        startDay.setUTCHours(0, 0, 0, 0);
        const endDay = new Date(end_date as any);
        endDay.setUTCHours(23, 59, 59, 999);
    
        
        const startUtc = new Date(startDay.getTime());
        const endUtc = new Date(endDay.getTime());
    
        whereParts.push('post.created_at BETWEEN :start_date AND :end_date');
        params.start_date = startUtc;
        params.end_date = endUtc;
      }
    
      if (whereParts.length) qb.where(whereParts.join(' AND '), params);
    
      // Sorting (note: views = subquery alias)
      if (sort) {
        if (sort === 'name') {
          qb.orderBy('member.name', order === 'asc' ? 'ASC' : 'DESC');
        } else if (sort === 'created_at') {
          qb.orderBy('post.created_at', order === 'asc' ? 'ASC' : 'DESC');
        } else if (sort === 'views') {
          qb.orderBy('post_view_count', order === 'asc' ? 'ASC' : 'DESC'); // <-- use alias
        } else if (sort === 'reactions') {
          qb.orderBy('post.reactionsCount', order === 'asc' ? 'ASC' : 'DESC');
        } else if (sort === 'comments') {
          qb.orderBy('post.totalRepliesCount', order === 'asc' ? 'ASC' : 'DESC');
        } else if (sort === 'published_at') {
          qb.orderBy('post.published_at', order === 'asc' ? 'ASC' : 'DESC');
        } else {
          qb.orderBy(`post.${sort}`, order === 'asc' ? 'ASC' : 'DESC');
        }
      } else {
        qb.orderBy('post.created_at', 'DESC');
      }
    
      // Pagination: we need raw rows to read post_view_count, so use getRawAndEntities
      qb.skip((page - 1) * limit).take(limit);
    
      const [{ entities: posts, raw }, total] = await Promise.all([
        qb.getRawAndEntities(),
        // count without pagination
        qb.clone().skip(undefined as any).take(undefined as any).getCount(),
      ]);
    
      // merge the raw post_view_count into DTO (aligns by index)
      const items: DataPost[] = posts.map((post, idx) => {
        const views = Number(raw[idx]?.post_view_count ?? 0);
    
        return {
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
          created_at:  new Date(post.created_at.getTime()),
          updated_at: new Date(post.updated_at.getTime()),
          published_at: new Date(post.published_at.getTime()),
          deleted_at: post.deleted_at,
          isHidden: post.isHidden,
          post_type:post.post_type ? post.post_type: 'post',
          vote_start:post.vote_start,
          vote_end:post.vote_end,
          total_vote:post.total_vote,
    
          // now viewsCount comes from the subquery alias
          viewsCount: views,
    
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
                name: this.getMemberName(post.member.name, post.member.mmid_fullname, post.member.id),
                email: post.member.email,
                profilePictureUrl: post.member.profilePictureUrl,
                userId: post.member.userId,
              }
            : null,
        };
      });
    
      return {
        items,
        recordsTotal: total,
        recordsFiltered: total,
      };
    }

    async getPostsByIds(ids: number[]): Promise<Datatable> {
      if (!ids?.length) {
        return { items: [], recordsTotal: 0, recordsFiltered: 0 };
      }
      const qb = this.postRepository
        .createQueryBuilder('post')
        .leftJoinAndMapOne('post.space', SpaceEntity, 'space', 'space.id = post.backup_space_id')
        .leftJoinAndMapOne('post.member', UserMimateEntity, 'member', 'member.id = post.backup_member_id')
        .addSelect((sub) => {
          return sub
            .select('COUNT(*)')
            .from('activity_logs', 'al')
            .where('al.postId = post.id')
            .andWhere("al.action = 'view'");
        }, 'post_view_count')
        .where('post.id IN (:...ids)', { ids }).andWhere('post.isPsychoeducation = false');

      const { entities: posts, raw } = await qb.getRawAndEntities();
      const items: DataPost[] = posts.map((post, idx) => {
        const views = Number(raw[idx]?.post_view_count ?? 0);
        return {
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
          post_type: post.post_type ? post.post_type : 'post',
          vote_start: post.vote_start,
          vote_end: post.vote_end,
          total_vote: post.total_vote,
          viewsCount: views,
          space: post.space
            ? { id: post.space.id, name: post.space.name, description: post.space.description }
            : null,
          author: post.member
            ? {
                id: post.member.id,
                name: this.getMemberName(post.member.name, post.member.mmid_fullname, post.member.id),
                email: post.member.email,
                profilePictureUrl: post.member.profilePictureUrl,
                userId: post.member.userId,
              }
            : null,
        };
      });
      // Order by position of post id in the requested ids (params order)
      items.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
      return {
        items,
        recordsTotal: items.length,
        recordsFiltered: items.length,
      };
    }

    async detail(id: number): Promise<DataPost>{
        const post = await this.postRepository
            .findOne({ 
                where: { id, isPsychoeducation: false },
                relations : ['space','member']
            });
        if (!post) {
            throw new NotFoundException('Post not found');
        }
        return {
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
                      name: this.getMemberName(post.member.name, post.member.mmid_fullname, post.member.id),    
                      email: post.member.email,
                      profilePictureUrl: post.member.profilePictureUrl,
                      userId: post.member.userId,
                  }
                : null,
        }
    }

    async export(
      dto: AdminPostExportDto,
      spaceId?: number,
      tagId?: number
    ): Promise<{ buffer: Buffer; filename: string }> {
      const { search, start_date, end_date, search_by } = dto;
    
      const qb = this.postRepository
        .createQueryBuilder('post')
        .leftJoinAndMapOne('post.space', SpaceEntity, 'space', 'space.id = post.backup_space_id')
        .leftJoinAndMapOne('post.member', UserMimateEntity, 'member', 'member.id = post.backup_member_id')
        // ⬇️ Subquery for views (same as list)
        .addSelect((sub) => {
          return sub
            .select('COUNT(*)')
            .from('activity_logs', 'al')
            .where('al.postId = post.id')
            .andWhere("al.action = 'view'");
        }, 'post_view_count')
        .where('post.isPsychoeducation = false');
    
      // Space filter
      if (spaceId) {
        qb.andWhere('post.backup_space_id = :spaceId', { spaceId });
      }
    
      // Tag filter (if you want search_by=tag, resolve title→id like in list)
      if (tagId) {
        qb.leftJoinAndMapMany(
          'post.tags',
          PostTagsEntity,
          'post_tags',
          'post_tags.backup_post_id = post.id'
        );
        qb.andWhere('post_tags.backup_tag_id = :tagId', { tagId });
      }
    
      // Text search
      if (search && search_by) {
        const like = `%${search}%`;
        switch (search_by) {
          case 'title':
            qb.andWhere('post.title LIKE :search', { search: like });
            break;
          case 'author':
            qb.andWhere(
              `
              COALESCE(
                NULLIF(TRIM(member.name), ''),
                NULLIF(TRIM(member.mmid_fullname), ''),
                CONCAT('user_', LPAD(member.id, 4, '0'))
              ) LIKE :search
            `,
              { search: like }
            );
            break;
          case 'space':
            qb.andWhere('space.name LIKE :search', { search: like });
            break;
          case 'description':
            qb.andWhere('post.textContent LIKE :search', { search: like });
            break;
          case 'published_at':
            // MySQL; change if on Postgres
            qb.andWhere("DATE_FORMAT(post.published_at, '%Y-%m-%d %H:%i:%s') LIKE :search", {
              search: like,
            });
            break;
        }
      }
    
      // Date range (interpret as UTC day, convert to UTC for DB)
      if (start_date && end_date) {
        const startDay = new Date(start_date as any);
        startDay.setUTCHours(0, 0, 0, 0);
        const endDay = new Date(end_date as any);
        endDay.setUTCHours(23, 59, 59, 999);

        const startUtc = new Date(startDay.getTime());
        const endUtc = new Date(endDay.getTime());
    
        // Use created_at (or swap to published_at if desired)
        qb.andWhere('post.created_at BETWEEN :start_date AND :end_date', {
          start_date: startUtc,
          end_date: endUtc,
        });
      }
    
      // Stable ordering for exports
      qb.orderBy('post.id', 'DESC');
    
      // We need raw to read post_view_count
      const { entities: posts, raw } = await qb.getRawAndEntities();
    
      // Map data (merge the computed views from raw)
      const mapData: DataPost[] = posts.map((post, idx) => {
        const views = Number(raw[idx]?.post_view_count ?? 0);
    
        return {
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
    
          // views now comes from the subquery alias
          viewsCount: views,
    
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
                name: this.getMemberName(
                  post.member.name,
                  post.member.mmid_fullname,
                  post.member.id
                ),
                email: post.member.email,
                profilePictureUrl: post.member.profilePictureUrl,
                userId: post.member.userId,
              }
            : null,
        };
      });
    
      const { buffer, filename } = await this.writeToExcel(mapData);
      return { buffer, filename };
    }
    
      
      

    

    async writeToExcel(data: any): Promise<{ buffer: Buffer; filename: string }> {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Post List');

        //add header for all fields, flattening nested objects
        worksheet.addRow([
            'Id', 'Title', 'Author', 'Space', 'Published At', 'Views Count', 'Reactions', 'Comments', 'Link'
        ]);

        for (const post of data) {
            worksheet.addRow([
              post.id,
              post.title,
              post.author ? post.author.name : '',
              post.space ? post.space.name : '',
              post.published_at,
              post.viewsCount,
              post.reactionsCount,
              post.totalRepliesCount,
              `https://mimate.mymitsubishiapps.com/posts/${post.id}`
            ]);
        }

        // @ts-ignore
        const buffer = await workbook.xlsx.writeBuffer() as Buffer;
        const filename = `post_list_${Date.now()}.xlsx`;
        
        return { buffer, filename };
    }




    // create post highlight
    async createPostHighlight(dto: CreatePostHighlightDto): Promise<PostEntity> {
        const { post_id, is_highlight } = dto;
        const post = await this.postRepository.findOne({ where: { id: post_id, isPsychoeducation: false },relations: ['member'] });
        if (!post) {
            throw new NotFoundException('Post not found');
        }   
        post.is_highlight = is_highlight;
        await this.postRepository.save(post);

        return post;
    }

    // hide post
    async hideShowPost(post_id: number, hide: boolean): Promise<boolean> {
        const post = await this.postRepository.findOne({ where: { id: post_id, isPsychoeducation: false } });
        if (!post) {
            throw new NotFoundException('Post not found');
        }

        post.isHidden = hide;
        await this.postRepository.save(post);
        return true;
    }


    // move post to space
    async movePostToSpace(post_id: number, space_id: number, userId: number): Promise<boolean> {
        const post = await this.postRepository.findOne({ where: { id: post_id, isPsychoeducation: false } });
        const space = await this.spaceRepository.findOne({ where: { id: space_id } });

        const user = await this.userRepository.findOne({ where: { id: userId } });

        if (!user || user.member_role !== 1) {
            throw new ForbiddenException('You are not authorized to move this post');
        }

        if (!post) {
            throw new NotFoundException('Post not found');
        }

        if (!space) {
            throw new NotFoundException('Space not found');
        }
        

        post.backup_space_id = space_id;
        await this.postRepository.save(post);
        return true;
    }   



    
}
