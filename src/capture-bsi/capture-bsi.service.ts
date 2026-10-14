import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReactionEntity } from 'src/entity/reaction.entity';
import { ReactionListDto } from './dtos/reaction.dto';
import { DatatableReaction, PostBrief, ReactionItem, Author } from './interfaces/reaction.interface';
import { CommentEntity } from 'src/entity/comment.entity';
import { CommentListDto } from './dtos/comment.dto';
import { CommentItem, DatatableComment } from './interfaces/comment.interface';
import { SpaceEntity } from 'src/entity/space.entity';
import { PostEntity } from 'src/entity/post.entity';
import { UserMimateEntity } from 'src/entity/user-mimate.entity';
import { TagsEntity } from 'src/entity/tags.entity';
import { PostTagsEntity } from 'src/entity/post-tags.entity';
import { DataPost, Datatable, Tag } from 'src/admin-post/interfaces/datatable.interface';

@Injectable()
export class CaptureBsiService {

    constructor(
        @InjectRepository(ReactionEntity, 'mimate')
        private readonly reactionRepository: Repository<ReactionEntity>,
        @InjectRepository(CommentEntity, 'mimate')
        private readonly commentRepository: Repository<CommentEntity>,
        @InjectRepository(PostEntity, 'mimate')
        private readonly postRepository: Repository<PostEntity>,
        @InjectRepository(TagsEntity, 'mimate')
        private readonly tagRepository: Repository<TagsEntity>,
    ) {}

