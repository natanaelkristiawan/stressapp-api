// Tests deployment ordering/fail-fast behavior with fake tools. Never connects to a server/database.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'api-deploy-check-'));
/** Runs the deployment script against a disposable checkout. Returns status and recorded commands. */
function run(overrides = {}) {
  const log = path.join(root, 'calls');
  fs.writeFileSync(log, '');
  const result = spawnSync('bash', [path.join(root, 'deployment/github-deploy.sh')], {
    env: { ...process.env, HOME: root, NVM_DIR: path.join(root, 'no-nvm'), PATH: `${root}/bin:${process.env.PATH}`,
      API_PM2_NAME: 'test-api', FAKE_EXISTING: '1', FAKE_FAILURE: '', FAKE_LOG: log, ...overrides },
    encoding: 'utf8',
  });
  return { status: result.status, calls: fs.readFileSync(log, 'utf8') };
}
try {
  fs.mkdirSync(path.join(root, 'deployment')); fs.mkdirSync(path.join(root, 'bin'));
  fs.copyFileSync(path.join(__dirname, '../deployment/github-deploy.sh'), path.join(root, 'deployment/github-deploy.sh'));
  fs.writeFileSync(path.join(root, '.env'), 'PORT=3000\n');
  for (const name of ['node', 'yarn', 'pm2']) {
    fs.writeFileSync(path.join(root, 'bin', name), `#!/bin/bash
printf '%s\\n' "${name} $*" >> "$FAKE_LOG"
if [[ '${name}' == yarn && "$1" == build && "$FAKE_FAILURE" == build ]]; then exit 11; fi
if [[ '${name}' == node && "$1" == node_modules/typeorm/cli.js && "$FAKE_FAILURE" == migration ]]; then exit 12; fi
if [[ '${name}' == pm2 && "$1" == describe && "$FAKE_EXISTING" == 0 ]]; then exit 1; fi
if [[ '${name}' == node && $# == 0 && "$FAKE_FAILURE" == health ]]; then exit 13; fi
exit 0
`, { mode: 0o755 });
  }
  const success = run(); assert.equal(success.status, 0);
  assert(success.calls.indexOf('yarn build') < success.calls.indexOf('migration:run'));
  assert(success.calls.indexOf('migration:run') < success.calls.indexOf('pm2 reload'));
  assert(success.calls.includes('pm2 reload test-api --update-env'));
  assert.equal(run({ FAKE_EXISTING: '0' }).status, 0);
  assert(run({ FAKE_EXISTING: '0' }).calls.includes('pm2 start ecosystem.config.cjs'));
  for (const failure of ['build', 'migration']) {
    const result = run({ FAKE_FAILURE: failure });
    assert.notEqual(result.status, 0); assert(!result.calls.includes('pm2 '), 'Failed preparation must not reload PM2');
  }
  assert.notEqual(run({ FAKE_FAILURE: 'health' }).status, 0);
  assert.notEqual(run({ API_PM2_NAME: '' }).status, 0);
  fs.unlinkSync(path.join(root, '.env'));
  assert.notEqual(run().status, 0);
  console.log('PASS: install/build/migration/reload order, existing/first-start PM2, failed build/migration/health and missing configuration.');
} finally { fs.rmSync(root, { recursive: true, force: true }); }
