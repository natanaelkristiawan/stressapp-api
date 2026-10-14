#!/usr/bin/env bash
# Deploys the already-updated checkout. Exits nonzero before PM2 reload on build/migration failure.
# Returns shell status 0 only after the API health endpoint responds successfully.
set -eo pipefail
cd "$(dirname "$0")/.."
: "${API_PM2_NAME:?Set API_PM2_NAME to the existing API process name}"
[[ -f .env ]] || { echo 'Create the production .env on the server before deploying.' >&2; exit 1; }

# SSH sessions may not load NVM from the interactive shell profile.
if [[ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]]; then
  source "${NVM_DIR:-$HOME/.nvm}/nvm.sh"
  nvm use
fi
set -u
node -e 'if (Number(process.versions.node.split(".")[0]) !== 22) { console.error("Deployment requires Node.js 22; see .nvmrc."); process.exit(1); }'
command -v yarn >/dev/null
command -v pm2 >/dev/null

export NODE_ENV=production
# Keep dev dependencies for the Nest compiler and TypeORM CLI; do not mutate the lockfile.
yarn install --frozen-lockfile --production=false --non-interactive
yarn build
# Use only member auth migrations; the legacy datasource has conflicting users mappings.
node node_modules/typeorm/cli.js -d dist/member-auth/data-source.js migration:run

if pm2 describe "$API_PM2_NAME" >/dev/null 2>&1; then
  pm2 reload "$API_PM2_NAME" --update-env
else
  pm2 start ecosystem.config.cjs --update-env
fi

# Read PORT privately from the deployed .env; never print credentials or environment contents.
node <<'JS'
require('dotenv').config();
/** Waits for local API readiness. Returns Promise<void>; failure exits deployment with status 1. */
async function checkHealth() {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid API PORT configuration.');
  for (let attempt = 0; attempt < 15; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/is-live`, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return;
    } catch {
      // PM2 may still be starting the new process. The bounded readiness loop retries.
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error('API health check failed after PM2 reload. Inspect PM2 logs on the server.');
}
checkHealth().then(() => console.log('API deployment health check passed.')).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
JS
