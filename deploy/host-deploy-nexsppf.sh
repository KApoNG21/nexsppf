#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/docker/nexsppf-web"
REPO_DIR="$APP_DIR/repo"
TRAEFIK_DYNAMIC="/docker/traefik-ojo9/dynamic/nexsppf.yml"
APP_PORT="3102"
REPO_URL="https://github.com/KApoNG21/nexsppf.git"

echo "[1/12] Verify required commands"
command -v docker >/dev/null
command -v git >/dev/null
sudo -n true >/dev/null

echo "[2/12] Verify port ${APP_PORT} is free or already owned by nexsppf-web"
if sudo ss -ltnp | grep -E ":${APP_PORT}\b"; then
  if sudo docker ps --filter name='^/nexsppf-web$' --format '{{.Names}} {{.Ports}}' | grep -q "127.0.0.1:${APP_PORT}->3000/tcp"; then
    echo "Port ${APP_PORT} is already used by existing nexsppf-web container; proceeding with in-place update."
  else
    echo "ERROR: port ${APP_PORT} is already in use by another process/container" >&2
    exit 1
  fi
fi

echo "[3/12] Prepare app directory"
sudo mkdir -p "$APP_DIR"
sudo chown -R "$(id -un):$(id -gn)" "$APP_DIR"

if [ ! -d "$REPO_DIR/.git" ]; then
  echo "[4/12] Clone repo"
  git clone "$REPO_URL" "$REPO_DIR"
else
  echo "[4/12] Update repo"
  cd "$REPO_DIR"
  git status --short --branch
  git pull --ff-only origin main
fi

cd "$REPO_DIR"
echo "[5/12] Current commit"
git log -1 --pretty='%H %s'

cat > Dockerfile <<'EOF'
# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN useradd --system --uid 1001 --create-home --shell /usr/sbin/nologin nextjs

COPY --from=builder --chown=nextjs:nextjs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nextjs /app/package-lock.json ./package-lock.json
COPY --from=builder --chown=nextjs:nextjs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nextjs /app/.next ./.next
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/next.config.ts ./next.config.ts

USER nextjs
EXPOSE 3000
CMD ["npm", "run", "start"]
EOF

cat > .dockerignore <<'EOF'
node_modules
npm-debug.log*
.next
out
.git
.gitignore
.vscode
.idea
.DS_Store
.env
.env.*
!.env.example
coverage
*.log
EOF

cat > docker-compose.yml <<'EOF'
services:
  nexsppf-web:
    build:
      context: .
      dockerfile: Dockerfile
    image: nexsppf-web:local
    container_name: nexsppf-web
    restart: unless-stopped
    environment:
      NODE_ENV: production
      NEXT_TELEMETRY_DISABLED: "1"
      PORT: "3000"
      HOSTNAME: "0.0.0.0"
    ports:
      - "127.0.0.1:3102:3000"
    healthcheck:
      test: ["CMD-SHELL", "node -e \"fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\""]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s
EOF

echo "[6/12] Build/start nexsppf-web only"
sudo docker compose up -d --build nexsppf-web

echo "[7/12] Container status"
sudo docker compose ps
sudo docker logs --tail=100 nexsppf-web

echo "[8/12] Verify local app"
for attempt in {1..30}; do
  if curl -fsSI "http://127.0.0.1:${APP_PORT}/" >/tmp/nexsppf-local-health.headers; then
    sed -n '1,20p' /tmp/nexsppf-local-health.headers
    break
  fi
  if [ "$attempt" -eq 30 ]; then
    echo "ERROR: local app did not become healthy on port ${APP_PORT}" >&2
    sudo docker logs --tail=200 nexsppf-web >&2 || true
    exit 1
  fi
  sleep 2
done

echo "[9/12] Add Traefik dynamic route only for nexsppf"
sudo tee "$TRAEFIK_DYNAMIC" >/dev/null <<'EOF'
http:
  routers:
    nexsppf-web:
      rule: "Host(`nexsppf.com`) || Host(`www.nexsppf.com`) || Host(`usa.nexsppf.com`) || Host(`russia.nexsppf.com`)"
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt
      service: nexsppf-web

  services:
    nexsppf-web:
      loadBalancer:
        servers:
          - url: "http://127.0.0.1:3102"
EOF

echo "[10/12] Show Traefik config"
sudo sed -n '1,200p' "$TRAEFIK_DYNAMIC"

echo "[11/12] Traefik recent logs"
sudo docker logs --tail=160 traefik-ojo9-traefik-1 || true

echo "[12/12] Verify live routes"
for url in \
  "https://nexsppf.com/" \
  "https://www.nexsppf.com/" \
  "https://usa.nexsppf.com/" \
  "https://russia.nexsppf.com/" \
  "https://www.nexsppf.com/products" \
  "https://www.nexsppf.com/warranty" \
  "https://www.nexsppf.com/r/PRO-1196MXY0401178Q"; do
  echo "-- $url --"
  curl -I -L --max-time 30 -A 'Mozilla/5.0' "$url" | sed -n '1,25p'
  echo
done

echo "DONE. Rollback only nexsppf if needed:"
echo "sudo rm -f $TRAEFIK_DYNAMIC && cd $REPO_DIR && sudo docker compose down"
