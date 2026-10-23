import { ModerationMessagesService } from '../content-moderation/moderation-messages.service';
import { violationType } from '../content-moderation/moderation-policy';
import { Interval } from '@nestjs/schedule';
import { Activity } from '../entity/activity.entity';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { PostEntity } from '../entity/post.entity';
import { CommentEntity } from '../entity/comment.entity';
import { ReactionEntity } from '../entity/reaction.entity';
import { ContentModerationService } from '../content-moderation/content-moderation.service';
import { ContentPageDto } from './member-content.dto';

export const COMMENT_QUEUE = 'psychoeducation-comments';
export type CommentJob = { id: number; revision: number };

@Injectable()
export class MemberContentService {
  constructor(
    @InjectRepository(PostEntity, 'mimate')
    private readonly posts: Repository<PostEntity>,
    @InjectQueue(COMMENT_QUEUE) private readonly queue: Queue<CommentJob>,
    private readonly moderation: ContentModerationService,
    private readonly messages: ModerationMessagesService,
  ) {}

  /** Limits every operation to visible educational content, including direct-ID requests. */
  private visible(manager = this.posts.manager) {
    return manager
      .getRepository(PostEntity)
      .createQueryBuilder('post')
      .where('post.isPsychoeducation = true')
      .andWhere('post.status = :status', { status: 'PUBLISHED' })
      .andWhere('(post.isHidden = false OR post.isHidden IS NULL)');
  }

  /** Rejects unpublished/deleted content before exposing or mutating interactions. */
  private async post(id: number, manager = this.posts.manager, lock = false) {
    const query = this.visible(manager).andWhere('post.id = :id', { id });
    if (lock) {
      query.setLock('pessimistic_write');
    }
    const post = await query.getOne();
    if (!post) {
      throw new NotFoundException('Konten tidak ditemukan.');
    }
    return post;
  }

  /** Validates a scoped stateless cursor and applies stable timestamp/ID keyset bounds. */
  private paginate<T extends { id?: number; created_at: Date }>(
    query: SelectQueryBuilder<T>,
    input: ContentPageDto,
    scope: string,
    alias: string,
  ) {
    if (input.after) {
      try {
        const cursor = JSON.parse(
          Buffer.from(input.after, 'base64url').toString('utf8'),
        );
        if (
          cursor.scope !== scope ||
          !Number.isSafeInteger(cursor.id) ||
          cursor.id < 1 ||
          typeof cursor.date !== 'string' ||
          new Date(cursor.date).toISOString() !== cursor.date
        ) {
          throw new Error('Invalid cursor');
        }
        query.andWhere(
          `(${alias}.created_at < :date OR (${alias}.created_at = :date AND ${alias}.id < :cursorId))`,
          { date: new Date(cursor.date), cursorId: cursor.id },
        );
      } catch {
        throw new BadRequestException('Cursor tidak valid.');
      }
    }
    return query
      .orderBy(`${alias}.created_at`, 'DESC')
      .addOrderBy(`${alias}.id`, 'DESC')
      .take(input.limit + 1);
  }

  /** Returns the next cursor only when another row exists; inserts never shift existing pages. */
  private page<T extends { id?: number; created_at: Date }>(
    rows: T[],
    limit: number,
    scope: string,
  ) {
    const hasNextPage = rows.length > limit;
    const items = rows.slice(0, limit);
    const last = items[items.length - 1];
    return {
      items,
      hasNextPage,
      nextAfter: hasNextPage
        ? Buffer.from(
            JSON.stringify({
              scope,
              id: last.id,
              date: last.created_at.toISOString(),
            }),
          ).toString('base64url')
        : null,
    };
  }

  /** Counts only published comments; pending/rejected text and member credentials never enter content responses. */
  private async response(
    post: PostEntity,
    memberId: number,
    detail = false,
    manager = this.posts.manager,
  ) {
    const likeCount = await manager
      .getRepository(ReactionEntity)
      .count({ where: { post: { id: post.id }, reaction: '+1' } });
    const liked = await manager.getRepository(ReactionEntity).exist({
      where: {
        post: { id: post.id },
        member: { id: memberId },
        reaction: '+1',
      },
    });
    const commentCount = await manager.getRepository(CommentEntity).count({
      where: { post: { id: post.id }, moderationStatus: 'approved' },
    });
    return {
      id: post.id,
      contentType: post.contentType,
      title: post.title,
      description: post.description ?? '',
      thumbnailUrl: post.image ?? null,
      body: detail ? post.textContent ?? null : null,
      videoSource:
        post.contentType === 'video' ? post.videoSource ?? 'self' : null,
      videoUrl: post.videoUrl ?? null,
      youtubeId: post.youtubeId ?? null,
      likeCount,
      liked,
      commentCount,
      viewCount: post.viewsCount ?? 0,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
    };
  }

