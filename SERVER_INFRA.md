# Existing server services and PM2 API

MySQL and Redis are already installed in Docker on the server. Their containers,
volumes, credentials and lifecycle are managed separately from this repository.
The API runs under PM2 at ~/nginx/temu-sobat/api. Compose setup files and the
infrastructure installer have been removed; GitHub deployment manages only the API.

## API connections

Use the existing production .env on the server. Match DB_HOST/DB_PORT and
BULL_HOST/BULL_PORT to the existing containers' published endpoints. If PM2 runs
on the host and the ports are published on localhost, use 127.0.0.1 plus those
host ports. Container service names such as mysql or redis are not host DNS names.
If PM2 runs inside a container, use the appropriate shared Docker network instead.

The API port is **3111**. Set PORT=3111 in server .env; PM2 deployment enforces
the same port. Update the existing Nginx API upstream accordingly.

Keep DB_USERNAME, DB_PASSWORD and DB_DATABASE_MIMATE aligned with the
existing database. Do not create a new database or change connection targets merely
to deploy an API update. Preserve JWT_SECRET and other existing runtime settings.

## Resend email

Use your Resend-verified sender domain and a private key stored only in server .env:

```dotenv
EMAIL_HOST=smtp.resend.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USERNAME=resend
EMAIL_PASSWORD=YOUR_PRIVATE_RESEND_KEY
EMAIL_FROM=Temu SoBAT <noreply@temusobat.tech>
EMAIL_FROM_ADDRESS=noreply@temusobat.tech
```

Both API mail configurations respect EMAIL_SECURE. Real delivery is still to be
verified on the server. Mailpit is optional for separately managed test environments.

## Deploy

Follow [GITHUB_DEPLOY.md](GITHUB_DEPLOY.md). GitHub pulls main, installs/builds,
reloads the named PM2 process (which synchronizes the development schema) and checks
/is-live. It does not install, start, stop or remove database/Redis containers.

No remote container, volume, database or credential was changed during this cleanup.

## Password-protected Redis

Set these in the private server .env using the container's published host port:

```dotenv
BULL_HOST=127.0.0.1
BULL_PORT=6379
BULL_PASSWORD=YOUR_REDIS_PASSWORD
BULL_USERNAME=
BULL_TLS=false
```

For Redis requirepass/default user, leave BULL_USERNAME blank. For an ACL user,
set its exact username. Both auth rate-limit Redis and BullMQ queue connections
read these values. REDIS_URL is not used by these clients; no URL-encoding of the
password is necessary in BULL_PASSWORD. Preserve the password exactly and apply
dotenv quoting when it contains comment characters such as #.
Push and redeploy to include credential support; editing .env alone on the old
build is insufficient. The server Redis login remains to be verified.

The API now uses only DB_DATABASE_MIMATE. Remove the unused DB_DATABASE_MMID
setting from server .env when redeploying. No second database is required.

## MinIO uploads

The user confirmed `https://minio.temusobat.tech` proxies to the S3 API on port
9000. Port 9001 is the administration console. Existing uploads now use this
endpoint by default, path-style addressing and configured object URLs.

Copy the S3 section from `.env.example` into the private server `.env`. Set an
existing bucket and application access/secret keys; `temusobat` is an example
bucket, not a provisioned resource. Region defaults to `us-east-1`; align it with
MinIO if configured differently. `BASE_URL` is the API origin for existing file
streaming links. Restart/redeploy after configuration changes. Missing/invalid
storage settings fail when storage is used, without blocking unrelated API startup.

Mood images/audio now also use `S3_BUCKET` and direct public URLs, by explicit
user approval on 18 October 2026. No `S3_PRIVATE_BUCKET` setting is required.
No live bucket policy or server configuration has been changed by local edits.

### Public mood media

Create the configured bucket if absent. Merge this statement into its bucket
policy, replacing `YOUR_BUCKET` with `S3_BUCKET`. Retain unrelated approved policy
statements. This grants anonymous reads only for mood objects, not write/list:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "AWS": ["*"] },
    "Action": ["s3:GetObject"],
    "Resource": ["arn:aws:s3:::YOUR_BUCKET/mood/*"]
  }]
}
```

Give API credentials PutObject/DeleteObject permissions for that prefix. Restart
the API after deploying the code/environment changes. Test an uploaded image and
audio URL without Authorization; neither URL should contain signing parameters.
Existing attachments still reference their original bucket. If private uploads
already exist, their old bucket needs its own explicitly scoped read policy or
an object/database migration before those direct URLs work. No migration runs
automatically. Mood scores/notes remain owner-only API resources.
See [MOOD_TRACKER.md](MOOD_TRACKER.md).
