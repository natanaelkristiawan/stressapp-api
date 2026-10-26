import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { PostEntity } from 'src/entity/post.entity';
import { ReactionEntity } from 'src/entity/reaction.entity';
import { SpaceEntity } from 'src/entity/space.entity';
import { ReportReason } from 'src/entity/post-report.entity';
import { PostService } from 'src/post/post.service';
import { SpaceService } from 'src/space/space.service';
import { CommentService } from 'src/comment/comment.service';
import { ReactionService } from 'src/reaction/reaction.service';
import { PostReportService } from 'src/post-report/post-report.service';
import {
  CreateMemberForumCommentDto,
  CreateMemberForumPostDto,
  MemberForumFeedQueryDto,
  ReportMemberForumPostDto,
} from './dtos/member-forum.dto';
import { Post as PostDto } from 'src/post/interfaces/post.interface';

export interface FormattedForumPost {
  id: string;
  postId: number;
  title: string;
  caption: string;
  image: string;
  author: string;
  authorId: number;
  avatarUrl: string;
  own: boolean;
  photo: boolean;
  audio: boolean;
  likes: number;
  liked: boolean;
  repliesCount: number;
  communityId: string | null;
  communityName: string | null;
  createdAt: string;
  shareUrl: string;
}

export interface FormattedForumComment {
  id: string;
  commentId: number;
  postId: number;
  author: string;
  authorId: number;
  avatarUrl: string;
  content: string;
  createdAt: string;
  parentId: number | null;
  own: boolean;
  replies?: FormattedForumComment[];
}

export interface FormattedCommunity {
  id: string;
  spaceId: number;
  name: string;
  description: string;
  image: string;
  banner: string;
  members: number;
  postsCount: number;
  joined: boolean;
}

function parseReportReason(input: string): ReportReason {
  const normalized = input.trim().toLowerCase();
  switch (normalized) {
    case 'misleading':
    case 'konten menyesatkan':
      return ReportReason.MISLEADING;
    case 'scam':
    case 'penipuan':
      return ReportReason.SCAM;
    case 'offensive':
    case 'konten menyinggung':
      return ReportReason.OFFENSIVE;
    case 'spam':
      return ReportReason.SPAM;
    case 'violent':
    case 'kekerasan':
      return ReportReason.VIOLENT;
    case 'abused':
    case 'pelecehan':
      return ReportReason.ABUSED;
    default:
      return ReportReason.OTHER;
  }
}

@Injectable()
export class MemberForumService {
  constructor(
    @InjectRepository(PostEntity, 'mimate')
    private readonly postRepository: Repository<PostEntity>,
    @InjectRepository(ReactionEntity, 'mimate')
    private readonly reactionRepository: Repository<ReactionEntity>,
    @InjectRepository(SpaceEntity, 'mimate')
    private readonly spaceRepository: Repository<SpaceEntity>,
    private readonly postService: PostService,
    private readonly spaceService: SpaceService,
    private readonly commentService: CommentService,
    private readonly reactionService: ReactionService,
    private readonly postReportService: PostReportService,
  ) {}

  /** Formats raw post DTO from PostService into mobile forum schema contract. */
  private formatPost(post: PostDto, memberId: number): FormattedForumPost {
    const isLiked = Boolean(post.reaction?.some((r) => r.reacted) || false);

    const hasPhoto = Boolean(
      post.image || (post.medias && post.medias.length > 0),
    );

    const anonymous = post.member?.name === 'Anonim';

    return {
      id: String(post.id),
      postId: post.id,
      title: post.title || '',
      caption: post.textContent || post.description || '',
      image: post.image || (post.medias?.[0]?.url ?? ''),
      author: post.member?.name || 'Anonim',
      authorId: anonymous ? 0 : post.member?.id ?? 0,
      avatarUrl: anonymous ? '' : post.member?.profilePictureUrl || '',
      own: Boolean(post.is_post_owner || post.member?.id === memberId),
      photo: hasPhoto,
      audio: post.type === 'audio',
      likes: post.reactionCount ?? 0,
      liked: isLiked,
      repliesCount: post.totalRepliesCount ?? post.repliesCount ?? 0,
      communityId: post.space?.id ? String(post.space.id) : null,
      communityName: post.space?.name ?? null,
      createdAt: post.created_at || '',
      shareUrl: post.share_url || '',
    };
  }

