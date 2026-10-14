# Isolated local API environment

Start Docker Desktop, then run from this folder:

```sh
[ -f .env.docker ] || cp .env.docker.example .env.docker
# Edit .env.docker: set local passwords and a random JWT_SECRET.
docker compose --env-file .env.docker config --quiet
docker compose --env-file .env.docker up -d --build
docker compose --env-file .env.docker ps
```

API: http://localhost:3100/is-live

Development email inbox: http://localhost:8026

The initial setup generated .env.docker with private random local credentials.
Keep that file: changing MySQL credentials after volume initialization requires
updating the database account too. Containers are currently running.

MySQL and Redis have no host ports. Compose creates a project-specific network
and named data volumes. Existing host databases and the existing .env are not
used or included in the image. Mailpit captures test mail; it does not deliver
email to real recipients. These defaults are for local development.

If port 3100 or 8026 is occupied, change API_PORT or MAIL_UI_PORT in .env.docker.
To run another independent copy, add `-p another-project-name` to every Compose
command and select different host ports.

```sh
# View API logs
docker compose --env-file .env.docker logs --tail=100 api
# Open MySQL (enter MYSQL_PASSWORD when prompted)
docker compose --env-file .env.docker exec mysql sh -c 'mysql -u "$MYSQL_USER" -p "$MYSQL_DATABASE"'
# Stop containers; retain database and Redis data
docker compose --env-file .env.docker down
```

## Current implementation boundary

The database starts empty. This step sets up infrastructure, not the final schema
or member authentication. Legacy connection aliases mimate and mmid temporarily
point to the same new database with automatic schema synchronization disabled.
The health endpoint checks HTTP startup only. Legacy content/admin endpoints need
their tables and query paths adapted before they work; never run the legacy
migration generator against this database because two entities map to users.

Next: replace parent-project token authentication with a member module and a clean
single-database schema, while retaining the admin authentication module. Configure
real SMTP only after the local OTP flow is tested.
