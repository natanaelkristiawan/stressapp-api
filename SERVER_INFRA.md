# Server infrastructure: MySQL, Redis and test email

This setup is for the confirmed PM2 API on the **server host** at
`~/nginx/temu-sobat/api`. Docker is already installed. MySQL, Redis and Mailpit run
in a separate Compose project with persistent volumes. Existing MinIO/Nginx and
any host-installed database remain independent.

This creates a fresh database; it does not import existing member data. If the
API currently uses a populated database, keep its connection until a migration
or import is planned. If PM2 actually runs inside the Nginx container, these
localhost endpoints do not apply; its Docker network must be configured first.

## 1. Start infrastructure on the server

Push the new files to the API GitHub repository, then run in your **server SSH terminal**:

```bash
cd ~/nginx/temu-sobat/api
git pull --ff-only origin main
bash deployment/setup-infra.sh
```

The script creates `.env.infra` once, with random MySQL application/root passwords
and file permissions 600. It never overwrites an existing file or prints passwords.
The file is ignored by Git. Store it privately; do not paste it into chat.

Check readiness:

```bash
docker compose --env-file .env.infra -f compose.infra.yaml ps
docker compose --env-file .env.infra -f compose.infra.yaml exec -T redis redis-cli ping
```

MySQL may need about a minute to initialize. Wait for its healthy status and Redis
`PONG` before running migrations. The MySQL health check verifies database/user
connectivity. This task validated setup locally; nothing was installed on your
remote server by Codex.

## 2. Connect the PM2 API

Edit the existing server API `.env`. Copy the **application** password from
`.env.infra` into `DB_PASSWORD`; never use the root password for the API.
Preserve the existing JWT secret, API port and other application settings.

```dotenv
DB_HOST=127.0.0.1
DB_PORT=13306
DB_USERNAME=stressapp
DB_PASSWORD=your-generated-MYSQL_PASSWORD
DB_DATABASE_MIMATE=stressapp
DB_DATABASE_MMID=stressapp
BULL_HOST=127.0.0.1
BULL_PORT=16379
BULL_TLS=false
EMAIL_HOST=127.0.0.1
EMAIL_PORT=11025
EMAIL_SECURE=false
EMAIL_USERNAME=
EMAIL_PASSWORD=
EMAIL_FROM=Temu SoBAT <noreply@stressapp.test>
EMAIL_FROM_ADDRESS=noreply@stressapp.test
LEADERBOARD_ENABLED=false
LEADERBOARD_READ_ENABLED=false
```

If infrastructure names/ports are customized in `.env.infra`, match them here.
Both legacy database aliases point to one fresh database; auth uses its scoped
migrations. Full legacy feature schemas are not created by this setup.

After services are healthy, run the GitHub **Deploy API** workflow again, or use
the existing server deployment script with your PM2 process name:

```bash
API_PM2_NAME=your-existing-api-process-name bash deployment/github-deploy.sh
```

This builds, applies member-auth migrations, reloads PM2 and checks readiness.
For GitHub deployment prerequisites/settings, see [GITHUB_DEPLOY.md](GITHUB_DEPLOY.md).
If the first push triggers deployment before infrastructure exists, start the
services/update `.env`, then rerun that failed workflow.

## 3. View captured OTP emails

Mailpit is a testing inbox. It **does not send OTP emails to real inboxes** in
this setup. From your own computer, open an SSH tunnel:

```bash
ssh -L 18025:127.0.0.1:18025 YOUR_SERVER_USER@YOUR_SERVER_HOST
```

Keep that session open and visit http://localhost:18025. Register a test member
through the deployed app; the OTP email should appear there. Do not publish the
Mailpit inbox through Nginx without a separately reviewed access policy.

## Operations and data

| Service | Server host endpoint | Container port |
| --- | --- | --- |
| MySQL | 127.0.0.1:13306 | 3306 |
| Redis | 127.0.0.1:16379 | 6379 |
| Mailpit SMTP | 127.0.0.1:11025 | 1025 |
| Mailpit inbox | 127.0.0.1:18025 | 8025 |

All services restart unless explicitly stopped. MySQL data, Redis AOF and
Mailpit messages live in separate named volumes. Normal container restarts
preserve those volumes. Do not use `down -v` to restart services; it deletes data.

View service logs when needed:

```bash
docker compose --env-file .env.infra -f compose.infra.yaml logs --tail=50 mysql redis
```

MySQL initial-user/password settings apply on first initialization. Editing those
values later does not change an existing database password; keep API credentials
aligned with the stored database account. Schedule backups for server data before
using this database with real members.

## Later: real email delivery

Choose an SMTP provider and a verified sender/domain. Update only the API's
`EMAIL_*` settings to the provider's host/port/TLS/credentials and reload the API.
Keep SMTP credentials private. Mailpit can remain available as a test inbox.

## Verification

Compose configuration and shell syntax passed. `node test/server-infra.cjs`
verifies isolation, loopback ports, volumes/restarts, generated credentials,
private file permissions and safe reruns with Docker mocked. Remote container
startup, API connectivity and captured OTP delivery remain to be verified after
you run the server commands.

References: [official MySQL image](https://hub.docker.com/_/mysql),
[Mailpit documentation](https://mailpit.axllent.org/docs/).

## Resend SMTP configuration

Resend is the selected real-email provider. Verify your sender domain in Resend
and add the required DNS records. Use a new private key directly in the server
API .env; never paste the key into chat or commit it.

```dotenv
EMAIL_HOST=smtp.resend.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USERNAME=resend
EMAIL_PASSWORD=YOUR_NEW_PRIVATE_RESEND_KEY
EMAIL_FROM=Temu SoBAT <noreply@YOUR_VERIFIED_DOMAIN>
EMAIL_FROM_ADDRESS=noreply@YOUR_VERIFIED_DOMAIN
```

Replace the sender placeholders with your verified domain, then redeploy/reload
the API to read the new settings. Both API mail configurations respect EMAIL_SECURE.
Mailpit can remain running for isolated testing, but messages sent through Resend
appear in Resend's email dashboard and the recipient inbox. Real delivery has not
been tested; no user key was stored or used by this configuration task.

Settings follow [Resend SMTP documentation](https://resend.com/docs/send-with-smtp).
