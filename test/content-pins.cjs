const assert = require('node:assert/strict');

/** Uses the real CMS/member routes on the parent suite's disposable schema. */
module.exports = async function checkPins({ call, mobile, forumId, forgedRoleToken }) {
  const article = { contentType: 'article', title: 'Pinned article', body: '<p>Featured article</p>', status: 'published', isPinned: true };
  for (const isPinned of ['true', 1, null]) {
    assert.equal((await call('POST', '', { ...article, isPinned })).status, 400);
  }
  const first = (await call('POST', '', article)).body.data;
  const second = (await call('POST', '', { ...article, title: 'Second pinned article' })).body.data;
  const unpinned = (await call('POST', '', { ...article, title: 'Unpinned article', isPinned: false })).body.data;
  const draft = (await call('POST', '', { ...article, title: 'Pinned draft', status: 'draft' })).body.data;
  const video = (await call('POST', '', { contentType: 'video', title: 'Pinned video', status: 'published', videoSource: 'youtube', youtubeUrl: 'https://youtu.be/M7lc1UVf-VE', isPinned: true })).body.data;
  assert.equal(first.isPinned, true);
  assert.equal((await call('GET', `/${first.id}`)).body.data.isPinned, true);
  const featured = await mobile('GET', '?isPinned=true&limit=50');
  assert.equal(featured.status, 200);
  const ids = featured.body.data.items.map(item => item.id);
  assert(ids.includes(first.id) && ids.includes(second.id) && ids.includes(video.id));
  assert(!ids.includes(unpinned.id) && !ids.includes(draft.id));
  assert((await mobile('GET', '?isPinned=false&limit=50')).body.data.items.some(item => item.id === unpinned.id));
  assert((await mobile('GET', '?limit=50')).body.data.items.some(item => item.id === unpinned.id));
  assert.equal((await mobile('GET', '?isPinned=1')).status, 400);
  const page = (await mobile('GET', '?isPinned=true&type=article&limit=1')).body.data;
  assert(page.hasNextPage && page.nextAfter);
  const next = (await mobile('GET', '?isPinned=true&type=article&limit=1&after=' + encodeURIComponent(page.nextAfter))).body.data;
  assert.notEqual(next.items[0].id, page.items[0].id);
  assert.equal((await mobile('GET', '?type=article&after=' + encodeURIComponent(page.nextAfter))).status, 400);
  const path = `/${first.id}/pin`;
  assert.equal((await call('PATCH', path, { isPinned: false, revision: first.revision }, forgedRoleToken)).status, 401);
  for (const patch of [{ isPinned: 'false', revision: 1 }, { isPinned: false }, { isPinned: false, revision: 1, title: 'Injected' }]) {
    assert.equal((await call('PATCH', path, patch)).status, 400);
  }
  assert.equal((await call('PATCH', `/${forumId}/pin`, { isPinned: true, revision: 1 })).status, 404);
  const updated = await call('PATCH', path, { isPinned: false, revision: first.revision });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.isPinned, false);
  assert.equal(updated.body.data.title, first.title);
  assert.equal(updated.body.data.body, first.body);
  assert.equal((await call('PATCH', path, { isPinned: true, revision: first.revision })).status, 409);
  const edited = await call('PATCH', `/${second.id}`, { ...article, isPinned: false, revision: second.revision });
  assert.equal(edited.body.data.isPinned, false);
  const defaultPin = (await call('POST', '', { contentType: 'article', title: 'Default unpinned', body: '<p>Text</p>', status: 'draft' })).body.data;
  assert.equal(defaultPin.isPinned, false);
  await call('DELETE', `/${video.id}`, { revision: video.revision });
  assert(!(await mobile('GET', '?isPinned=true&limit=50')).body.data.items.some(item => item.id === video.id));
  console.log('PASS: multiple pins, form/table updates, draft/deleted/forum isolation, defaults, strict booleans, stale writes and scoped cursor pagination.');
};
