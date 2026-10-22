import { NotFoundException } from '@nestjs/common';
import { PostEntity } from '../entity/post.entity';

/** Rejects unpublished/deleted educational posts before exposing their interactions. Legacy forum rules remain unchanged. */
export function assertPostInteractionsVisible(
  post: PostEntity | null | undefined,
): asserts post is PostEntity {
  if (
    !post ||
    post.deleted_at ||
    (post.isPsychoeducation && (post.status !== 'PUBLISHED' || post.isHidden))
  ) {
    throw new NotFoundException('Post not found.');
  }
}