  /** Lists published articles/videos using true after cursors and server-side search. */
  async list(input: ContentPageDto, memberId: number) {
    const scope = JSON.stringify([
      'content',
      input.type ?? '',
      input.search ?? '',
    ]);
    const query = this.visible();
    if (input.type) {
      query.andWhere('post.contentType = :type', { type: input.type });
    }
    if (input.search) {
      query.andWhere(
        '(post.title LIKE :search OR post.description LIKE :search)',
        { search: `%${input.search}%` },
      );
    }
    const page = this.page(
      await this.paginate(query, input, scope, 'post').getMany(),
      input.limit,
      scope,
    );
    return {
      ...page,
      items: await Promise.all(
        page.items.map((post) => this.response(post, memberId)),
      ),
    };
  }

  /** Rechecks visibility on detail reads rather than trusting list snapshots. */
  async detail(id: number, memberId: number) {
    return this.response(await this.post(id), memberId, true);
  }

  /** Maps comment text/status to its author or approved-public representation. */
  private commentResponse(comment: CommentEntity, memberId: number) {
    return {
      id: comment.id,
      content: comment.description,
      authorName: comment.member?.name ?? 'Anggota',
      isSelf: comment.member?.id === memberId,
      status: comment.moderationStatus,
      revision: comment.moderationRevision,
      moderationType:
        comment.member?.id === memberId &&
        comment.moderationStatus === 'rejected'
          ? violationType(comment.moderation ?? {})
          : null,
      moderationMessage:
        comment.member?.id === memberId &&
        comment.moderationStatus === 'rejected'
          ? comment.moderation?.notificationMessage ?? null
          : null,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
    };
  }

  /** Lists public approved comments plus the caller's own nonpublic submissions. */
  async comments(id: number, input: ContentPageDto, memberId: number) {
    await this.post(id);
    const scope = `comments:${id}:${memberId}`;
    const query = this.posts.manager
      .getRepository(CommentEntity)
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.member', 'member')
      .addSelect('comment.moderation')
      .where('comment.backup_post_with_attribute_id = :id', { id })
      .andWhere(
        '(comment.moderationStatus = :approved OR member.id = :memberId)',
        { approved: 'approved', memberId },
      );
    const page = this.page(
      await this.paginate(query, input, scope, 'comment').getMany(),
      input.limit,
      scope,
    );
    // Requeue pending submissions after enqueue outages or exhausted transient retries.
    void Promise.all(
      page.items
        .filter(
          (comment) =>
            comment.member?.id === memberId &&
            comment.moderationStatus === 'pending',
        )
        .map((comment) => this.enqueue(comment)),
    );
    return {
      ...page,
      items: page.items.map((comment) =>
        this.commentResponse(comment, memberId),
      ),
    };
  }

