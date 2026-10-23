// Uses a new schema on an explicitly supplied disposable local MySQL server; storage is mocked.
require('ts-node/register');
require('tsconfig-paths/register');
const assert = require('node:assert/strict');
const { readdirSync } = require('node:fs');
const { resolve } = require('node:path');
const { createConnection } = require('mysql2/promise');
const { Test } = require('@nestjs/testing');
const { TypeOrmModule, getDataSourceToken } = require('@nestjs/typeorm');
const { ConfigModule } = require('@nestjs/config');
const { JwtService } = require('@nestjs/jwt');
const { ValidationPipe } = require('@nestjs/common');
const { PsychoeducationController } = require('../src/admin-post/psychoeducation.controller');
const { AdminPostContentService } = require('../src/admin-post/admin-post-content.service');
const { CmsMembersGuard } = require('../src/cms-members/cms-members.guard');
const { AdminAuthModule } = require('../src/admin-auth/admin-auth.module');
const { AdminAuthService } = require('../src/admin-auth/admin-auth.service');
const { AuthService } = require('../src/auth/auth.service');
const { RedisTokenMiddleware } = require('../src/middleware/redis-token.middleware');
const { MemberAuthService } = require('../src/member-auth/member-auth.service');
const { UploadController } = require('../src/upload/upload.controller');
const { UploadService } = require('../src/upload/upload.service');
const { SuccessInterceptor } = require('../src/common/interceptors/success.interceptor');
const { NullToEmptyInterceptor } = require('../src/common/interceptors/null-to-empty.interceptor');
const { AllExceptionsFilter } = require('../src/common/filters/http-exception.filter');
const { Member } = require('../src/entity/user-mimate.entity');
const { UserAdmin } = require('../src/entity/user-admin.entity');
const { SpaceEntity } = require('../src/entity/space.entity');
const { SearchService } = require('../src/search/search.service');
const { PostEntity } = require('../src/entity/post.entity');
const { AssetsEntity } = require('../src/entity/asset.entity');
const { CommentEntity } = require('../src/entity/comment.entity');
const { ActivityService } = require('../src/activity/activity.service');
const { Activity } = require('../src/entity/activity.entity');
const { ReactionEntity } = require('../src/entity/reaction.entity');
const { PostService } = require('../src/post/post.service');
const { AdminPostService } = require('../src/admin-post/admin-post.service');
const { CommentService } = require('../src/comment/comment.service');
const { ReactionService } = require('../src/reaction/reaction.service');
const { assertPostInteractionsVisible } = require('../src/post/post-visibility');
const { seedAdmin } = require('../src/database/seeds/admin.seed');
const { MemberContentController } = require('../src/post/member-content.controller');
const { MemberContentService, COMMENT_QUEUE } = require('../src/post/member-content.service');
const { MemberAuthGuard } = require('../src/member-auth/member-auth.guard');
const { ContentModerationService } = require('../src/content-moderation/content-moderation.service');
const { getQueueToken } = require('@nestjs/bullmq');
const memberTokens = new Map();
const queuedComments = [];
const queueConnection = process.env.PSYCHOEDUCATION_TEST_REDIS_PORT ? { host: '127.0.0.1', port: Number(process.env.PSYCHOEDUCATION_TEST_REDIS_PORT) } : null;
const realQueue = queueConnection ? new (require('bullmq').Queue)(COMMENT_QUEUE, { connection: queueConnection }) : null;
let moderationResult = 'publish';
let moderationScript = [];
let classifyCalls = 0;
const secret = 'synthetic-psychoeducation-test-secret';
const password = 'Synthetic123!';

