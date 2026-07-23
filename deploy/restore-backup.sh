#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 /absolute/path/to/backup" >&2
  exit 2
fi

BACKUP_DIR="$1"
REPO_DIR="${NEXS_REPO_DIR:-/docker/nexsppf-web/repo}"
WEB_CONTAINER="${NEXS_WEB_CONTAINER:-nexsppf-web}"
POSTGRES_CONTAINER="${NEXS_POSTGRES_CONTAINER:-nexsppf-postgres}"
IMAGE="${NEXS_IMAGE:-nexsppf-web:local}"

case "$BACKUP_DIR" in
  /docker/nexsppf-web/backups/*) ;;
  *) echo "Backup path must be inside /docker/nexsppf-web/backups" >&2; exit 2 ;;
esac
test -d "$BACKUP_DIR"
cd "$REPO_DIR"

if [ -f "$BACKUP_DIR/rollback-image.txt" ]; then
  ROLLBACK_IMAGE="$(cat "$BACKUP_DIR/rollback-image.txt")"
  docker image inspect "$ROLLBACK_IMAGE" >/dev/null
  docker tag "$ROLLBACK_IMAGE" "$IMAGE"
fi

if [ -f "$BACKUP_DIR/database.sql.gz" ]; then
  gzip -dc "$BACKUP_DIR/database.sql.gz" | docker exec -i "$POSTGRES_CONTAINER" sh -lc \
    'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" "$POSTGRES_DB"'
fi

if [ -f "$BACKUP_DIR/private-files.tgz" ]; then
  docker run --rm --volumes-from "$WEB_CONTAINER" \
    -v "$BACKUP_DIR:/backup:ro" alpine:3.21 \
    sh -lc 'rm -rf /data/nexs-private && tar -C /data -xzf /backup/private-files.tgz'
fi

docker compose up -d --no-deps nexsppf-web
echo "Restore complete: $BACKUP_DIR"
