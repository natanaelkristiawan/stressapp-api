// Verifies first-use credentials and safe reruns without starting real containers.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const yaml = require('js-yaml');
const base = path.resolve(__dirname, '..');
const compose = yaml.load(fs.readFileSync(path.join(base, 'compose.infra.yaml'), 'utf8'));
assert.equal(compose.name, 'temu-sobat-infra');
assert.deepEqual(Object.keys(compose.services).sort(), ['mailpit', 'mysql', 'redis']);
for (const service of Object.values(compose.services)) {
  assert.equal(service.restart, 'unless-stopped');
  assert(service.volumes.length > 0);
  assert(service.ports.every(port => port.startsWith('127.0.0.1:')));
}
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-check-'));
try {
  fs.mkdirSync(path.join(root, 'deployment')); fs.mkdirSync(path.join(root, 'bin'));
  fs.copyFileSync(path.join(base, 'deployment/setup-infra.sh'), path.join(root, 'deployment/setup-infra.sh'));
  fs.writeFileSync(path.join(root, 'bin/docker'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  /** Runs setup with Docker mocked. Returns a synchronous shell execution result. */
  const run = () => spawnSync('bash', [path.join(root, 'deployment/setup-infra.sh')], { env: { ...process.env, PATH: `${root}/bin:${process.env.PATH}` }, encoding: 'utf8' });
  assert.equal(run().status, 0);
  const credentials = fs.readFileSync(path.join(root, '.env.infra'), 'utf8');
  assert(/MYSQL_PASSWORD=[a-f0-9]{64}\n/.test(credentials));
  assert(/MYSQL_ROOT_PASSWORD=[a-f0-9]{64}\n/.test(credentials));
  assert.equal(fs.statSync(path.join(root, '.env.infra')).mode & 0o777, 0o600);
  assert.equal(run().status, 0);
  assert.equal(fs.readFileSync(path.join(root, '.env.infra'), 'utf8'), credentials);
  console.log('PASS: isolated services, private ports, persistence/restarts, private random credentials and unchanged credentials on rerun.');
} finally { fs.rmSync(root, { recursive: true, force: true }); }
