import 'reflect-metadata';
import { MemberForumService } from './member-forum.service';
import { ReportReason } from 'src/entity/post-report.entity';

describe('MemberForumService', () => {
  let service: MemberForumService;
  let postRepo: any;
  let reactionRepo: any;
  let spaceRepo: any;
  let postService: any;
  let spaceService: any;
  let commentService: any;
  let reactionService: any;
  let postReportService: any;

  beforeEach(() => {
    postRepo = {
      findOne: jest.fn(),
    };
    reactionRepo = {
      findOne: jest.fn(),
    };
    spaceRepo = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
    };
    postService = {
      collectPosts: jest.fn(),
      detailPost: jest.fn(),
      createPost: jest.fn(),
      deletePost: jest.fn(),
    };
    spaceService = {
      getHomeSpaces: jest.fn(),
      detailSpace: jest.fn(),
      follow: jest.fn(),
      unfollow: jest.fn(),
    };
    commentService = {
      getComments: jest.fn(),
      createComment: jest.fn(),
      getCommentById: jest.fn(),
      deleteComment: jest.fn(),
    };
    reactionService = {
      createReaction: jest.fn(),
      deleteReaction: jest.fn(),
    };
    postReportService = {
      createPostReport: jest.fn(),
    };

    service = new MemberForumService(
      postRepo,
      reactionRepo,
      spaceRepo,
      postService,
      spaceService,
      commentService,
      reactionService,
      postReportService,
    );
  });

  describe('getFeed', () => {
    it('calls collectPosts with mode latest for default untuk-anda tab', async () => {
      postService.collectPosts.mockResolvedValue({
        data: [
          {
            id: 101,
            title: 'Sample Post',
            textContent: 'Content body',
            member: { id: 1, name: 'Alice', profilePictureUrl: 'https://pic.jpg' },
            reactionCount: 5,
            reaction: [{ reacted: true }],
            space: { id: 7, name: 'Warga MiMate' },
            totalRepliesCount: 3,
            created_at: '2026-10-26T10:00:00.000Z',
          },
        ],
        hasNext: false,
        after: 'next-cursor',
        totalData: 1,
      });

      const result = await service.getFeed({ tab: 'untuk-anda', limit: 10 }, 1);

      expect(postService.collectPosts).toHaveBeenCalledWith(
        'latest',
        10,
        '',
        undefined,
        undefined,
        1,
      );
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        id: '101',
        postId: 101,
        title: 'Sample Post',
        caption: 'Content body',
        author: 'Alice',
        own: true,
        liked: true,
        likes: 5,
        repliesCount: 3,
        communityName: 'Warga MiMate',
      });
    });

    it('calls collectPosts with mode following for friend posts', async () => {
      postService.collectPosts.mockResolvedValue({
        data: [],
        hasNext: false,
        after: '',
        totalData: 0,
      });

      await service.getFeed({ tab: 'following', limit: 15 }, 2);

      expect(postService.collectPosts).toHaveBeenCalledWith(
        'following',
        15,
        '',
        undefined,
        undefined,
        2,
      );
    });

    it('calls collectPosts with mode space for community discussions', async () => {
      postService.collectPosts.mockResolvedValue({
        data: [],
        hasNext: false,
        after: '',
        totalData: 0,
      });

      await service.getFeed({ tab: 'komunitas', spaceId: 4, limit: 10 }, 1);

      expect(postService.collectPosts).toHaveBeenCalledWith(
        'space',
        10,
        '',
        4,
        undefined,
        1,
      );
    });

    it('calls collectPosts with mode member for own posts tab', async () => {
      postService.collectPosts.mockResolvedValue({
        data: [],
        hasNext: false,
        after: '',
        totalData: 0,
      });

      await service.getFeed({ tab: 'mine', limit: 10 }, 5);

      expect(postService.collectPosts).toHaveBeenCalledWith(
        'member',
        10,
        '',
        5,
        undefined,
        5,
      );
    });
  });

  describe('toggleReaction', () => {
    it('creates reaction when not previously reacted', async () => {
      reactionRepo.findOne.mockResolvedValue(null);
      reactionService.createReaction.mockResolvedValue({ id: 1 });
      postRepo.findOne.mockResolvedValue({ id: 10, reactionsCount: 8 });

      const res = await service.toggleReaction(10, 1, 'heart');

      expect(reactionService.createReaction).toHaveBeenCalledWith(10, 'heart', 1);
      expect(res).toEqual({ reacted: true, likes: 8 });
    });

    it('deletes reaction when already reacted', async () => {
      reactionRepo.findOne.mockResolvedValue({ id: 99 });
      reactionService.deleteReaction.mockResolvedValue(true);
      postRepo.findOne.mockResolvedValue({ id: 10, reactionsCount: 7 });

      const res = await service.toggleReaction(10, 1, 'heart');

      expect(reactionService.deleteReaction).toHaveBeenCalledWith(1, 10);
      expect(res).toEqual({ reacted: false, likes: 7 });
    });
  });

  describe('communities', () => {
    it('lists communities and formats joined flag', async () => {
      spaceService.getHomeSpaces.mockResolvedValue([
        {
          id: 4,
          name: 'Mitsubishi Xforce',
          description: 'Community for Xforce lovers',
          image: 'https://img.jpg',
          banner: 'https://banner.jpg',
          membersCount: 1500,
          postsCount: 120,
          following: true,
        },
      ]);

      const list = await service.getCommunities(1);

      expect(list).toHaveLength(1);
      expect(list[0]).toMatchObject({
        id: '4',
        spaceId: 4,
        name: 'Mitsubishi Xforce',
        joined: true,
        members: 1500,
        postsCount: 120,
      });
    });

    it('joins community space', async () => {
      spaceService.follow.mockResolvedValue('Success follow space');

      const ok = await service.joinCommunity(4, 1);

      expect(spaceService.follow).toHaveBeenCalledWith(4, 1);
      expect(ok).toBe(true);
    });

    it('leaves community space', async () => {
      spaceService.unfollow.mockResolvedValue('Success unfollow space');

      const ok = await service.leaveCommunity(4, 1);

      expect(spaceService.unfollow).toHaveBeenCalledWith(4, 1);
      expect(ok).toBe(true);
    });
  });

  describe('comments & reports', () => {
    it('creates comment', async () => {
      commentService.createComment.mockResolvedValue({
        id: 201,
        title: 'Bagus sekali',
        description: 'Bagus sekali',
        member: { id: 1, name: 'Andi' },
        published_at: new Date('2026-10-26T12:00:00.000Z'),
      });

      const comment = await service.createComment(10, 1, {
        content: 'Bagus sekali',
      });

      expect(commentService.createComment).toHaveBeenCalledWith(
        { post_id: 10, comment_id: undefined, content: 'Bagus sekali' },
        1,
        false,
      );
      expect(comment.id).toBe('201');
      expect(comment.content).toBe('Bagus sekali');
    });

    it('submits post report with normalized reason', async () => {
      postReportService.createPostReport.mockResolvedValue({});

      const ok = await service.reportPost(10, { reason: 'Spam' }, 1);

      expect(postReportService.createPostReport).toHaveBeenCalledWith(
        { postId: 10, reason: ReportReason.SPAM, description: '' },
        1,
      );
      expect(ok).toBe(true);
    });
  });
});
