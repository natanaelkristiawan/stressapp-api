#!/usr/bin/env bash
# Creates private first-use credentials and starts only the server infrastructure.
# Returns status 0 after Compose starts successfully; errors stop setup without deleting data.
set -euo pipefail
cd "$(dirname "$0")/.."
command -v docker >/dev/null
docker compose version >/dev/null
if [[ ! -e .env.infra ]]; then
  command -v openssl >/dev/null
  umask 077
  # Never overwrite existing credentials or print generated passwords.
  {
    printf 'MYSQL_DATABASE=stressapp\nMYSQL_USER=stressapp\n'
    printf 'MYSQL_PASSWORD=%s\n' "$(openssl rand -hex 32)"
    printf 'MYSQL_ROOT_PASSWORD=%s\n' "$(openssl rand -hex 32)"
    printf 'MYSQL_PORT=13306\nREDIS_PORT=16379\nMAIL_SMTP_PORT=11025\nMAIL_UI_PORT=18025\n'
  } > .env.infra
fi
docker compose --env-file .env.infra -f compose.infra.yaml config --quiet
docker compose --env-file .env.infra -f compose.infra.yaml up -d
docker compose --env-file .env.infra -f compose.infra.yaml ps
printf 'Infrastructure started. Wait for healthy status, then connect the PM2 API using SERVER_INFRA.md.\n'
