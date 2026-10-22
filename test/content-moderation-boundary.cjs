// No server, database or OpenAI calls: exercise the real write methods up to the filter.
require('ts-node/register');
require('tsconfig-paths/register');
const assert = require('node:assert/strict');
const { PostService } = require('../src/post/post.service');
const { CommentService } = require('../src/comment/comment.service');
const { AdminPostService } = require('../src/admin-post/admin-post.service');
const { ServiceUnavailableException, HttpException } = require('@nestjs/common');
const { validate } = require('class-validator');
const { plainToInstance } = require('class-transformer');
const { getMetadataArgsStorage } = require('typeorm');
const { CreatePostDto } = require('../src/post/dtos/create-post.dto');
const { CreateCommentDto } = require('../src/comment/dtos/create-comment.dto');
const { UpdateCommentDto } = require('../src/comment/dtos/update-comment.dto');
const { PostEntity } = require('../src/entity/post.entity');
const { CommentEntity } = require('../src/entity/comment.entity');

async function main() {
  for (const [Dto, input] of [
    [CreatePostDto, { title: 123 }],
    [CreatePostDto, { title: 'ok', content: 'x'.repeat(10001) }],
    [CreatePostDto, { title: 'ok', votes: [{ vote: 'x'.repeat(301) }] }],
    [CreateCommentDto, { post_id: 1, content: false }],
    [UpdateCommentDto, { content: 'x'.repeat(5001) }],
  ]) {
    assert((await validate(plainToInstance(Dto, input))).length > 0, 'DTO must reject invalid text');
  }
  for (const Entity of [PostEntity, CommentEntity]) {
    const column = getMetadataArgsStorage().columns.find(value => value.target === Entity && value.propertyName === 'moderation');
    assert(column);
    assert.equal(column.options.type, 'json');
    assert.equal(column.options.nullable, true);
    assert.equal(column.options.select, false);
  }
  for (const failure of [new ServiceUnavailableException('pending'), new HttpException('rejected', 422)]) {
    let writes = 0;
    const calls = [];
    const moderation = { assertPublishable: async (fields, actor) => { calls.push({ fields, actor }); throw failure; } };
    const post = { id: 1, title: 'approved title', textContent: 'approved body', isPsychoeducation: false, member: { id: 2 }, votes: [{ vote: 'poll' }] };
    const comment = { id: 3, title: 'approved', description: 'approved', member: { id: 2, name: 'member' }, post };
    const repository = {
      findOne: async () => post,
      findOneBy: async () => null,
      save: async () => { writes++; },
      update: async () => { writes++; },
      delete: async () => { writes++; },
    };
    const posts = Object.assign(Object.create(PostService.prototype), { moderation, postRepository: repository, userMimateRepository: repository });
    await assert.rejects(() => posts.createPost({ title: 'new', content: 'new body', votes: [{ vote: 'new poll' }], tags: ['new tag'] }, 2, 2), error => error === failure);
    assert.deepEqual(calls[0], { fields: ['new', 'new body', 'new tag', 'new poll'], actor: 2 });
    await assert.rejects(() => posts.updatePost(1, { title: 'changed', content: 'changed body' }, 2, 2), error => error === failure);
    assert.equal(post.title, 'approved title');
    assert.equal(post.textContent, 'approved body');

    const comments = Object.assign(Object.create(CommentService.prototype), {
      moderation, postRepository: repository,
      commentRepository: { ...repository, findOne: async () => comment },
    });
    await assert.rejects(() => comments.createComment({ post_id: 1, comment_id: 3, content: 'reply' }, 2), error => error === failure);
    await assert.rejects(() => comments.updateComment(3, { content: 'edit' }, 2), error => error === failure);
    assert.equal(comment.description, 'approved');
    assert.equal(comment.title, 'approved');
    const admin = Object.assign(Object.create(AdminPostService.prototype), { moderation, postRepository: repository });
    await assert.rejects(() => admin.hideShowPost(1, false, 2), error => error === failure);
    assert.equal(writes, 0, 'pending/rejected content must cause no database side effects');
  }
  console.log('Moderation write boundaries passed (create/edit posts, comments/replies, admin show).');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