  private async requireVisiblePost(postId: number): Promise<PostEntity> {
    const post = await this.postRepository.findOne({
      where: {
        id: postId,
        isPsychoeducation: false,
        isHidden: false,
        status: 'PUBLISHED',
      },
      relations: ['member'],
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    return post;
  }

  private async requireOwner(postId: number, memberId: number): Promise<void> {
    const post = await this.requireVisiblePost(postId);
    if (post.member?.id !== memberId) {
      throw new ForbiddenException('You are not the owner of this post');
    }
  }

  private async requireCommunity(spaceId: number): Promise<void> {
    const space = await this.spaceRepository.findOne({
      where: { id: spaceId, hidden: 0, inviteOnly: 0, backup_space_id: Not(0) },
    });
    if (!space) {
      throw new NotFoundException('Community not found');
    }
  }

  /** Retrieves paginated forum posts by tab ("untuk-anda", "following", "komunitas", "mine"). */
  async getFeed(
    query: MemberForumFeedQueryDto,
    memberId: number,
  ): Promise<{
    items: FormattedForumPost[];
    hasNext: boolean;
    after: string;
    totalData: number;
  }> {
    const tab = query.tab || 'untuk-anda';
    if (tab === 'komunitas') {
      if (!query.spaceId) {
        throw new BadRequestException('Community ID is required');
      }
      await this.requireCommunity(query.spaceId);
    }
    const limit = query.limit || 15;
    const after = query.after || '';
    const order = query.order;

    let result;
    if (tab === 'komunitas') {
      result = await this.postService.collectPosts(
        'space',
        limit,
        after,
        query.spaceId,
        order,
        memberId,
      );
    } else if (tab === 'mine') {
      result = await this.postService.collectPosts(
        'member',
        limit,
        after,
        memberId,
        order,
        memberId,
      );
    } else {
      result = await this.postService.collectPosts(
        'following',
        limit,
        after,
        undefined,
        order,
        memberId,
      );
    }

    const items = (result.data || []).map((post) =>
      this.formatPost(post, memberId),
    );

    return {
      items,
      hasNext: Boolean(result.hasNext),
      after: result.after || '',
      totalData: result.totalData || items.length,
    };
  }

  /** Loads detail for a single forum post. */
  async getPostDetail(
    postId: number,
    memberId: number,
  ): Promise<FormattedForumPost> {
    await this.requireVisiblePost(postId);
    const post = await this.postService.detailPost(postId, memberId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    return this.formatPost(post, memberId);
  }

  /** Creates a new forum post on behalf of the authenticated member. */
  async createPost(
    dto: CreateMemberForumPostDto,
    memberId: number,
  ): Promise<FormattedForumPost> {
    if (dto.spaceId) {
      await this.requireCommunity(dto.spaceId);
    }
    const created = await this.postService.createPost(
      {
        title: dto.title.trim(),
        content: dto.caption.trim(),
        spaceId: dto.spaceId,
        image: dto.image,
        is_anonymous: Boolean(dto.anonymous),
      },
      memberId,
      memberId,
    );

    return this.formatPost(created, memberId);
  }

  async updatePost(
    postId: number,
    dto: CreateMemberForumPostDto,
    memberId: number,
  ): Promise<FormattedForumPost> {
    await this.requireOwner(postId, memberId);
    if (dto.spaceId) {
      await this.requireCommunity(dto.spaceId);
    }
    const post = await this.postService.updatePost(
      postId,
      {
        title: dto.title.trim(),
        content: dto.caption.trim(),
        spaceId: dto.spaceId,
        image: dto.image,
        is_anonymous: dto.anonymous,
      },
      memberId,
      memberId,
    );
    return this.formatPost(post, memberId);
  }

  /** Deletes an owned forum post. */
  async deletePost(postId: number, memberId: number): Promise<boolean> {
    await this.requireOwner(postId, memberId);
    const result = await this.postService.deletePost(postId, memberId);
    return Boolean(result);
  }

  /** Toggles reaction (like) on a forum post. Returns updated reaction state and total likes. */
  async toggleReaction(
    postId: number,
    memberId: number,
    reactionType = 'heart',
  ): Promise<{ reacted: boolean; likes: number }> {
    await this.requireVisiblePost(postId);
    const existing = await this.reactionRepository.findOne({
      where: {
        post: { id: postId },
        member: { id: memberId },
      },
    });

    if (existing) {
      await this.reactionService.deleteReaction(memberId, postId);
    } else {
      await this.reactionService.createReaction(postId, reactionType, memberId);
    }

    const updatedPost = await this.postRepository.findOne({
      where: { id: postId },
    });

    return {
      reacted: !existing,
      likes: updatedPost?.reactionsCount ?? 0,
    };
  }

  /** Loads top-level and nested comments for a forum post. */
  async getComments(
    postId: number,
    memberId: number,
    limit = 15,
    after = '',
  ): Promise<{
    items: FormattedForumComment[];
    hasNext: boolean;
    after: string;
    totalData: number;
  }> {
    await this.requireVisiblePost(postId);
    const result = await this.commentService.getComments(
      postId,
      limit,
      after,
      memberId,
    );

    const items: FormattedForumComment[] = (result.data || []).map((c) => ({
      id: String(c.id),
      commentId: c.id,
      postId,
      author: c.member?.name || 'User',
      authorId: c.member?.id ?? 0,
      avatarUrl: c.member?.profilePictureUrl || '',
      content: c.description || c.title || '',
      createdAt: c.published_at ? new Date(c.published_at).toISOString() : '',
      parentId: c.parent_id ? Number(c.parent_id) : null,
      own: c.member?.id === memberId,
      replies: (c.comments || []).map((reply) => ({
        id: String(reply.id),
        commentId: reply.id,
        postId,
        author: reply.member?.name || 'User',
        authorId: reply.member?.id ?? 0,
        avatarUrl: reply.member?.profilePictureUrl || '',
        content: reply.description || reply.title || '',
        createdAt: reply.published_at
          ? new Date(reply.published_at).toISOString()
          : '',
        parentId: c.id,
        own: reply.member?.id === memberId,
      })),
    }));

    return {
      items,
      hasNext: Boolean(result.hasNext),
      after: result.after || '',
      totalData: result.totalData || items.length,
    };
  }

  /** Posts a comment or reply to a forum post. */
  async createComment(
    postId: number,
    memberId: number,
    dto: CreateMemberForumCommentDto,
  ): Promise<FormattedForumComment> {
    await this.requireVisiblePost(postId);
    const created = await this.commentService.createComment(
      {
        post_id: postId,
        comment_id: dto.commentId,
        content: dto.content.trim(),
      },
      memberId,
      false,
    );

    return {
      id: String(created.id),
      commentId: created.id,
      postId,
      author: created.member?.name || 'Anda',
      authorId: created.member?.id ?? memberId,
      avatarUrl: created.member?.profilePictureUrl || '',
      content: created.description || created.title || '',
      createdAt: created.published_at
        ? new Date(created.published_at).toISOString()
        : new Date().toISOString(),
      parentId: created.parent_id ? Number(created.parent_id) : null,
      own: true,
      replies: [],
    };
  }

  /** Deletes an owned forum comment. */
  async deleteComment(commentId: number, memberId: number): Promise<boolean> {
    const comment = await this.commentService.getCommentById(commentId);
    if (comment.post?.isPsychoeducation || comment.member?.id !== memberId) {
      throw new ForbiddenException(
        'You are not the owner of this forum comment',
      );
    }
    return await this.commentService.deleteComment(memberId, comment);
  }

  /** Lists all forum communities with the member's joined status. */
  async getCommunities(memberId: number): Promise<FormattedCommunity[]> {
    const spaces = await this.spaceService.getHomeSpaces(memberId);
    return spaces.map((s) => ({
      id: String(s.id),
      spaceId: s.id,
      name: s.name,
      description: s.description || '',
      image: s.image || '',
      banner: s.banner || '',
      members: s.membersCount || 0,
      postsCount: s.postsCount || 0,
      joined: Boolean(s.following),
    }));
  }

  /** Loads detail for a specific community. */
  async getCommunityDetail(
    spaceId: number,
    memberId: number,
  ): Promise<FormattedCommunity> {
    await this.requireCommunity(spaceId);
    const s = await this.spaceService.detailSpace(spaceId, memberId);
    if (!s) {
      throw new NotFoundException('Community not found');
    }
    return {
      id: String(s.id),
      spaceId: s.id,
      name: s.name,
      description: s.description || '',
      image: s.image || '',
      banner: s.banner || '',
      members: s.membersCount || 0,
      postsCount: s.postsCount || 0,
      joined: Boolean(s.following),
    };
  }

  /** Joins/follows a community space. */
  async joinCommunity(spaceId: number, memberId: number): Promise<boolean> {
    await this.requireCommunity(spaceId);
    await this.spaceService.follow(spaceId, memberId);
    return true;
  }

  /** Leaves/unfollows a community space. */
  async leaveCommunity(spaceId: number, memberId: number): Promise<boolean> {
    await this.requireCommunity(spaceId);
    await this.spaceService.unfollow(spaceId, memberId);
    return true;
  }

  /** Reports an inappropriate forum post. */
  async reportPost(
    postId: number,
    dto: ReportMemberForumPostDto,
    memberId: number,
  ): Promise<boolean> {
    await this.requireVisiblePost(postId);
    await this.postReportService.createPostReport(
      {
        postId,
        reason: parseReportReason(dto.reason),
        description: dto.description || '',
      },
      memberId,
    );
    return true;
  }
}
