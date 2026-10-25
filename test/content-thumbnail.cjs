require('ts-node/register');
require('tsconfig-paths/register');
const assert = require('node:assert/strict');
const { MemberContentService } = require('../src/post/member-content.service');

/** Checks the shared list/detail response mapper with repository reads isolated. */
async function main() {
  const service = Object.create(MemberContentService.prototype);
  const manager = { getRepository: () => ({ count: async () => 0, exist: async () => false, find: async () => [] }) };
  const youtube = { id: 1, contentType: 'video', videoSource: 'youtube', youtubeId: 'M7lc1UVf-VE', image: null };
  const fallback = 'https://img.youtube.com/vi/M7lc1UVf-VE/maxresdefault.jpg';
  for (const detail of [false, true]) {
    assert.equal((await service.response(youtube, 1, detail, manager)).thumbnailUrl, fallback);
    assert.equal((await service.response({ ...youtube, image: '' }, 1, detail, manager)).thumbnailUrl, fallback);
    const uploaded = 'https://assets.example.test/thumbnail.png';
    assert.equal((await service.response({ ...youtube, image: uploaded }, 1, detail, manager)).thumbnailUrl, uploaded);
    for (const patch of [{ contentType: 'article' }, { videoSource: 'self' }, { youtubeId: null }, { youtubeId: '../invalid' }]) {
      assert.equal((await service.response({ ...youtube, ...patch }, 1, detail, manager)).thumbnailUrl, null);
    }
  }
  assert.equal(youtube.image, null);
  console.log('PASS: member list/detail YouTube thumbnail fallback, uploaded precedence, article/self exclusions and invalid IDs; no stored mutation.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
