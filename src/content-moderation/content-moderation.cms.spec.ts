import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AdminAuthService } from '../admin-auth/admin-auth.service';
import { CmsMembersGuard } from '../cms-members/cms-members.guard';
import { PostController } from '../post/post.controller';
import { CommentController } from '../comment/comment.controller';
import { AdminPostController } from '../admin-post/admin-post.controller';

function context(request: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('CMS-only moderation bypass', () => {
  it.each([
    PostController.prototype.createPost,
    PostController.prototype.updatePost,
    CommentController.prototype.createComment,
    CommentController.prototype.updateComment,
    AdminPostController.prototype.updatePost,
    AdminPostController.prototype.showPost,
  ])('requires live CMS authorization on %p', (handler) => {
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toContain(
      CmsMembersGuard,
    );
  });

  it('requires the existing live admin lookup', async () => {
    const currentAdmin = jest.fn().mockResolvedValue({ id: '1' });
    const guard = new CmsMembersGuard({
      currentAdmin,
    } as unknown as AdminAuthService);
    expect(await guard.canActivate(context({ userData: { id: 7 } }))).toBe(
      true,
    );
    expect(currentAdmin).toHaveBeenCalledWith(7);
    currentAdmin.mockRejectedValue(new UnauthorizedException());
    await expect(
      guard.canActivate(context({ userData: { id: 7 } })),
    ).rejects.toMatchObject({ status: 401 });
  });

  it.each([
    { member: { id: 7 } },
    {
      body: { admin: true, skipModeration: true },
      headers: { 'x-source': 'cms' },
    },
    { userData: { id: '7', member_role: 1 } },
  ])('rejects missing or fabricated CMS identity %p', async (request) => {
    const currentAdmin = jest.fn();
    const guard = new CmsMembersGuard({
      currentAdmin,
    } as unknown as AdminAuthService);
    await expect(guard.canActivate(context(request))).rejects.toMatchObject({
      status: 401,
    });
    expect(currentAdmin).not.toHaveBeenCalled();
  });
});
