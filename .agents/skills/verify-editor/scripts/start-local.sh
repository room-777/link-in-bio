#!/usr/bin/env bash
# Start Grabbin's API (wrangler, :3001) and web (vinext, :3000) on 127.0.0.1 without Cloudflare credentials.
# Usage: start-local.sh <RUN_DIR>   (PIDs and logs go to RUN_DIR)
set -euo pipefail
RUN_DIR="${1:?usage: start-local.sh <RUN_DIR>}"
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO="${GRABBIN_REPO:-$(git -C "$SKILL_DIR" rev-parse --show-toplevel)}"
mkdir -p "$RUN_DIR"
for port in 3000 3001; do
  if ss -ltn "sport = :$port" | grep -q LISTEN; then
    echo "port $port is already in use; refusing to start (run doctor.sh or stop the owner first)" >&2
    exit 1
  fi
done
# Shell exports override .env files; clear the ones the app reads so .env wins.
unset NEXT_PUBLIC_SERVER_URL NEXT_PUBLIC_PAGE_DOMAIN
# Resolve the worker entry against the checkout being verified.
sed "s|\"main\": \"apps/server/src/index.ts\"|\"main\": \"$REPO/apps/server/src/index.ts\"|" \
  "$SKILL_DIR/scripts/server.wrangler.jsonc" > "$RUN_DIR/server.wrangler.jsonc"
cd "$REPO/apps/server"
setsid "$REPO/apps/web/node_modules/.bin/wrangler" dev \
  --config "$RUN_DIR/server.wrangler.jsonc" \
  --env-file "$REPO/apps/server/.env" \
  --port 3001 --ip :: \
  --persist-to "$RUN_DIR/wrangler-state" > "$RUN_DIR/server.log" 2>&1 &
echo $! > "$RUN_DIR/server.pid"
cd "$REPO/apps/web"
setsid bun run dev:bare -- --hostname 127.0.0.1 > "$RUN_DIR/web.log" 2>&1 &
echo $! > "$RUN_DIR/web.pid"
for i in $(seq 1 90); do
  if curl -fsS -m 2 http://127.0.0.1:3001/ >/dev/null 2>&1 && \
     curl -fsS -m 30 http://127.0.0.1:3000/sign-in 2>/dev/null | grep -q 'Send OTP\|sign-in'; then
    echo "ready: web http://127.0.0.1:3000  api http://127.0.0.1:3001"
    exit 0
  fi
  sleep 2
done
echo "not ready after 180s; see $RUN_DIR/server.log and $RUN_DIR/web.log" >&2
exit 1
