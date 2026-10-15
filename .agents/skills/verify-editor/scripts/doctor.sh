#!/usr/bin/env bash
# Read-only: is the local stack worth driving? Exit 1 on the first failing check.
set -uo pipefail
RUN_DIR="${1:-}"
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO="${GRABBIN_REPO:-$(git -C "$SKILL_DIR" rev-parse --show-toplevel)}"
fail() { echo "FAIL: $*"; exit 1; }
echo "checkout: $REPO @ $(git -C "$REPO" rev-parse --short HEAD) ($(git -C "$REPO" branch --show-current))"
docker exec grabbin-featuremap-postgres pg_isready -U postgres >/dev/null 2>&1 || fail "local PostgreSQL (grabbin-featuremap-postgres) is not ready"
docker exec grabbin-featuremap-postgres psql -U postgres -tAc "select to_regclass('public.page_items') is not null" | grep -q t || fail "migrations not applied (page_items missing)"
# Probe IPv4 directly so the check matches the browser drivers.
[ "$(curl -fsS -m 5 http://127.0.0.1:3001/)" = '"OK"' ] || fail "API :3001 not answering OK"
curl -fsS -m 5 http://127.0.0.1:3001/auth/get-session >/dev/null || fail "API auth route not answering"
demo_html="$(curl -fsS -m 60 http://127.0.0.1:3000/demo)" || fail "web :3000 not answering /demo"
grep -q 'Interactive Link in Bio Demo' <<<"$demo_html" || fail "web :3000 /demo has unexpected content"
web_pid="$(ps -eo pid=,args= | awk -v root="$REPO" 'index($0, root "/apps/web/node_modules/.bin/vinext dev") { print $1; exit }')"
[ -n "$web_pid" ] || fail "cannot identify a Vinext server for this checkout"
web_cmd="$(tr '\0' ' ' <"/proc/$web_pid/cmdline" 2>/dev/null || true)"
case "$web_cmd" in *"$REPO/apps/web/node_modules/.bin/vinext dev"*) ;; *) fail "web server pid $web_pid does not point to this checkout" ;; esac
if [ -n "$RUN_DIR" ] && [ -f "$RUN_DIR/web.pid" ]; then
  echo "run-owned pids: web=$(cat "$RUN_DIR/web.pid") server=$(cat "$RUN_DIR/server.pid" 2>/dev/null)"
fi
echo "OK: stack healthy"
