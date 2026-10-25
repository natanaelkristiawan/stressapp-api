const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const { IMPORT_HEADERS, parseContentWorkbook } = require('../src/admin-post/content-import.format');
const { PostEntity } = require('../src/entity/post.entity');
const { TagsEntity } = require('../src/entity/tags.entity');
const { ContentImportService } = require('../src/admin-post/content-import.service');
const { AdminPostContentService } = require('../src/admin-post/admin-post-content.service');

/** Exercises the real multipart API and transactional importer against the parent suite's disposable database. */
module.exports = async function checkImport({ base, token, forgedRoleToken, db, module }) {
  const endpoint = base + '/admin-post/psychoeducation/import';
  const importer = module.get(ContentImportService);
  const content = module.get(AdminPostContentService);
  async function workbook(rows, headers = IMPORT_HEADERS) {
    const book = new ExcelJS.Workbook();
    const sheet = book.addWorksheet('Content');
    sheet.addRow(headers);
    rows.forEach(row => sheet.addRow(row));
    return Buffer.from(await book.xlsx.writeBuffer());
  }
  async function request(action, bytes, expectedHash, auth = token, filename = 'content.xlsx') {
    const form = new FormData();
    form.append('file', new Blob([bytes]), filename);
    if (expectedHash !== undefined) { form.append('expectedHash', expectedHash); }
    const response = await fetch(endpoint + '/' + action, { method: 'POST', headers: auth ? { Authorization: 'Bearer ' + auth } : {}, body: form });
    return { status: response.status, body: await response.json() };
  }
  const templateResponse = await fetch(endpoint + '/template', { headers: { Authorization: 'Bearer ' + token } });
  assert.equal(templateResponse.status, 200);
  const sample = Buffer.from(await templateResponse.arrayBuffer());
  assert.equal((await parseContentWorkbook(sample)).length, 17);
  const samplePreview = await request('preview', sample);
  assert.equal(samplePreview.status, 201);
  assert.equal(samplePreview.body.data.errorCount, 0);
  const rows = [
    ['article', 'Import article unique', '', 'New import topic; Another topic', '<p>Article body</p>', '', '', ''],
    ['video', 'Import video unique', '', 'new IMPORT topic', '', 'youtube', 'https://youtu.be/abcDEF123_-', ''],
    ['video', 'Duplicate video', '', '', '', 'youtube', 'https://www.youtube.com/watch?v=abcDEF123_-', ''],
  ];
  const bytes = await workbook(rows);
  const beforePosts = await db.getRepository(PostEntity).count();
  const beforeTags = await db.getRepository(TagsEntity).count();
  assert.equal((await request('preview', bytes, undefined, null)).status, 401);
  assert.equal((await request('preview', bytes, undefined, forgedRoleToken)).status, 401);
  const preview = await request('preview', bytes);
  assert.equal(preview.status, 201);
  const data = preview.body.data;
  assert.deepEqual([data.readyCount, data.duplicateCount, data.errorCount], [2, 1, 0]);
  assert.equal(data.canImport, true);
  assert.equal(await db.getRepository(PostEntity).count(), beforePosts);
  assert.equal(await db.getRepository(TagsEntity).count(), beforeTags);
  const mismatch = await request('commit', bytes, '0'.repeat(64));
  assert.equal(mismatch.status, 409, JSON.stringify(mismatch.body));
  assert.equal((await request('commit', bytes, 'bad')).status, 400);
  const results = await Promise.all([request('commit', bytes, data.fileHash), request('commit', bytes, data.fileHash)]);
  results.forEach(result => { assert.equal(result.status, 201); assert.equal(result.body.data.importedCount, 2); });
  assert.deepEqual(results.map(result => result.body.data.replayed).sort(), [false, true]);
  assert.equal(await db.getRepository(PostEntity).count(), beforePosts + 2);
  assert.equal(await db.getRepository(TagsEntity).count(), beforeTags + 2);
  const imported = await db.getRepository(PostEntity).find({ where: { title: 'Import article unique' } });
  assert.equal(imported[0].status, 'DRAFT');
  assert.equal((await request('preview', bytes)).body.data.duplicateCount, 3);
  const invalidBytes = await workbook([
    ['article', 'Invalid import article', '', 'Must not be created', '<p>Okay</p>', '', '', ''],
    ['video', '', '', '', '', 'youtube', 'https://evil.test/video', ''],
  ]);
  const invalid = await request('preview', invalidBytes);
  assert.equal(invalid.body.data.canImport, false);
  assert.equal(invalid.body.data.errorCount, 1);
  assert.equal((await request('commit', invalidBytes, invalid.body.data.fileHash)).status, 400);
  assert.equal(await db.getRepository(TagsEntity).count(), beforeTags + 2);
  const archived = await content.saveCategory({ name: 'Archived import category' });
  await content.saveCategory({ name: archived.name, active: false, revision: archived.revision }, archived.id);
  const archivedBytes = await workbook([['article', 'Archived test', '', archived.name, '<p>Text</p>', '', '', '']]);
  assert.equal((await request('preview', archivedBytes)).body.data.errorCount, 1);
  const formulaBytes = await workbook([['article', { formula: '1+1' }, '', '', '<p>Text</p>', '', '', '']]);
  assert.equal((await request('preview', formulaBytes)).body.data.errorCount, 1);
  for (const invalidFile of [Buffer.from('not a workbook'), await workbook(rows, ['wrong']), await workbook(Array.from({ length: 201 }, () => rows[0]))]) {
    assert.equal((await request('preview', invalidFile)).status, 400);
  }
  assert.equal((await request('preview', bytes, undefined, token, 'content.xls')).status, 400);
  assert.equal((await request('preview', Buffer.alloc(2 * 1024 * 1024 + 1))).status, 413);
  const JSZip = require('jszip');
  const prefixedZip = await JSZip.loadAsync(bytes);
  const mainNamespace = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  for (const entry of Object.values(prefixedZip.files).filter(entry => /xl\/(workbook|worksheets\/sheet1)\.xml$/.test(entry.name))) {
    const xml = await entry.async('string');
    prefixedZip.file(entry.name, xml.replace(`xmlns="${mainNamespace}"`, `xmlns:x="${mainNamespace}"`).replace(/<(\/?)([A-Za-z][\w]*)(?=[\s/>])/g, '<$1x:$2'));
  }
  const prefixed = await prefixedZip.generateAsync({ type: 'nodebuffer' });
  assert.deepEqual(await parseContentWorkbook(prefixed), await parseContentWorkbook(bytes));
  const originalSample = require('node:path').resolve(__dirname, '../../outputs/01a16167-e209-73d0-991e-273e8e9d34cf/psychoeducation-video-sample.xlsx');
  if (require('node:fs').existsSync(originalSample)) {
    const originalPreview = await request('preview', require('node:fs').readFileSync(originalSample));
    assert.equal(originalPreview.status, 201);
    assert.equal(originalPreview.body.data.totalCount, 17);
    assert.equal(originalPreview.body.data.errorCount, 0);
  }

  for (const [name, value] of [['xl/vbaProject.bin', 'macro'], ['xl/externalLinks/externalLink1.xml', '<x/>'], ['xl/worksheets/sheet1.xml', '<!DOCTYPE x [<!ENTITY x "bad">]><x/>']]) {
    const zip = await JSZip.loadAsync(bytes);
    zip.file(name, value);
    const malicious = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    assert.equal((await request('preview', malicious)).status, 400);
  }

  const rollbackBytes = await workbook([
    ['article', 'Rollback first', '', 'Rollback category', '<p>Text</p>', '', '', ''],
    ['article', 'Rollback second', '', '', '<p>Text</p>', '', '', ''],
  ]);
  const rollbackPreview = await importer.preview(rollbackBytes);
  const originalCreate = content.create.bind(content);
  let calls = 0;
  content.create = async (...args) => { if (++calls === 2) { throw new Error('synthetic write failure'); } return originalCreate(...args); };
  try { await assert.rejects(importer.commit(rollbackBytes, rollbackPreview.fileHash, imported[0].member?.id ?? 1), /synthetic write failure/); }
  finally { content.create = originalCreate; }
  assert.equal(await db.getRepository(PostEntity).count(), beforePosts + 2);
  assert.equal(await db.getRepository(TagsEntity).count(), beforeTags + 3);
  console.log('PASS: Excel template, multipart auth/validation, preview without writes, automatic categories, duplicates, concurrent retry receipts, drafts, row errors, formula rejection, size/row limits and transaction rollback.');
};
