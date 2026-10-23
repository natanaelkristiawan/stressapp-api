// Disposable UNIX-socket Redis; provider responses mocked. No shared Redis or live AI.
require('ts-node/register');
require('tsconfig-paths/register');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const Redis = require('ioredis');
const { Queue, Worker, QueueEvents } = require('bullmq');
const { ConfigService } = require('@nestjs/config');
const axios = require('axios');
const { ContentModerationService, MODERATION_QUEUE } = require('../src/content-moderation/content-moderation.service');

async function main() {
  const directory = mkdtempSync('/tmp/moderation-');
  const socket = join(directory, 'redis.sock');
  const server = spawn('redis-server', ['--port', '0', '--unixsocket', socket, '--save', '', '--appendonly', 'no'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let redis, queue, events, worker;
  const originalPost = axios.default.post;
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Disposable Redis startup timed out')), 10000);
      server.on('error', error => { clearTimeout(timer); reject(error); });
      server.once('exit', () => { clearTimeout(timer); reject(new Error('Disposable Redis exited during startup')); });
      server.stdout.on('data', chunk => { if (String(chunk).toLowerCase().includes('ready to accept connections')) { clearTimeout(timer); resolve(); } });
    });
    const connection = { path: socket, maxRetriesPerRequest: null };
    redis = new Redis(connection);
    queue = new Queue(MODERATION_QUEUE, { connection });
    events = new QueueEvents(MODERATION_QUEUE, { connection });
    await events.waitUntilReady();
    const service = new ContentModerationService(new ConfigService({ OPENCODE_API_KEY: 'synthetic', OPENCODE_MODERATION_MODEL: 'test-model' }), { getOrNil: () => redis }, queue, { forResult: async () => null });
    let calls = 0;
    axios.default.post = async (endpoint, payload) => {
      assert.equal(endpoint, 'https://opencode.ai/inference/openai/v1/chat/completions');
      assert.equal(payload.max_tokens, 120);
      calls++;
      return { data: { model: 'test-model', choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ type: calls === 1 ? 'uncertain' : 'safe' }) } }] } };
    };
    worker = new Worker(MODERATION_QUEUE, job => service.retry(job.data), { connection });
    assert.equal((await service.moderateContent(['synthetic pending text'], 1)).action, 'pending');
    const [job] = await queue.getDelayed();
    assert(job);
    assert.equal(job.opts.attempts, 3);
    assert((await redis.ttl(job.data.key)) > 0);
    const finished = job.waitUntilFinished(events, 10000);
    await job.promote();
    await finished;
    assert.equal((await service.moderateContent(['synthetic pending text'], 1)).action, 'publish');
    assert.equal(calls, 2);
    assert.equal(await queue.getJob(job.id), undefined, 'completed jobs must remove submitted text');

    let release;
    const gate = new Promise(resolve => { release = resolve; });
    const provider = axios.default.post;
    axios.default.post = async (...args) => { await gate; return provider(...args); };
    const first = service.moderateContent(['duplicate'], 2);
    // Observe the lock rather than guessing when the first request acquired it.
    for (let attempt = 0; attempt < 100; attempt++) {
      const locks = await redis.keys('moderation:*:lock');
      if (locks.length) break;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.equal((await service.moderateContent(['duplicate'], 2)).action, 'pending');
    release();
    assert.equal((await first).action, 'publish');
    assert.equal(calls, 3, 'concurrent identical text must call the provider once');
    axios.default.post = provider;
    for (let index = 0; index < 10; index++) {
      assert.equal((await service.moderateContent([`different ${index}`], 3)).action, 'publish');
    }
    await assert.rejects(() => service.moderateContent(['eleventh'], 3), error => error.getStatus() === 429);
    console.log('Real Redis/BullMQ checks passed: retry, reuse, job cleanup, lock, rate limit.');
  } finally {
    axios.default.post = originalPost;
    await worker?.close();
    await events?.close();
    await queue?.close();
    await redis?.quit();
    if (server.exitCode === null && server.signalCode === null) {
      const stopped = new Promise(resolve => server.once('exit', resolve));
      server.kill('SIGTERM');
      await stopped;
    }
    rmSync(directory, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
