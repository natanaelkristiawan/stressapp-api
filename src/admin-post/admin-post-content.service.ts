import { youtubeIdFromUrl } from './youtube';
import { createHash } from 'crypto';
import { Activity } from '../entity/activity.entity';
import { Member } from '../entity/user-mimate.entity';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import sanitizeHtml = require('sanitize-html');
import { AssetsEntity } from '../entity/asset.entity';
import { PostEntity, PostType } from '../entity/post.entity';
import { CommentEntity } from '../entity/comment.entity';
import { UserAdmin } from '../entity/user-admin.entity';
import { ReactionEntity } from '../entity/reaction.entity';
import {
  PsychoeducationListDto,
  PsychoeducationCommentsDto,
  ModeratePsychoeducationCommentDto,
  SavePsychoeducationDto,
  UpdatePsychoeducationDto,
} from './dtos/psychoeducation.dto';

@Injectable()
export class AdminPostContentService {
  /** Uses the existing named datasource; content and interactions keep their original tables. */
  constructor(
    @InjectRepository(PostEntity, 'mimate')
    private readonly posts: Repository<PostEntity>,
  ) {}

  /** Maps explicit public CMS fields and server-owned counts without exposing author credentials. */
  private async response(post: PostEntity, manager = this.posts.manager) {
    const commentCount = await manager.getRepository(CommentEntity).count({
      where: { post: { id: post.id }, moderationStatus: 'approved' },
    });
    const likeCount = await manager
      .getRepository(ReactionEntity)
      .count({ where: { post: { id: post.id }, reaction: '+1' } });
    return {
      id: post.id,
      isPsychoeducation: true,
      contentType: post.contentType,
      title: post.title,
      description: post.description ?? '',
      body: post.contentType === 'article' ? post.textContent : null,
      thumbnailUrl: post.image ?? null,
      videoUrl: post.videoUrl ?? null,
      videoSource:
        post.contentType === 'video' ? post.videoSource ?? 'self' : null,
      youtubeId: post.youtubeId ?? null,
      status: post.status === 'PUBLISHED' ? 'published' : 'draft',
      revision: post.contentRevision,
      commentCount,
      likeCount,
      viewCount: post.viewsCount ?? 0,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      publishedAt: post.published_at ?? null,
    };
  }

  /** Returns a flag-scoped query so ordinary forum posts cannot be edited through this API. */
  private query(manager = this.posts.manager) {
    return manager
      .getRepository(PostEntity)
      .createQueryBuilder('post')
      .where('post.isPsychoeducation = :flag', { flag: true });
  }

  /** Lists content with stable ordering and all filters applied before pagination. */
  async list(input: PsychoeducationListDto) {
    const query = this.query();
    if (input.contentType) {
      query.andWhere('post.contentType = :contentType', {
        contentType: input.contentType,
      });
    }
    if (input.status) {
      query.andWhere('post.status = :status', {
        status: input.status.toUpperCase(),
      });
    }
    if (input.search?.trim()) {
      query.andWhere(
        '(LOWER(post.title) LIKE :search OR LOWER(post.description) LIKE :search)',
        { search: `%${input.search.trim().toLowerCase()}%` },
      );
    }
    const columns = {
      title: 'post.title',
      createdAt: 'post.created_at',
      updatedAt: 'post.updated_at',
      publishedAt: 'post.published_at',
    };
    query
      .orderBy(columns[input.sort], input.order === 'asc' ? 'ASC' : 'DESC')
      .addOrderBy('post.id', 'DESC');
    const [posts, total] = await query
      .skip((input.page - 1) * input.pageSize)
      .take(input.pageSize)
      .getManyAndCount();
    return {
      items: await Promise.all(posts.map((post) => this.response(post))),
      total,
      page: input.page,
      pageSize: input.pageSize,
    };
  }

  /** Loads one nondeleted educational post or deliberately returns 404. */
  async detail(id: number) {
    const post = await this.query().andWhere('post.id = :id', { id }).getOne();
    if (!post) {
      throw new NotFoundException('Content not found.');
    }
    return this.response(post);
  }

  /** Accepts only URLs produced by shared uploads owned by a CMS profile. No remote URL fetching occurs. */
  private async validateAsset(
    manager: EntityManager,
    url: string,
    type: 'Image' | 'Video',
  ) {
    const asset = await manager
      .getRepository(AssetsEntity)
      .createQueryBuilder('asset')
      .innerJoin(UserAdmin, 'admin', 'admin.backup_member_id = asset.memberId')
      .where('asset.url_open = :url AND asset.type = :type', { url, type })
      .getOne();
    if (!asset || !asset.path || !asset.contentType) {
      throw new BadRequestException(
        `Select an uploaded ${type.toLowerCase()} from the CMS uploader.`,
      );
    }
  }