async function main() {
  const port = Number(process.env.PSYCHOEDUCATION_TEST_PORT);
  assert(Number.isInteger(port) && port > 0 && port <= 65535, 'Supply PSYCHOEDUCATION_TEST_PORT for disposable MySQL');
  const schema = `psychoeducation_test_${process.pid}_${Date.now()}`;
  const connection = await createConnection({ host: '127.0.0.1', port, user: 'root', password: '' });
  let app;
  try {
    await connection.query(`CREATE DATABASE \`${schema}\``);
    const folder = resolve(__dirname, '../src/entity');
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => ({ JWT_SECRET: secret })] }),
        TypeOrmModule.forRoot({ name: 'mimate', type: 'mysql', host: '127.0.0.1', port, username: 'root', password: '', database: schema, timezone: 'Z', synchronize: true,
          entities: readdirSync(folder).filter(file => /\.entity\.ts$/.test(file) && !/^(user|car|vehicle)\.entity\./.test(file)).map(file => resolve(folder, file)),
        }),
        TypeOrmModule.forFeature([PostEntity, AssetsEntity, Member], 'mimate'), AdminAuthModule,
      ],
      controllers: [PsychoeducationController, UploadController, MemberContentController],
      providers: [MemberContentService, MemberAuthGuard,
        { provide: getQueueToken(COMMENT_QUEUE), useValue: { add: async (_name, data, options) => { queuedComments.push(data); if (realQueue) { await realQueue.add('moderate-comment', data, options); } } } },
        { provide: ContentModerationService, useValue: { classify: async () => { classifyCalls++; const action = moderationScript.shift() ?? moderationResult; return { action, categories: action === 'reject' ? ['profanity'] : [], model: 'synthetic', policy: 'synthetic', checkedAt: new Date().toISOString() }; } } },
        AdminPostContentService, CmsMembersGuard, UploadService, { provide: MemberAuthService, useValue: { limit: async () => undefined, authenticateSession: async (token) => {
          const id = memberTokens.get(token);
          if (!id) { throw new (require('@nestjs/common').UnauthorizedException)(); }
          const member = await module.get(getDataSourceToken('mimate')).getRepository(Member).findOneBy({ id });
          if (!member || member.is_suspended) { throw new (require('@nestjs/common').UnauthorizedException)(); }
          return { member, sessionId: 'synthetic-member-session' };
        } } }],
    }).compile();
    app = module.createNestApplication();
    const db = module.get(getDataSourceToken('mimate'));
    await db.synchronize();
    const jwt = new JwtService({ secret });
    const middleware = new RedisTokenMiddleware(jwt, new AuthService(db.getRepository(Member)), { getOrNil: () => ({ set: async () => undefined }) });
    app.use((req, res, next) => { if (req.path.startsWith('/me/psychoeducation')) { return next(); } return middleware.use(req, res, next).catch(error => res.status(error.getStatus?.() || 500).json({ message: error.message })); });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalInterceptors(new SuccessInterceptor(), new NullToEmptyInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    await seedAdmin(db, { email: 'content-admin@example.test', name: 'Content Admin', password });
    await seedAdmin(db, { email: 'second-admin@example.test', name: 'Second Admin', password });
    const admins = await db.getRepository(UserAdmin).find({ relations: ['userMimate'], order: { id: 'ASC' } });
    const cmsAuth = module.get(AdminAuthService);
    const token = await cmsAuth.login(admins[0]);
    const otherToken = await cmsAuth.login(admins[1]);
    const ordinary = await db.getRepository(Member).save({ name: 'Member', email: 'member@example.test', memberAuthEnabled: true });
    const forgedRoleToken = jwt.sign({ iss: 'https://mimate.otesuto.com/admin-auth/login', aud: 'cms', kind: 'admin-access', id: ordinary.id });
    const service = module.get(AdminPostContentService);
    const upload = module.get(UploadService);
    upload.storageSettings = { bucket: 'synthetic-content', endpointUrl: 'https://storage.example.test', baseUrl: 'https://api.example.test', client: {} };
    let storageCalls = 0;
    upload.storageClient = { send: async () => { storageCalls += 1; return {}; } };
    async function call(method, path, body, credential = token) {
      const response = await fetch(`${base}/admin-post/psychoeducation${path}`, { method, headers: { ...(credential ? { Authorization: `Bearer ${credential}` } : {}), 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: response.status, body: await response.json() };
    }
    async function uploadFile(buffer, mime, name, credential = token) {
      const form = new FormData();
      if (buffer) form.append('file', new Blob([buffer], { type: mime }), name);
      const response = await fetch(`${base}/upload/cms`, { method: 'POST', headers: { Authorization: `Bearer ${credential}` }, body: form });
      return { status: response.status, body: await response.json() };
    }
    assert.equal((await call('GET', '', undefined, '')).status, 401);
    assert.equal((await call('GET', '', undefined, forgedRoleToken)).status, 401);
    const expired = jwt.sign({ iss: 'https://mimate.otesuto.com/admin-auth/login', aud: 'cms', kind: 'admin-access', id: admins[0].backup_member_id, exp: 1 });
    assert.equal((await call('GET', '', undefined, expired)).status, 401);
    await db.getRepository(Member).update(admins[1].backup_member_id, { is_suspended: true });
    assert.equal((await call('GET', '', undefined, otherToken)).status, 401);
    await db.getRepository(Member).update(admins[1].backup_member_id, { is_suspended: false });
    const article = { contentType: 'article', title: 'Understanding loneliness', body: '<h2>Hello</h2><p onclick="evil()">Text <strong>safe</strong><script>alert(1)</script><a href="javascript:alert(1)">link</a></p>', status: 'draft' };
    assert.equal((await call('POST', '', { ...article, isPsychoeducation: false })).status, 400);
    assert.equal((await call('POST', '', { ...article, contentType: 'infographic' })).status, 400);
    assert.equal((await call('POST', '', { ...article, title: ' ' })).status, 400);
    assert.equal((await call('POST', '', { ...article, body: '<script>alert(1)</script>' })).status, 400);
    assert.equal((await call('POST', '', { ...article, body: '<p>Text<img src="https://foreign.example/x.jpg"></p>' })).status, 400);
    assert.equal((await call('POST', '', { ...article, videoUrl: 'https://foreign.example/x.mp4' })).status, 400);
    assert.equal((await call('GET', '?pageSize=101')).status, 400);
    assert.equal((await call('GET', '?sort=title;DROP')).status, 400);
    assert.equal((await call('GET', '/invalid')).status, 400);
    assert.equal((await uploadFile(null)).status, 400);
    assert.equal((await uploadFile(Buffer.from('bad'), 'video/mp4', 'bad.mp4')).status, 400);
    assert.equal((await uploadFile(Buffer.from('bad'), 'image/jpeg', 'bad.jpg')).status, 400);
    assert.equal((await uploadFile(Buffer.from('bad'), 'application/json', 'bad.json')).status, 400);
    assert.equal((await uploadFile(Buffer.from('bad'), 'video/mp4', 'bad.mp4', forgedRoleToken)).status, 401);
    assert.equal(storageCalls, 0);
    const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypisom'), Buffer.alloc(20)]);
    const videoUpload = await uploadFile(mp4, 'video/mp4', 'synthetic.mp4');
    assert.equal(videoUpload.status, 201, JSON.stringify(videoUpload));
    const videoUrl = videoUpload.body.data.url;
    const png = await require('sharp')({ create: { width: 2, height: 2, channels: 3, background: '#ffffff' } }).png().toBuffer();
    const imageUpload = await uploadFile(png, 'image/png', 'synthetic.png');
    assert.equal(imageUpload.status, 201);
    const imageUrl = imageUpload.body.data.url;
    const ordinaryAsset = await db.getRepository(AssetsEntity).save({ memberId: ordinary.id, type: 'Video', contentType: 'video/mp4', path: 'private.mp4', url_open: 'https://storage.example.test/private.mp4', url: 'https://api.example.test/private' });
    assert.equal((await call('POST', '', { contentType: 'video', title: 'Video', status: 'draft' })).status, 400);
    assert.equal((await call('POST', '', { contentType: 'video', title: 'Video', status: 'draft', videoUrl: ordinaryAsset.url_open })).status, 400);
    assert.equal((await call('POST', '', { contentType: 'video', title: 'Video', status: 'draft', videoUrl: imageUrl })).status, 400);
    assert.equal((await call('POST', '', { contentType: 'video', title: 'Video', status: 'draft', videoUrl, body: 'wrong' })).status, 400);
    const created = await call('POST', '', { ...article, thumbnailUrl: imageUrl });
    assert.equal(created.status, 201, JSON.stringify(created));
    const content = created.body.data;
    assert.equal(content.isPsychoeducation, true);
    assert.equal(content.revision, 1);
    assert.equal(content.publishedAt, null);
    assert.equal(content.videoUrl, null);
    assert(content.body.includes('<strong>safe</strong>'));
    assert(!/onclick|javascript:|script|alert\(/.test(content.body));
    const video = await call('POST', '', { contentType: 'video', title: 'Breathing video', status: 'published', videoUrl, thumbnailUrl: imageUrl });
    assert.equal(video.status, 201);
    assert.equal(video.body.data.body, null);
    assert.equal(video.body.data.videoUrl, videoUrl);
    assert(video.body.data.publishedAt);
    assert.equal((await call('GET', '?contentType=video&status=published&search=breathing')).body.data.total, 1);
    const memberContent = module.get(MemberContentService);
    const secondMember = await db.getRepository(Member).save({ name: 'Second member', email: 'second-member@example.test', memberAuthEnabled: true });
    memberTokens.set('member-one', ordinary.id);
    memberTokens.set('member-two', secondMember.id);
    async function mobile(method, path, body, credential = 'member-one') {
      const response = await fetch(`${base}/me/psychoeducation${path}`, { method, headers: { Authorization: `Bearer ${credential}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: response.status, body: await response.json() };
    }
    assert.equal((await mobile('GET', '', undefined, token)).status, 401);
    assert.equal((await mobile('GET', `/${content.id}`)).status, 404); // Draft.
    const videoId = video.body.data.id;
    assert.equal((await mobile('GET', '?limit=51')).status, 400);
    assert.equal((await mobile('GET', '?after=invalid')).status, 400);
    const cursorRows = [];
    for (let index = 0; index < 3; index++) {
      const created = await call('POST', '', { contentType: 'video', title: `Cursor fixture ${index}`, status: 'published', videoUrl });
      assert.equal(created.status, 201);
      cursorRows.push(created.body.data.id);
    }
    const firstPage = await mobile('GET', '?type=video&limit=1');
    assert.equal(firstPage.status, 200);
    assert.equal(firstPage.body.data.items.length, 1);
    assert.equal(firstPage.body.data.hasNextPage, true);
    const cursor = encodeURIComponent(firstPage.body.data.nextAfter);
    assert.equal((await mobile('GET', `?type=article&limit=1&after=${cursor}`)).status, 400);
    const secondPage = await mobile('GET', `?type=video&limit=1&after=${cursor}`);
    assert.equal(secondPage.status, 200);
    assert.notEqual(secondPage.body.data.items[0].id, firstPage.body.data.items[0].id);
    for (const id of cursorRows) { await call('DELETE', `/${id}`, { revision: 1 }); }
    assert.equal((await mobile('GET', `/${cursorRows[0]}`)).status, 404);
    await db.getRepository(PostEntity).update(videoId, { isHidden: true });
    assert.equal((await mobile('GET', `/${videoId}`)).status, 404);
    await db.getRepository(PostEntity).update(videoId, { isHidden: false });
    if (process.env.PSYCHOEDUCATION_TEST_MOBILE_ADAPTER === '1') {
      // Exercise real mobile schemas + shared transport against this real HTTP server, not a transport stub.
      const vm = require('node:vm');
      const fs = require('node:fs');
      const ts = require('typescript');
      const mobileRoot = resolve(__dirname, '../../stressapp');
      const mobileRequire = require('node:module').createRequire(resolve(mobileRoot, 'package.json'));
      const transportExports = {};
      const compile = file => ts.transpileModule(fs.readFileSync(resolve(mobileRoot, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
      vm.runInNewContext(compile('lib/member-auth-api.ts'), { exports: transportExports, process: { env: { EXPO_PUBLIC_API_URL: base } }, fetch, AbortController, FormData, setTimeout, clearTimeout,
        require: name => name === 'react-native' ? { Platform: { OS: 'android' } } : mobileRequire(name) });
      transportExports.configureMemberSession({ version: () => 99, refresh: async () => 'member-one' });
      const mobileExports = {};
      vm.runInNewContext(compile('lib/psychoeducation-api.ts'), { exports: mobileExports, URLSearchParams, Date, Math, Error,
        require: name => name === './member-auth-api' ? transportExports : name === '@/stores/auth-store' ? { useAuthStore: { getState: () => ({ token: 'member-one' }) } } : mobileRequire(name) });
      const mobileApi = mobileExports.psychoeducationApi;
      assert.equal((await mobileApi.detail(videoId)).id, videoId);
      assert.equal((await mobileApi.list('video')).items.length, 1);
      const adapterComment = await mobileApi.saveComment(videoId, 'Real adapter HTTP test', 'synthetic_real_adapter_request');
      assert.equal(adapterComment.status, 'pending');
      assert((await mobileApi.comments(videoId)).items.some(item => item.id === adapterComment.id));
      await mobileApi.deleteComment(videoId, adapterComment.id);
      assert.equal((await mobileApi.like(videoId, true)).liked, true);
      assert.equal((await mobileApi.like(videoId, false)).liked, false);
      const before = (await mobileApi.detail(videoId)).viewCount;
      await mobileApi.view(videoId, 'synthetic_real_adapter_view');
      await mobileApi.view(videoId, 'synthetic_real_adapter_view');
      assert.equal((await mobileApi.detail(videoId)).viewCount, before + 1);
    }
    const event = { requestId: 'synthetic_view_request_0001' };
    const viewBefore = (await mobile('GET', `/${videoId}`)).body.data.viewCount;
    await Promise.all([mobile('POST', `/${videoId}/views`, event), mobile('POST', `/${videoId}/views`, event)]);
    assert.equal((await mobile('GET', `/${videoId}`)).body.data.viewCount, viewBefore + 1);
    await mobile('POST', `/${videoId}/views`, { requestId: 'synthetic_view_request_0002' });
    assert.equal((await mobile('GET', `/${videoId}`)).body.data.viewCount, viewBefore + 2);
    await Promise.all([mobile('PUT', `/${videoId}/like`), mobile('PUT', `/${videoId}/like`)]);
    assert.equal((await mobile('GET', `/${videoId}`)).body.data.likeCount, 1);
    await mobile('DELETE', `/${videoId}/like`);
    assert.equal((await mobile('GET', `/${videoId}`)).body.data.likeCount, 0);
    for (const text of [' ', 'x'.repeat(261)]) {
      assert.equal((await mobile('POST', `/${videoId}/comments`, { content: text, requestId: 'synthetic_invalid_comment' })).status, 400);
    }
    assert.equal((await mobile('POST', `/${videoId}/comments`, { content: 'Hello', requestId: 'synthetic_invalid_comment', memberId: secondMember.id })).status, 400);
    const beforeCalls = classifyCalls;
    const submission = { content: '  Safe comment  ', requestId: 'synthetic_comment_request_0001' };
    const submitted = await mobile('POST', `/${videoId}/comments`, submission);
    assert.equal(submitted.status, 201, JSON.stringify(submitted));
    assert.equal(submitted.body.data.status, 'pending');
    assert.equal(submitted.body.data.content, 'Safe comment');
    assert.equal(classifyCalls, beforeCalls, 'Submit must never wait for AI');
    const commentId = submitted.body.data.id;
    assert.equal((await mobile('POST', `/${videoId}/comments`, submission)).body.data.id, commentId);
    assert.equal((await mobile('GET', `/${videoId}/comments`)).body.data.items.length, 1);
    assert.equal((await mobile('GET', `/${videoId}/comments`, undefined, 'member-two')).body.data.items.length, 0);
    assert.equal((await mobile('DELETE', `/${videoId}/comments/${commentId}`, undefined, 'member-two')).status, 404);
    moderationResult = 'pending';
    await assert.rejects(memberContent.moderateComment({ id: commentId, revision: 1 }));
    moderationResult = 'publish';
    await memberContent.moderateComment({ id: commentId, revision: 1 });
    assert.equal((await mobile('GET', `/${videoId}/comments`, undefined, 'member-two')).body.data.items[0].status, 'approved');
    assert.equal((await mobile('GET', `/${videoId}`)).body.data.commentCount, 1);
    const edit = await mobile('PATCH', `/${videoId}/comments/${commentId}`, { content: 'Updated text', requestId: 'synthetic_comment_request_0002' });
    assert.equal(edit.status, 200, JSON.stringify(edit));
    await memberContent.moderateComment({ id: commentId, revision: 1 }); // Stale job must do nothing.
    assert.equal((await mobile('GET', `/${videoId}/comments`, undefined, 'member-two')).body.data.items.length, 0);
    moderationResult = 'reject';
    await memberContent.moderateComment({ id: commentId, revision: 2 });
    assert.equal((await mobile('GET', `/${videoId}/comments`)).body.data.items[0].status, 'rejected');
    assert.equal((await mobile('GET', `/${videoId}`)).body.data.commentCount, 0);
    assert.equal((await mobile('GET', `/${videoId}/comments`, undefined, 'member-two')).body.data.items.length, 0);
    assert.equal((await call('GET', `/${videoId}/comments`)).body.data.items[0].moderationStatus, 'rejected');
    await mobile('DELETE', `/${videoId}/comments/${commentId}`);
    await memberContent.moderateComment({ id: commentId, revision: 2 });
    assert.equal((await mobile('GET', `/${videoId}/comments`)).body.data.items.length, 0);
    const boundary = await mobile('POST', `/${videoId}/comments`, { content: 'x'.repeat(260), requestId: 'synthetic_comment_request_0003' });
    assert.equal(boundary.status, 201);
    await memberContent.recoverPending();
    assert(queuedComments.some((job) => job.id === boundary.body.data.id));
    if (realQueue) {
      moderationResult = 'publish';
      moderationScript = ['pending', 'publish'];
      const { MemberContentProcessor } = require('../src/post/member-content.processor');
      const processor = new MemberContentProcessor(memberContent);
      const worker = new (require('bullmq').Worker)(COMMENT_QUEUE, job => processor.process(job), { connection: queueConnection });
      try {
        const deadline = Date.now() + 15000;
        while (Date.now() < deadline) {
          const row = await db.getRepository(CommentEntity).findOneBy({ id: boundary.body.data.id });
          if (row.moderationStatus === 'approved') { break; }
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        assert.equal((await db.getRepository(CommentEntity).findOneBy({ id: boundary.body.data.id })).moderationStatus, 'approved', 'Real BullMQ worker must publish the queued revision');
      } finally { await worker.close(); }
    }
    await mobile('DELETE', `/${videoId}/comments/${boundary.body.data.id}`);
    const privateForAdmin = await mobile('POST', `/${videoId}/comments`, { content: 'Admin moderation fixture', requestId: 'synthetic_comment_request_0004' });
    const privateId = privateForAdmin.body.data.id;
    const authorBefore = (await db.getRepository(Member).findOneBy({ id: ordinary.id })).total_comments;
    const reviewedPending = (await call('GET', `/${videoId}/comments`)).body.data.items.find(item => item.id === privateId);
    assert.equal(reviewedPending.moderationStatus, 'pending');
    assert.equal((await call('DELETE', `/${videoId}/comments/${privateId}`, { reason: 'sara', version: reviewedPending.version })).status, 200);
    await memberContent.moderateComment({ id: privateId, revision: 1 });
    assert.equal((await db.getRepository(CommentEntity).findOneBy({ id: privateId })), null);
    assert.equal((await db.getRepository(Member).findOneBy({ id: ordinary.id })).total_comments, authorBefore, 'Educational comments must not decrement forum reward counters');
    const pagingCommentIds = [];
    for (let index = 0; index < 2; index++) {
      const submittedPageComment = await mobile('POST', `/${videoId}/comments`, { content: `Cursor comment ${index}`, requestId: `synthetic_paging_request_000${index}` });
      pagingCommentIds.push(submittedPageComment.body.data.id);
      moderationResult = 'publish';
      await memberContent.moderateComment({ id: submittedPageComment.body.data.id, revision: 1 });
    }
    const commentsFirst = (await mobile('GET', `/${videoId}/comments?limit=1`)).body.data;
    assert.equal(commentsFirst.items.length, 1);
    assert.equal(commentsFirst.hasNextPage, true);
    const commentCursor = encodeURIComponent(commentsFirst.nextAfter);
    const commentsSecond = (await mobile('GET', `/${videoId}/comments?limit=1&after=${commentCursor}`)).body.data;
    assert.notEqual(commentsFirst.items[0].id, commentsSecond.items[0].id);
    assert.equal((await mobile('GET', `/${videoId}/comments?limit=1&after=${commentCursor}`, undefined, 'member-two')).status, 400);
    for (const id of pagingCommentIds) { await mobile('DELETE', `/${videoId}/comments/${id}`); }

    await db.getRepository(Member).update(ordinary.id, { is_suspended: true });
    assert.equal((await mobile('GET', '')).status, 401);
    await db.getRepository(Member).update(ordinary.id, { is_suspended: false });
    assert.equal(video.body.data.videoSource, 'self');
    assert.equal(video.body.data.youtubeId, null);
    const youtubeInput = { contentType: 'video', title: 'YouTube exercise', status: 'published', videoSource: 'youtube', youtubeUrl: 'https://youtu.be/M7lc1UVf-VE' };
    for (const youtubeUrl of ['https://evil.test/watch?v=M7lc1UVf-VE', 'https://youtube.com.evil.test/watch?v=M7lc1UVf-VE', 'http://youtu.be/M7lc1UVf-VE', 'https://www.youtube.com/watch?v=bad']) {
      assert.equal((await call('POST', '', { ...youtubeInput, youtubeUrl })).status, 400);
    }
    assert.equal((await call('POST', '', { ...youtubeInput, videoUrl })).status, 400);
    assert.equal((await call('POST', '', { ...youtubeInput, videoSource: 'other' })).status, 400);
    assert.equal((await call('POST', '', { ...youtubeInput, videoSource: 'self' })).status, 400);
    assert.equal((await call('POST', '', { ...article, youtubeUrl: youtubeInput.youtubeUrl })).status, 400);
    const youtube = await call('POST', '', youtubeInput);
    assert.equal(youtube.status, 201, JSON.stringify(youtube));
    assert.equal(youtube.body.data.videoSource, 'youtube');
    assert.equal(youtube.body.data.youtubeId, 'M7lc1UVf-VE');
    assert.equal(youtube.body.data.videoUrl, null);
    assert.equal((await call('GET', `/${youtube.body.data.id}`)).body.data.youtubeId, 'M7lc1UVf-VE');
    const sourceSwitch = await call('PATCH', `/${youtube.body.data.id}`, { contentType: 'video', title: 'Switched source', status: 'draft', videoSource: 'self', videoUrl, revision: 1 });
    assert.equal(sourceSwitch.status, 200);
    assert.equal(sourceSwitch.body.data.youtubeId, null);
    assert.equal(sourceSwitch.body.data.videoUrl, videoUrl);
    const asArticle = await call('PATCH', `/${youtube.body.data.id}`, { ...article, revision: 2 });
    assert.equal(asArticle.status, 200);
    assert.equal(asArticle.body.data.videoSource, null);
    assert.equal(asArticle.body.data.videoUrl, null);
    await call('DELETE', `/${youtube.body.data.id}`, { revision: 3 });
    // Simulates existing rows whose new nullable source column has not been set.
    await db.getRepository(PostEntity).update(video.body.data.id, { videoSource: null });
    assert.equal((await call('GET', `/${video.body.data.id}`)).body.data.videoSource, 'self');

    const forumSpace = await db.getRepository(SpaceEntity).save({ name: 'Forum', description: 'Forum' });
    const forum = await db.getRepository(PostEntity).save({ title: 'Ordinary forum post', status: 'PUBLISHED', member: { id: ordinary.id }, space: forumSpace, type: 'image', published_at: new Date() });
    assert.equal(forum.isPsychoeducation, false);
    assert.equal((await call('GET', `/${forum.id}`)).status, 404);
    assert.equal((await call('PATCH', `/${forum.id}`, { ...article, revision: 1 })).status, 404);
    assert.equal((await call('DELETE', `/${forum.id}`, { revision: 1 })).status, 404);
    assert.equal((await call('GET', '')).body.data.total, 2);
    assert.equal((await call('PATCH', `/${content.id}`, { ...article, revision: 999 })).status, 409);
    const edits = await Promise.all([call('PATCH', `/${content.id}`, { ...article, title: 'One', status: 'published', revision: 1 }), call('PATCH', `/${content.id}`, { ...article, title: 'Two', status: 'published', revision: 1 }, otherToken)]);
    assert.deepEqual(edits.map(value => value.status).sort(), [200, 409]);
    let current = (await call('GET', `/${content.id}`)).body.data;
    assert.equal(current.revision, 2);
    assert(current.publishedAt);
    await db.getRepository(CommentEntity).save({ title: 'Comment', description: 'Comment text', member: { id: ordinary.id }, post: { id: content.id }, repliesCount: 0 });
    const deletedComment = await db.getRepository(CommentEntity).save({ title: 'Deleted', description: 'Deleted', member: { id: ordinary.id }, post: { id: content.id }, repliesCount: 0 });
    await db.getRepository(CommentEntity).softDelete(deletedComment.id);
    await db.getRepository(ReactionEntity).save({ reaction: '+1', member: { id: ordinary.id }, post: { id: content.id } });
    current = (await call('GET', `/${content.id}`)).body.data;
    assert.equal(current.commentCount, 1);
    assert.equal(current.likeCount, 1);
    assert.equal(current.viewCount, 0);
    // Human moderation is scoped to educational content and preserves other replies.
    const targetComment = await db.getRepository(CommentEntity).save({ title: 'Synthetic', description: 'Synthetic moderation fixture', member: { id: ordinary.id }, post: { id: video.body.data.id }, repliesCount: 1 });
    const keptReply = await db.getRepository(CommentEntity).save({ title: 'Reply', description: 'Reply retained', member: { id: ordinary.id }, post: { id: video.body.data.id }, parent: targetComment, repliesCount: 0 });
    await db.getRepository(Member).update(ordinary.id, { total_comments: 2 });
    const moderationList = await call('GET', `/${video.body.data.id}/comments`);
    assert.equal(moderationList.status, 200);
    assert.equal(moderationList.body.data.total, 2);
    assert(!JSON.stringify(moderationList.body).includes('member@example.test'));
    const reviewed = moderationList.body.data.items.find(item => item.id === targetComment.id);
    assert.match(reviewed.version, /^[a-f0-9]{64}$/);
    assert.equal((await call('GET', `/${forum.id}/comments`)).status, 404);
    assert.equal((await call('GET', `/${video.body.data.id}/comments?pageSize=101`)).status, 400);
    assert.equal((await call('DELETE', `/${content.id}/comments/${targetComment.id}`, { reason: 'sara', version: reviewed.version })).status, 404);
    assert.equal((await call('DELETE', `/${video.body.data.id}/comments/${targetComment.id}`, { reason: 'other', version: reviewed.version })).status, 400);
    assert.equal((await call('DELETE', `/${video.body.data.id}/comments/${targetComment.id}`, { reason: 'sara', version: reviewed.version }, forgedRoleToken)).status, 401);
    await db.getRepository(CommentEntity).update(targetComment.id, { description: 'Changed synthetic text' });
    assert.equal((await call('DELETE', `/${video.body.data.id}/comments/${targetComment.id}`, { reason: 'sara', version: reviewed.version })).status, 409);
    const freshReview = (await call('GET', `/${video.body.data.id}/comments`)).body.data.items.find(item => item.id === targetComment.id);
    const removals = await Promise.all([call('DELETE', `/${video.body.data.id}/comments/${targetComment.id}`, { reason: 'sara', version: freshReview.version }), call('DELETE', `/${video.body.data.id}/comments/${targetComment.id}`, { reason: 'sara', version: freshReview.version }, otherToken)]);
    assert.deepEqual(removals.map(value => value.status).sort(), [200, 404]);
    assert.equal((await call('GET', `/${video.body.data.id}/comments`)).body.data.total, 1);
    assert(await db.getRepository(CommentEntity).findOneBy({ id: keptReply.id }));
    assert((await db.getRepository(CommentEntity).findOne({ where: { id: targetComment.id }, withDeleted: true })).deleted_at);
    assert.equal((await db.getRepository(Member).findOneBy({ id: ordinary.id })).total_comments, 1);
    assert.equal((await call('GET', `/${video.body.data.id}`)).body.data.commentCount, 1);
    const moderationAudit = await db.getRepository(Activity).find({ where: { commentId: targetComment.id, source: 'cms-psychoeducation' } });
    assert.equal(moderationAudit.length, 1);
    assert.equal(moderationAudit[0].message, 'SARA policy violation');
    assert(!JSON.stringify(moderationAudit).includes('Changed synthetic text'));
    // Existing forum services must not accept educational posts via their CRUD/detail routes.
    const legacyPosts = Object.create(PostService.prototype);
    legacyPosts.postRepository = db.getRepository(PostEntity);
    await assert.rejects(() => legacyPosts.detailPost(content.id, ordinary.id), error => error.getStatus() === 404);
    await assert.rejects(() => legacyPosts.updatePost(content.id, {}, ordinary.id, ordinary.id), error => error.getStatus() === 404);
    await assert.rejects(() => legacyPosts.deletePost(content.id, ordinary.id), error => error.getStatus() === 404);
    const legacyAdmin = new AdminPostService();
    legacyAdmin.postRepository = db.getRepository(PostEntity);
    await assert.rejects(() => legacyAdmin.detail(content.id), error => error.getStatus() === 404);
    legacyPosts.redis = { get: async () => null, set: async () => undefined };
    legacyPosts.userAdminRepository = db.getRepository(UserAdmin);
    legacyPosts.dateHelper = { getDateRange: () => 'now' };
    legacyPosts.activityService = { createActivity: async () => undefined };
    const forumList = await legacyPosts.collectPosts('latest', 20, '', undefined, undefined, ordinary.id);
    assert.equal(forumList.data.length, 1);
    assert.equal(forumList.data[0].id, forum.id);
    const search = Object.create(SearchService.prototype);
    search.postRepository = db.getRepository(PostEntity);
    search.redis = legacyPosts.redis;
    search.dateHelper = legacyPosts.dateHelper;
    const searchResult = await search.searchPost('', ordinary.id, 20, '');
    assert.equal(searchResult.data.length, 1);
    const switched = await call('PATCH', `/${content.id}`, { contentType: 'video', title: 'Changed type', status: 'draft', videoUrl, revision: current.revision });
    assert.equal(switched.status, 200);
    assert.equal(switched.body.data.body, null);
    const hidden = await db.getRepository(PostEntity).findOneBy({ id: content.id });
    assert.throws(() => assertPostInteractionsVisible(hidden), error => error.getStatus() === 404);
    const comments = new CommentService(undefined, undefined, undefined, undefined, undefined, { getOrNil: () => ({}) }, undefined);
    comments.postRepository = db.getRepository(PostEntity);
    await assert.rejects(() => comments.getComments(content.id, 20, '', ordinary.id), error => error.getStatus() === 404);
    const reactions = new ReactionService();
    reactions.postRepository = db.getRepository(PostEntity);
    await assert.rejects(() => reactions.createReaction(content.id, '+1', ordinary.id), error => error.getStatus() === 404);
    await assert.rejects(() => reactions.getReactionByPostId(content.id, 'all', ordinary.id), error => error.getStatus() === 404);
    assert.equal((await call('DELETE', `/${content.id}`, { revision: 1 })).status, 409);
    assert.equal((await call('DELETE', `/${content.id}`, { revision: switched.body.data.revision })).status, 200);
    assert.equal((await call('GET', `/${content.id}`)).status, 404);
    assert.equal((await call('GET', '')).body.data.total, 1);
    assert.equal(Number((await db.query('SELECT COUNT(*) AS total FROM backup_comments WHERE backup_post_with_attribute_id = ? AND deleted_at IS NULL', [content.id]))[0].total), 1);
    assert.equal(await db.getRepository(AssetsEntity).count(), 3);
    assert((await db.getRepository(PostEntity).findOne({ where: { id: content.id }, withDeleted: true })).deleted_at);
    // UTC filtering, returned instants and SQL day buckets agree on hosts with different local calendars.
    const timestamp = new Date('2026-03-08T00:00:00.000Z');
    const utcBefore = new Date('2026-03-07T23:59:59.000Z');
    const boundaryPosts = [];
    for (const created_at of [utcBefore, timestamp]) {
      boundaryPosts.push(await db.getRepository(PostEntity).save({ title: 'UTC boundary', description: '', textContent: '', type: 'image', member: { id: ordinary.id }, space: forumSpace, status: 'PUBLISHED', isHidden: false, created_at, updated_at: created_at, published_at: created_at }));
      await db.getRepository(CommentEntity).save({ title: 'UTC boundary', description: 'UTC boundary', post: forum, member: ordinary, created_at, updated_at: created_at, repliesCount: 0 });
    }
    const analytics = Object.create(ActivityService.prototype);
    analytics.commentRepository = db.getRepository(CommentEntity);
    const previousTimezone = process.env.TZ;
    try {
      for (const timezone of ['UTC', 'Asia/Makassar', 'America/New_York']) {
        process.env.TZ = timezone;
        const page = await legacyAdmin.getPost({ page: 1, limit: 20, start_date: timestamp, end_date: timestamp, sort: 'created_at', order: 'asc' });
        assert.equal(page.items.length, 1);
        assert.equal(page.items[0].id, boundaryPosts[1].id);
        assert.equal(page.items[0].created_at.toISOString(), timestamp.toISOString());
        const daily = await analytics.getRepliesAnalytics({ start_date: timestamp, end_date: timestamp }, forum.id);
        assert.equal(daily.count, 1);
        assert.equal(daily.detail.length, 1);
        assert.equal(daily.detail[0].date, '2026-03-08');
        assert.equal(daily.detail[0].count, 1);
      }
    } finally {
      if (previousTimezone === undefined) { delete process.env.TZ; } else { process.env.TZ = previousTimezone; }
    }
    console.log('PASS: schema/repeat-sync, CMS auth, upload validation/mock storage, conditional HTML/asset validation, YouTube links/source switching/legacy fallback, CRUD/filtering, cross-admin stale-write concurrency, forum isolation, interaction counts/visibility, mobile cursor/member privacy/queued moderation/likes/views, soft deletion and UTC filters/report buckets across three host timezones.');
  } finally {
    if (realQueue) { await realQueue.obliterate({ force: true }); await realQueue.close(); }
    if (app) await app.close();
    await connection.query(`DROP DATABASE IF EXISTS \`${schema}\``);
    await connection.end();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