  /** Enqueues IDs/revisions only; queue outages leave durable pending rows for later recovery. */
  private async enqueue(comment: CommentEntity) {
    try {
      await this.queue.add(
        'moderate-comment',
        { id: comment.id, revision: comment.moderationRevision },
        {
          jobId: `comment-${comment.id}-${comment.moderationRevision}`,
          attempts: 8,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
    } catch {
      /* The pending row is retried on the author's next comment refresh. */
    }
  }

  /** Repairs enqueue outages and exhausted transient retries without depending on a member refresh. */
  @Interval(60000)
  async recoverPending() {
    const comments = await this.posts.manager
      .getRepository(CommentEntity)
      .find({
        where: { moderationStatus: 'pending' },
        order: { updated_at: 'ASC', id: 'ASC' },
        take: 100,
      });
    await Promise.all(comments.map((comment) => this.enqueue(comment)));
  }

  /** Saves first, returns pending immediately, then moderates asynchronously without forum reward side effects. */
  async saveComment(
    id: number,
    memberId: number,
    content: string,
    commentId?: number,
    requestId?: string,
  ) {
    if (!requestId || !/^[A-Za-z0-9_-]{16,80}$/.test(requestId)) {
      throw new BadRequestException('Request ID tidak valid.');
    }
    const saved = await this.posts.manager.transaction(async (manager) => {
      await this.post(id, manager, true);
      const repo = manager.getRepository(CommentEntity);
      const replay = await manager.getRepository(Activity).findOneBy({
        userId: memberId,
        postId: id,
        action: 'comment-submit',
        message: requestId,
      });
      if (replay) {
        const previous = await repo
          .createQueryBuilder('comment')
          .addSelect('comment.moderation')
          .leftJoinAndSelect('comment.member', 'member')
          .where('comment.id = :id', { id: replay.commentId })
          .getOne();
        if (!previous) {
          throw new NotFoundException('Komentar tidak ditemukan.');
        }
        if (
          previous.description !== content ||
          (commentId && previous.id !== commentId)
        ) {
          throw new ConflictException('Request ID already used.');
        }
        return previous;
      }
      const comment = commentId
        ? await repo.findOne({
            where: { id: commentId, post: { id }, member: { id: memberId } },
            lock: { mode: 'pessimistic_write' },
          })
        : repo.create({
            post: { id },
            member: { id: memberId },
            repliesCount: 0,
            commentId: 'member-content:' + requestId,
          });
      if (!comment) {
        throw new NotFoundException('Komentar tidak ditemukan.');
      }
      comment.description = content;
      comment.moderationStatus = 'pending';
      comment.moderationRevision = (comment.moderationRevision ?? 0) + 1;
      comment.moderation = null;
      await repo.save(comment);
      await manager.getRepository(Activity).save({
        userId: memberId,
        postId: id,
        commentId: comment.id,
        action: 'comment-submit',
        targetType: 'comment',
        source: 'member-psychoeducation',
        message: requestId,
      });
      await this.recount(id, manager);
      return repo.findOne({ where: { id: comment.id }, relations: ['member'] });
    });
    void this.enqueue(saved);
    return this.commentResponse(saved, memberId);
  }

  /** Publishes only the exact reviewed revision; edits/deletes/admin moderation cannot be overwritten by old jobs. */
  async moderateComment(job: CommentJob) {
    const repo = this.posts.manager.getRepository(CommentEntity);
    const original = await repo.findOne({
      where: { id: job.id },
      relations: ['post'],
    });
    if (
      !original ||
      original.moderationStatus !== 'pending' ||
      original.moderationRevision !== job.revision
    ) {
      return;
    }
    const result = await this.moderation.classify(original.description);
    if (result.action === 'pending') {
      throw new Error('Comment moderation pending');
    }
    const notificationMessage = await this.messages.forResult(result);
    await this.posts.manager.transaction(async (manager) => {
      // Lock the post before its comment, matching CMS moderation and member writes.
      const post = await manager.getRepository(PostEntity).findOne({
        where: { id: original.post.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!post) {
        return;
      }
      const comment = await manager.getRepository(CommentEntity).findOne({
        where: { id: job.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !comment ||
        comment.moderationStatus !== 'pending' ||
        comment.moderationRevision !== job.revision
      ) {
        return;
      }
      comment.moderation = {
        ...result,
        notificationMessage: notificationMessage ?? undefined,
      };
      comment.moderationStatus =
        result.action === 'publish' ? 'approved' : 'rejected';
      await manager.getRepository(CommentEntity).save(comment);
      await this.recount(post.id, manager);
    });
  }

  /** Keeps the existing post comment counter aligned with approved, nondeleted rows. */
  private async recount(id: number, manager: EntityManager) {
    const count = await manager
      .getRepository(CommentEntity)
      .count({ where: { post: { id }, moderationStatus: 'approved' } });
    await manager
      .getRepository(PostEntity)
      .update(id, { totalRepliesCount: count, repliesCount: count });
  }

  /** Soft deletes only the caller's own comment. */
  async deleteComment(id: number, commentId: number, memberId: number) {
    await this.posts.manager.transaction(async (manager) => {
      await this.post(id, manager, true);
      const result = await manager
        .getRepository(CommentEntity)
        .softDelete({ id: commentId, post: { id }, member: { id: memberId } });
      if (!result.affected) {
        throw new NotFoundException('Komentar tidak ditemukan.');
      }
      await this.recount(id, manager);
    });
    return { deleted: true };
  }

  /** Counts each distinct detail opening atomically; the same event retry never increments twice. */
  async view(id: number, memberId: number, requestId: string) {
    return this.posts.manager.transaction(async (manager) => {
      const post = await this.post(id, manager, true);
      const events = manager.getRepository(Activity);
      const where = {
        userId: memberId,
        postId: id,
        action: 'content-view',
        message: requestId,
      };
      if (!(await events.exist({ where }))) {
        await events.save({
          ...where,
          targetType: 'post',
          source: 'member-psychoeducation',
        });
        post.viewsCount = (post.viewsCount ?? 0) + 1;
        await manager.getRepository(PostEntity).save(post);
      }
      return this.response(post, memberId, true, manager);
    });
  }

  /** Serializes like/unlike on the existing post row so retries cannot create duplicate reactions. */
  async like(id: number, memberId: number, liked: boolean) {
    return this.posts.manager.transaction(async (manager) => {
      const post = await this.post(id, manager, true);
      const repo = manager.getRepository(ReactionEntity);
      const where = { post: { id }, member: { id: memberId }, reaction: '+1' };
      if (liked) {
        if (!(await repo.exist({ where }))) {
          await repo.save(repo.create(where));
        }
      } else {
        await repo.delete(where);
      }
      return this.response(post, memberId, true, manager);
    });
  }
}
