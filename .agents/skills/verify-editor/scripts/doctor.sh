#!/usr/bin/env bash
# Read-only: is the local stack worth driving? Exit 1 on the first failing check.
set -uo pipefail
RUN_DIR="${1:-}"
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO="${GRABBIN_REPO:-$(git -C "$SKILL_DIR" rev-parse --show-toplevel)}"
fail() { echo "FAIL: $*"; exit 1; }
echo "checkout: $REPO @ $(git -C "$REPO" rev-parse --short HEAD) ($(git -C "$REPO" branch --show-current))"
docker exec supabase_db_grabbin pg_isready -U postgres >/dev/null 2>&1 || fail "local Supabase Postgres (supabase_db_grabbin) is not ready"
docker exec supabase_db_grabbin psql -U postgres -tAc "select to_regclass('public.page_items') is not null" | grep -q t || fail "migrations not applied (page_items missing)"
[ "$(curl -fsS -m 5 http://127.0.0.1:3001/)" = '"OK"' ] || fail "API :3001 not answering OK"
curl -fsS -m 5 http://127.0.0.1:3001/auth/get-session >/dev/null || fail "API auth route not answering"
demo_html="$(curl -fsS -m 60 http://127.0.0.1:3000/demo)" || fail "web :3000 not answering /demo"
grep -q 'Interactive Link in Bio Demo' <<<"$demo_html" || fail "web :3000 /demo has unexpected content"
web_pid="$(ss -ltnp 'sport = :3000' | grep -o 'pid=[0-9]*' | head -1 | cut -d= -f2)"
web_cwd="$(readlink "/proc/$web_pid/cwd" 2>/dev/null || true)"
case "$web_cwd" in "$REPO"/*) ;; *) fail "port 3000 is owned by pid $web_pid in '$web_cwd', not this checkout" ;; esac
if [ -n "$RUN_DIR" ] && [ -f "$RUN_DIR/web.pid" ]; then
  echo "run-owned pids: web=$(cat "$RUN_DIR/web.pid") server=$(cat "$RUN_DIR/server.pid" 2>/dev/null)"
fi
echo "OK: stack healthy"