    /**
     * Get posts with most reactions, optional date range on published_at, optional limit, optional filter by tag.
     * When date range is not set, returns all matching posts (up to limit).
     */
    async getPostsWithMostReactions(
      limit: number = 10,
      start_date?: Date,
      end_date?: Date,
      tag?: string,
    ): Promise<Datatable> {
      let tagId: number | undefined;
      if (tag) {
        const tagEntity = await this.tagRepository.findOne({ where: { slug: tag } });
        if (!tagEntity) {
          return { items: [], recordsTotal: 0, recordsFiltered: 0 };
        }
        tagId = tagEntity.id;
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
        .where('post.deleted_at IS NULL');

      if (tagId != null) {
        qb.innerJoin(PostTagsEntity, 'post_tags', 'post_tags.backup_post_id = post.id')
          .andWhere('post_tags.backup_tag_id = :tagId', { tagId });
      }

      if (start_date && end_date) {
        const startLocal = new Date(start_date);
        startLocal.setHours(0, 0, 0, 0);
        const endLocal = new Date(end_date);
        endLocal.setHours(23, 59, 59, 999);
        const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;
        const startUtc = new Date(startLocal.getTime() - TZ_OFFSET_MS);
        const endUtc = new Date(endLocal.getTime() - TZ_OFFSET_MS);
        qb.andWhere('post.published_at BETWEEN :start_date AND :end_date', {
          start_date: startUtc,
          end_date: endUtc,
        });
      }

      qb.orderBy('post.reactionsCount', 'DESC').take(limit);

      const { entities: posts, raw } = await qb.getRawAndEntities();

      const items: DataPost[] = posts.map((post, idx) => {
        const views = Number(raw[idx]?.post_view_count ?? 0);
        const tags = this.parsePostTags(post.tags);
        return {
          id: post.id!,
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
          isHidden: post.isHidden ?? false,
          post_type: post.post_type ?? 'post',
          vote_start: post.vote_start,
          vote_end: post.vote_end,
          total_vote: post.total_vote,
          viewsCount: views,
          tags,
          space: post.space
            ? { id: post.space.id, name: post.space.name, description: post.space.description }
            : undefined,
          author: post.member
            ? {
                id: post.member.id!,
                name: this.getMemberName(post.member.name ?? '', post.member.mmid_fullname ?? '', post.member.id!),
                email: post.member.email,
                profilePictureUrl: post.member.profilePictureUrl,
                userId: post.member.userId,
              }
            : undefined,
        };
      });

      return {
        items,
        recordsTotal: items.length,
        recordsFiltered: items.length,
      };
    }

    async getReactionList(dto: ReactionListDto): Promise<DatatableReaction> {
        const { page, limit, sort = 'created_at', order = 'desc', post_id, member_id, reaction, start_date, end_date } = dto;

        const qb = this.reactionRepository.createQueryBuilder('reaction')
            .leftJoinAndSelect('reaction.post', 'post')
            .leftJoinAndSelect('reaction.member', 'member');

        if (post_id) {
            qb.andWhere('post.id = :post_id', { post_id });
        }

        if (member_id) {
            qb.andWhere('member.id = :member_id', { member_id });
        }

        if (reaction && reaction !== 'all') {
            qb.andWhere('reaction.reaction = :reaction', { reaction });
        }

        if (start_date && end_date) {
            const { start, end } = this.normalizeDateRange(start_date, end_date);
            if (start && end) {
                qb.andWhere('reaction.created_at BETWEEN :startDate AND :endDate', { startDate: start, endDate: end });
            }
        }

        const countQb = qb.clone();
        const recordsFiltered = await countQb.getCount();

        qb.orderBy(`reaction.${sort}`, order.toUpperCase() as 'ASC' | 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        const items = await qb.getMany();

        const mapped: ReactionItem[] = items.map((i) => {
            const post = i.post as any;
            const postBrief: PostBrief | undefined = post ? {
                id: post.id,
                backup_member_id: post.backup_member_id,
                backup_space_id: post.backup_space_id,
                title: post.title,
                description: post.description,
                image: post.image,
                status: post.status,
            } : undefined;

            const author: Author | undefined = i.member ? {
                id: i.member.id,
                name: this.getMemberName(i.member.name, i.member.mmid_fullname, i.member.id),
                email: i.member.email,
                profilePictureUrl: i.member.profilePictureUrl || '',
                userId: i.member.userId,
            } : undefined;

            return {
                id: i.id!,
                reaction: i.reaction,
                reactionId: i.reactionId,
                name: i.name,
                post: postBrief,
                author: author,
                created_at: this.addTimezoneOffset(i.created_at),
                updated_at: this.addTimezoneOffset(i.updated_at),
            };
        });

        return {
            items: mapped,
            recordsTotal: recordsFiltered,
            recordsFiltered: recordsFiltered,
        };
    }




    async getCommentList(dto: CommentListDto): Promise<DatatableComment> {
        const { page, limit, sort = 'created_at', order = 'desc', post_id, member_id, parent_id, start_date, end_date } = dto;

        const qb = this.commentRepository.createQueryBuilder('comment')
            .leftJoinAndSelect('comment.post', 'post')
            .leftJoinAndSelect('comment.member', 'member')
            .leftJoinAndSelect('comment.parent', 'parent');

        if (post_id) {
            qb.andWhere('post.id = :post_id', { post_id });
        }

        if (member_id) {
            qb.andWhere('member.id = :member_id', { member_id });
        }

        if (parent_id !== undefined) {
            if (parent_id === 0) {
                qb.andWhere('comment.parent IS NULL');
            } else {
                qb.andWhere('parent.id = :parent_id', { parent_id });
            }
        }

        if (start_date && end_date) {
            const { start, end } = this.normalizeDateRange(start_date, end_date);
            if (start && end) {
                qb.andWhere('comment.created_at BETWEEN :startDate AND :endDate', { startDate: start, endDate: end });
            }
        }

        const countQb = qb.clone();
        const recordsFiltered = await countQb.getCount();

        qb.orderBy(`comment.${sort}`, order.toUpperCase() as 'ASC' | 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        const items = await qb.getMany();

        const mapped: CommentItem[] = items.map((i) => {
            const post = i.post as any;
            const postBrief: PostBrief | undefined = post ? {
                id: post.id,
                backup_member_id: post.backup_member_id,
                backup_space_id: post.backup_space_id,
                title: post.title,
                description: post.description,
                image: post.image,
                status: post.status,
            } : undefined;

            const author: Author | undefined = i.member ? {
                id: i.member.id,
                name: this.getMemberName(i.member.name, i.member.mmid_fullname, i.member.id),
                email: i.member.email,
                profilePictureUrl: i.member.profilePictureUrl || '',
                userId: i.member.userId,
            } : undefined;

            const parentAuthor: Author | undefined = i.parent?.member ? {
                id: i.parent.member.id,
                name: this.getMemberName(i.parent.member.name, i.parent.member.mmid_fullname, i.parent.member.id),
                email: i.parent.member.email,
                profilePictureUrl: i.parent.member.profilePictureUrl || '',
                userId: i.parent.member.userId,
            } : undefined;

            return {
                id: i.id!,
                commentId: i.commentId,
                title: i.title,
                description: i.description,
                externalId: i.externalId,
                repliesCount: i.repliesCount,
                created_at: this.addTimezoneOffset(i.created_at),
                updated_at: this.addTimezoneOffset(i.updated_at),
                parent: i.parent ? {
                    id: i.parent.id!,
                    commentId: i.parent.commentId,
                    title: i.parent.title,
                    description: i.parent.description,
                    externalId: i.parent.externalId,
                    repliesCount: i.parent.repliesCount,
                    created_at: this.addTimezoneOffset(i.parent.created_at),
                    updated_at: this.addTimezoneOffset(i.parent.updated_at),
                    parent: null,
                    post: postBrief!,
                    author: parentAuthor,
                } : null,
                post: postBrief!,
                author: author,
            };
        });

        return {
            items: mapped,
            recordsTotal: recordsFiltered,
            recordsFiltered: recordsFiltered,
        };
    }

    

    protected normalizeDateRange(
        start_date?: Date,
        end_date?: Date
      ): { start?: Date; end?: Date } {
        if (!start_date || !end_date) return {};


        const TZ_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8
      
        const startDate = new Date(start_date);
        startDate.setHours(0, 0, 0, 0);
      
        const endDate = new Date(end_date);
        endDate.setHours(23, 59, 59, 999);


        const start = endDate ? new Date(endDate.getTime() - TZ_OFFSET_MS) : undefined;
        const end   = endDate   ? new Date(endDate.getTime()   - TZ_OFFSET_MS) : undefined;
      
        return { start, end };
    }

    private addTimezoneOffset(date: Date): Date {
        const TZ_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8
        return new Date(date.getTime() + TZ_OFFSET_MS);
    }
    

    private getMemberName(name: string, mmid_fullname: string, id: number): string {
        const trimmedName = (name ?? '').trim();
        const trimmedFullname = (mmid_fullname ?? '').trim();
        if (trimmedName) return trimmedName;
        if (trimmedFullname) return trimmedFullname;
        const paddedId = id != null ? String(id).padStart(4, '0') : '0000';
        return `user_${paddedId}`;
    }

    /** Parse post.tags JSON string into Tag[] for response */
    private parsePostTags(tagsJson: string | null | undefined): Tag[] {
        if (tagsJson == null || typeof tagsJson !== 'string') return [];
        try {
            const list = JSON.parse(tagsJson);
            if (!Array.isArray(list)) return [];
            return list.map((item: any) => ({
                id: item?.id,
                slug: item?.slug ?? '',
                title: item?.title ?? '',
            }));
        } catch {
            return [];
        }
    }
}
