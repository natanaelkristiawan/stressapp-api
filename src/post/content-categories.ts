import { BadRequestException } from '@nestjs/common';
import { EntityManager, In, SelectQueryBuilder } from 'typeorm';
import { TagsEntity } from '../entity/tags.entity';
import { PostTagsEntity } from '../entity/post-tags.entity';

/** Reads canonical category names, so renaming a category updates all related content. */
export async function contentCategories(
  manager: EntityManager,
  postId: number,
  includeArchived = false,
) {
  const links = await manager.getRepository(PostTagsEntity).find({
    where: { post: { id: postId }, tag: { isContentCategory: true } },
    relations: ['tag'],
  });
  return links
    .filter((link) => includeArchived || !link.tag.categoryArchived)
    .map((link) => ({
      id: link.tag.id,
      name: link.tag.title,
      active: !link.tag.categoryArchived,
    }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id);
}

/** Replaces only category links; existing forum-tag links and archived assignments remain intact. */
export async function assignCategories(
  manager: EntityManager,
  postId: number,
  ids?: number[],
) {
  if (ids === undefined) {
    return;
  }
  const repo = manager.getRepository(PostTagsEntity);
  const previous = await repo.find({
    where: { post: { id: postId }, tag: { isContentCategory: true } },
    relations: ['tag'],
  });
  const sorted = [...ids].sort((a, b) => a - b);
  const categories = sorted.length
    ? await manager.getRepository(TagsEntity).find({
        where: { id: In(sorted), isContentCategory: true },
        order: { id: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      })
    : [];
  if (
    categories.length !== ids.length ||
    categories.some(
      (category) =>
        category.categoryArchived &&
        !previous.some((link) => link.tag.id === category.id),
    )
  ) {
    throw new BadRequestException('Select existing active content categories.');
  }
  for (const link of previous) {
    if (!ids.includes(link.tag.id)) {
      await repo.remove(link);
    }
  }
  for (const category of categories) {
    if (!previous.some((link) => link.tag.id === category.id)) {
      await repo.save(
        repo.create({
          post: { id: postId },
          tag: category,
          title: category.title,
          slug: category.slug,
          created_at: new Date(),
        }),
      );
    }
  }
}

/** Filters with EXISTS so multiple category links never duplicate rows or distort cursor/total counts. */
export function filterContentCategory(
  query: SelectQueryBuilder<unknown>,
  categoryId?: number,
) {
  if (!categoryId) {
    return;
  }
  const subquery = query
    .subQuery()
    .select('1')
    .from(PostTagsEntity, 'categoryLink')
    .innerJoin('categoryLink.tag', 'category')
    .where('categoryLink.backup_post_id = post.id')
    .andWhere('category.id = :categoryId')
    .andWhere('category.isContentCategory = true')
    .andWhere('category.categoryArchived = false')
    .getQuery();
  query.andWhere(`EXISTS ${subquery}`, { categoryId });
}
