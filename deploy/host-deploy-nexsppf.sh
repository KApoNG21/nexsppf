#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${NEXS_APP_DIR:-/docker/nexsppf-web}"
REPO_DIR="${NEXS_REPO_DIR:-$APP_DIR/repo}"
BACKUP_ROOT="${NEXS_BACKUP_ROOT:-$APP_DIR/backups}"
APP_PORT="${NEXS_APP_PORT:-3102}"
WEB_CONTAINER="${NEXS_WEB_CONTAINER:-nexsppf-web}"
POSTGRES_CONTAINER="${NEXS_POSTGRES_CONTAINER:-nexsppf-postgres}"
IMAGE="${NEXS_IMAGE:-nexsppf-web:local}"
ENV_FILE="${NEXS_ENV_FILE:-.env.production}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$BACKUP_ROOT/$STAMP"
ROLLBACK_IMAGE="${IMAGE%:*}:rollback-$STAMP"

cd "$REPO_DIR"
test -f "$ENV_FILE"
command -v docker >/dev/null
command -v curl >/dev/null
mkdir -p "$BACKUP_DIR"

echo "[1/8] Capture release metadata"
git rev-parse HEAD > "$BACKUP_DIR/source-commit.txt" 2>/dev/null || true
docker compose config --images > "$BACKUP_DIR/images.txt"

echo "[2/8] Back up current database and private files"
if docker ps --format '{{.Names}}' | grep -Fxq "$POSTGRES_CONTAINER"; then
  docker exec "$POSTGRES_CONTAINER" sh -lc \
    'pg_dump --clean --if-exists --no-owner --no-privileges -U "$POSTGRES_USER" "$POSTGRES_DB"' \
    | gzip -9 > "$BACKUP_DIR/database.sql.gz"
else
  echo "Database container is not running; this is expected on the first database deployment."
fi

if docker ps -a --format '{{.Names}}' | grep -Fxq "$WEB_CONTAINER"; then
  docker inspect "$WEB_CONTAINER" > "$BACKUP_DIR/web-container.json"
  docker run --rm --volumes-from "$WEB_CONTAINER" \
    -v "$BACKUP_DIR:/backup" alpine:3.21 \
    sh -lc 'if [ -d /data/nexs-private ]; then tar -C /data -czf /backup/private-files.tgz nexs-private; fi'
fi

if docker image inspect "$IMAGE" >/dev/null 2>&1; then
  docker tag "$IMAGE" "$ROLLBACK_IMAGE"
  printf '%s\n' "$ROLLBACK_IMAGE" > "$BACKUP_DIR/rollback-image.txt"
fi

echo "[3/8] Build the new application image"
docker compose build nexsppf-web

echo "[4/8] Start PostgreSQL"
docker compose up -d postgres
for attempt in $(seq 1 45); do
  DATABASE_HEALTH="$(docker inspect -f '{{.State.Health.Status}}' "$POSTGRES_CONTAINER" 2>/dev/null || true)"
  if [ "$DATABASE_HEALTH" = "healthy" ]; then
    break
  fi
  if [ "$attempt" -eq 45 ]; then
    docker logs --tail=200 "$POSTGRES_CONTAINER" >&2 || true
    echo "PostgreSQL did not become healthy before migration." >&2
    exit 1
  fi
  sleep 2
done

echo "[5/8] Apply forward-only database migrations"
docker compose run --rm --no-deps nexsppf-web npm run db:migrate

echo "[6/8] Start the new web release"
docker compose up -d --no-deps nexsppf-web

echo "[7/8] Wait for local health"
for attempt in $(seq 1 45); do
  if curl -fsS "http://127.0.0.1:${APP_PORT}/" >/dev/null; then
    break
  fi
  if [ "$attempt" -eq 45 ]; then
    docker logs --tail=200 "$WEB_CONTAINER" >&2 || true
    echo "Release health check failed. The prior image is tagged as $ROLLBACK_IMAGE." >&2
    exit 1
  fi
  sleep 2
done

echo "[8/8] Run route smoke tests"
docker run --rm --network host \
  -e "SMOKE_BASE_URL=http://127.0.0.1:${APP_PORT}" \
  "$IMAGE" npm run smoke

echo "Deployment complete. Backup: $BACKUP_DIR"
