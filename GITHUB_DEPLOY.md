# GitHub deployment — API

The user confirmed PM2 at `~/nginx/temu-sobat/api`. This setup matches the
app/CMS SSH workflow and deploys pushes to `main`, with manual deployment also
available in GitHub Actions. It has been prepared locally; no server deployment
or GitHub settings have been changed by this task.

## GitHub repository settings

In the **API repository**, open Settings → Secrets and variables → Actions.

| Type | Name | Value |
| --- | --- | --- |
| Secret | `SERVER_HOST` | Same server host used for app/CMS |
| Secret | `SERVER_USER` | SSH account owning the API checkout/PM2 process |
| Secret | `SERVER_SSH_KEY` | Same authorized SSH private key used for app/CMS |
| Variable | `API_PM2_NAME` | Exact existing API process name from `pm2 list` |
| Variable, optional | `SERVER_PORT` | SSH port; defaults to `22` |
| Secret, optional | `SERVER_FINGERPRINT` | Server SSH host-key SHA256 fingerprint |

Secrets in another repository are not automatically available in this repository;
add them here or grant access through organization secrets. Never commit the
server `.env`, private keys or credentials.

`API_PM2_NAME` is required to avoid guessing the identity of the deployed process.
For a first deployment without an existing process, choose `stressapp-api`.
Existing processes are reloaded by name, keeping their PM2 configuration.
The included ecosystem file is used only if the named process does not yet exist.

For Docker MySQL/Redis/Mailpit setup supporting this host PM2 deployment, see
[SERVER_INFRA.md](SERVER_INFRA.md).

## Server requirements

- The API checkout exists at the confirmed path and is on `main`, with `origin`
  pointing to the API repository. It must be able to pull without an interactive
  password prompt. Local modifications/diverged branches must be resolved first.
- Node.js 22, Yarn Classic 1.x and PM2 are available to the SSH user. `.nvmrc`
  selects Node 22; the script loads NVM when installed. Install Node 22 once on the
  server if it is missing. The script does not silently install/change runtime versions.
- The server `.env` contains the existing production port, database, Redis,
  JWT, SMTP and other runtime configuration. It remains on the server.
- The SSH user can reload the intended PM2 process and access its database.
  Ensure PM2 startup configuration already restores the API after server reboot.

## What happens on each deployment

1. GitHub connects through the same SSH action used by app/CMS.
2. It pulls `main` using `git pull --ff-only`; it does not reset/delete local files.
3. The deployment script checks the process name, server `.env` and runtime tools.
4. Yarn installs with the frozen lockfile, then builds NestJS.
5. The scoped member-auth datasource applies only pending auth migrations.
6. PM2 reloads the existing named API, or starts the included ecosystem config
   when that process does not exist.
7. The script waits for local `/is-live` on the configured `PORT` and reports failure
   if the API does not become healthy.

Build/migration failure stops before PM2 reload. A failed health check fails the
GitHub job; automatic code/database rollback is not implemented. The additive
auth migrations do not alter retained legacy tables. Use a reviewed backup before
future schema changes; do not substitute the legacy broad datasource.
Deployments run serially. This in-place PM2 workflow does not promise zero downtime.
A health response confirms readiness, not complete feature acceptance.

## Files to push

- [.github/workflows/deploy.yml](.github/workflows/deploy.yml)
- [deployment/github-deploy.sh](deployment/github-deploy.sh)
- [ecosystem.config.cjs](ecosystem.config.cjs)
- [.nvmrc](.nvmrc)
- [test/github-deploy.cjs](test/github-deploy.cjs)
- This guide

The API folder must be the root of its own GitHub repository for this workflow
location to be recognized, matching the current separate component repositories.
After adding repository settings, push to `main` and check **Actions → Deploy API**.
The existing GitLab/AWS deployment files remain untouched; this workflow uses PM2.

## Local checks

```sh
bash -n deployment/github-deploy.sh
node --check ecosystem.config.cjs
node test/github-deploy.cjs
```

The runnable check uses disposable mock commands and never touches a real PM2
process, database or server. It verifies ordering, existing/first-start PM2,
missing configuration and failure handling. Workflow YAML parsing also passed.
Live SSH permissions, production migration and server health need the first
GitHub Actions run to verify them.

SSH action options were checked against its [official documentation](https://github.com/appleboy/ssh-action).