  /** Sanitizes HTML using an allowlist and checks conditional content and upload references. */
  private async values(input: SavePsychoeducationDto, manager: EntityManager) {
    if (input.thumbnailUrl) {
      await this.validateAsset(manager, input.thumbnailUrl, 'Image');
    }
    let body: string | null = null;
    let videoUrl: string | null = null;
    let videoSource: 'self' | 'youtube' | null = null;
    let youtubeId: string | null = null;
    if (input.contentType === 'article') {
      if (input.videoUrl || input.youtubeUrl || input.videoSource) {
        throw new BadRequestException(
          'Articles cannot contain video source fields.',
        );
      }
      const imageUrls = new Set<string>();
      body = sanitizeHtml(input.body ?? '', {
        allowedTags: [
          'p',
          'br',
          'h2',
          'h3',
          'h4',
          'strong',
          'b',
          'em',
          'i',
          'u',
          's',
          'ul',
          'ol',
          'li',
          'blockquote',
          'a',
          'img',
        ],
        allowedAttributes: { a: ['href', 'title'], img: ['src', 'alt'] },
        allowedSchemes: ['https', 'http'],
        allowProtocolRelative: false,
        transformTags: {
          img: (tagName, attributes) => {
            if (attributes.src) {
              imageUrls.add(attributes.src);
            }
            return { tagName, attribs: attributes };
          },
        },
      }).trim();
      const text = sanitizeHtml(body, {
        allowedTags: [],
        allowedAttributes: {},
      })
        .replace(/&(?:nbsp|#160);/g, ' ')
        .trim();
      if (!text) {
        throw new BadRequestException('Article body must contain text.');
      }
      for (const url of imageUrls) {
        await this.validateAsset(manager, url, 'Image');
      }
    } else {
      if (input.body) {
        throw new BadRequestException('Videos cannot contain an article body.');
      }
      videoSource = input.videoSource ?? 'self';
      if (videoSource === 'youtube') {
        if (input.videoUrl) {
          throw new BadRequestException(
            'YouTube videos cannot contain an uploaded video URL.',
          );
        }
        youtubeId = youtubeIdFromUrl(input.youtubeUrl ?? '');
        if (!youtubeId) {
          throw new BadRequestException(
            'Enter a valid HTTPS YouTube video link.',
          );
        }
      } else {
        if (input.youtubeUrl) {
          throw new BadRequestException(
            'Self-hosted videos cannot contain a YouTube link.',
          );
        }
        if (!input.videoUrl) {
          throw new BadRequestException('Video URL is required.');
        }
        await this.validateAsset(manager, input.videoUrl, 'Video');
        videoUrl = input.videoUrl;
      }
    }
    return {
      title: input.title,
      description: input.description ?? '',
      contentType: input.contentType,
      textContent: body,
      videoUrl,
      videoSource,
      youtubeId,
      image: input.thumbnailUrl ?? null,
      status: input.status.toUpperCase(),
    };
  }

  /** Creates a flagged post with the authenticated admin's linked member as author. */
  async create(input: SavePsychoeducationDto, memberId: number) {
    return this.posts.manager.transaction(async (manager) => {
      const values = await this.values(input, manager);
      const post = manager.getRepository(PostEntity).create({
        ...values,
        isPsychoeducation: true,
        contentRevision: 1,
        member: { id: memberId },
        type: input.contentType === 'video' ? 'video' : 'image',
        post_type: PostType.Post,
        isHidden: false,
        reactionsCount: 0,
        repliesCount: 0,
        totalRepliesCount: 0,
        viewsCount: 0,
        published_at: input.status === 'published' ? new Date() : null,
      });
      await manager.save(post);
      return this.response(post, manager);
    });
  }

  /** Locks one flagged post and rejects stale edits without modifying forum posts. */
  private async editable(manager: EntityManager, id: number, revision: number) {
    const post = await this.query(manager)
      .andWhere('post.id = :id', { id })
      .setLock('pessimistic_write')
      .getOne();
    if (!post) {
      throw new NotFoundException('Content not found.');
    }
    if (post.contentRevision !== revision) {
      throw new ConflictException('Content changed. Reload before saving.');
    }
    return post;
  }

  /** Replaces content fields atomically; publication time records the most recent transition to published. */
  async update(id: number, input: UpdatePsychoeducationDto) {
    return this.posts.manager.transaction(async (manager) => {
      const post = await this.editable(manager, id, input.revision);
      const values = await this.values(input, manager);
      if (input.status === 'published' && post.status !== 'PUBLISHED') {
        post.published_at = new Date();
      }
      Object.assign(post, values);
      post.type = input.contentType === 'video' ? 'video' : 'image';
      post.contentRevision += 1;
      await manager.save(post);
      return this.response(post, manager);
    });
  }

  /** Soft-deletes only the content row after revision validation; files/interactions remain intact. */
  async remove(id: number, revision: number) {
    await this.posts.manager.transaction(async (manager) => {
      const post = await this.editable(manager, id, revision);
      await manager.softRemove(post);
    });
  }
  /** Derives an opaque revision from stored text/timestamps; no extra comment column is needed. */
  private commentVersion(comment: CommentEntity): string {
    return createHash('sha256')
      .update(
        JSON.stringify([comment.id, comment.description, comment.updated_at]),
      )
      .digest('hex');
  }

  /** Returns bounded flat comments/replies with only author display name and moderation metadata. */
  async comments(id: number, input: PsychoeducationCommentsDto) {
    const post = await this.query().andWhere('post.id = :id', { id }).getOne();
    if (!post) {
      throw new NotFoundException('Content not found.');
    }
    const [comments, total] = await this.posts.manager
      .getRepository(CommentEntity)
      .findAndCount({
        where: { post: { id } },
        relations: ['member'],
        order: { created_at: 'DESC', id: 'DESC' },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      });
    return {
      items: comments.map((comment) => ({
        id: comment.id,
        content: comment.description ?? '',
        authorName: comment.member?.name || 'Unavailable member',
        moderationStatus: comment.moderationStatus,
        parentId: comment.backup_comment_id ?? null,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at,
        version: this.commentVersion(comment),
      })),
      total,
      page: input.page,
      pageSize: input.pageSize,
    };
  }

  /** Soft-deletes one unchanged comment and records actor/reason atomically without copying its text. */
  async moderateComment(
    id: number,
    commentId: number,
    input: ModeratePsychoeducationCommentDto,
    actorId: number,
  ) {
    await this.posts.manager.transaction(async (manager) => {
      const post = await this.query(manager)
        .andWhere('post.id = :id', { id })
        .setLock('pessimistic_write')
        .getOne();
      if (!post) {
        throw new NotFoundException('Content not found.');
      }
      const repository = manager.getRepository(CommentEntity);
      const comment = await repository
        .createQueryBuilder('comment')
        .where(
          'comment.id = :commentId AND comment.backup_post_with_attribute_id = :id',
          { commentId, id },
        )
        .setLock('pessimistic_write')
        .getOne();
      if (!comment) {
        throw new NotFoundException('Comment not found.');
      }
      if (this.commentVersion(comment) !== input.version) {
        throw new ConflictException(
          'Comment changed. Reload before moderating.',
        );
      }
      await repository.softRemove(comment);
      // Keep other members' replies intact; only the reviewed text is removed.
      if (comment.backup_comment_id) {
        const repliesCount = await repository.count({
          where: { backup_comment_id: comment.backup_comment_id },
        });
        await repository.update(comment.backup_comment_id, { repliesCount });
      }
      post.totalRepliesCount = await repository.count({
        where: { post: { id }, moderationStatus: 'approved' },
      });
      post.repliesCount = await repository
        .createQueryBuilder('comment')
        .where(
          "comment.backup_post_with_attribute_id = :id AND comment.backup_comment_id IS NULL AND comment.moderationStatus = 'approved'",
          { id },
        )
        .getCount();
      await manager.save(post);
      const author = await manager
        .createQueryBuilder()
        .select('backup_member_id', 'id')
        .from(CommentEntity, 'comment')
        .withDeleted()
        .where('comment.id = :commentId', { commentId })
        .getRawOne<{ id: number | null }>();
      if (author?.id && !comment.commentId?.startsWith('member-content:')) {
        await manager
          .getRepository(Member)
          .createQueryBuilder()
          .update()
          .set({
            total_comments: () =>
              'GREATEST(COALESCE(total_comments, 0) - 1, 0)',
          })
          .where('id = :authorId', { authorId: author.id })
          .execute();
      }
      await manager.getRepository(Activity).save({
        userId: actorId,
        action: 'delete',
        postId: id,
        commentId,
        targetType: 'comment',
        source: 'cms-psychoeducation',
        message: 'SARA policy violation',
      });
    });
  }
}
