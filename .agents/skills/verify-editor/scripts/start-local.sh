#!/usr/bin/env bash
set -euo pipefail
RUN_DIR="${1:?usage: start-local.sh <RUN_DIR>}"
ROOT="$(git rev-parse --show-toplevel)"
# `bun run featuremap` claims the run id and free ports (harness/stack.ts) and
# passes them here; there are no default ports to collide on.
USAGE="is unset; start the stack with bun run featuremap"
RUN_ID="${FEATUREMAP_RUN_ID:?FEATUREMAP_RUN_ID $USAGE}"
WEB_PORT="${FEATUREMAP_WEB_PORT:?FEATUREMAP_WEB_PORT $USAGE}"
API_PORT="${FEATUREMAP_API_PORT:?FEATUREMAP_API_PORT $USAGE}"
MOCK_PORT="${FEATUREMAP_MOCK_PORT:?FEATUREMAP_MOCK_PORT $USAGE}"
DB_PORT="${FEATUREMAP_DB_PORT:?FEATUREMAP_DB_PORT $USAGE}"
WEB_INSPECTOR_PORT="${FEATUREMAP_WEB_INSPECTOR_PORT:?FEATUREMAP_WEB_INSPECTOR_PORT $USAGE}"
API_INSPECTOR_PORT="${FEATUREMAP_API_INSPECTOR_PORT:?FEATUREMAP_API_INSPECTOR_PORT $USAGE}"
STACK="$ROOT/.agents/skills/verify-editor/harness/stack.ts"
CONTAINER="grabbin-featuremap-$RUN_ID"
STATE_DIR="${TMPDIR:-/tmp}/grabbin-featuremap-$RUN_ID"
DB_URL="postgres://postgres:postgres@127.0.0.1:$DB_PORT/grabbin_featuremap"
mkdir -p "$RUN_DIR"
RUN_DIR="$(cd "$RUN_DIR" && pwd)"
echo "$RUN_ID" > "$RUN_DIR/run-id"
echo "$CONTAINER" > "$RUN_DIR/db-container"
echo "$STATE_DIR" > "$RUN_DIR/state-dir"
node "$STACK" ports
# A fresh database per run, on tmpfs. The server reports the run id as
# featuremap.run_id, and nothing migrates until DB_URL answers with it: the
# address could reach another stack's or another Docker daemon's Postgres.
docker run -d --rm --name "$CONTAINER" --label codex.featuremap.local=true --label codex.featuremap.run="$RUN_ID" --publish "127.0.0.1:$DB_PORT:5432" --tmpfs /var/lib/postgresql/data --env POSTGRES_USER=postgres --env POSTGRES_PASSWORD=postgres --env POSTGRES_DB=grabbin_featuremap postgres:15-alpine -c featuremap.run_id="$RUN_ID" >/dev/null
# Over TCP inside the container: a new container's init server answers on the
# Unix socket only, then restarts, so a socket check can pass too early.
for _ in $(seq 1 60); do docker exec "$CONTAINER" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1 && break; sleep 1; done
docker exec "$CONTAINER" pg_isready -h 127.0.0.1 -U postgres >/dev/null
node "$STACK" db
env -i PATH="$PATH" HOME="$HOME" TMPDIR="${TMPDIR:-/tmp}" NODE_ENV=development DATABASE_URL="$DB_URL" DATABASE_URL_LOCAL="$DB_URL" bun run --filter @grabbin/db db:migrate:deploy
SOURCE="$ROOT"
cat > "$RUN_DIR/server.wrangler.jsonc" <<JSON
{
 "name":"grabbin-featuremap-agent-local",
 "main":"$SOURCE/apps/server/src/index.ts",
 "compatibility_date":"2026-09-01",
 "compatibility_flags":["nodejs_compat"],
 "hyperdrive":[{"binding":"HYPERDRIVE","id":"featuremap-agent-local","localConnectionString":"$DB_URL"}],
 "r2_buckets":[{"binding":"R2_BUCKET","bucket_name":"featuremap-agent-local"}],
 "vars":{
  "BETTER_AUTH_SECRET":"local-only-featuremap-secret-2026",
  "BETTER_AUTH_URL":"http://127.0.0.1:$API_PORT","CORS_ORIGIN":"http://127.0.0.1:$WEB_PORT",
  "CREEM_API_KEY":"local-only","CREEM_WEBHOOK_SECRET":"local-only","CREEM_TEST_MODE":"true",
  "CREEM_SUCCESS_URL":"http://127.0.0.1:$WEB_PORT/","CREEM_PRO_MONTHLY_PRODUCT_ID":"local-pro","CREEM_PRO_YEARLY_PRODUCT_ID":"",
  "RESEND_API_KEY":"","RESEND_FROM_EMAIL":"","RESEND_OTP_TEMPLATE_ID":"","RESEND_ACCOUNT_DELETION_TEMPLATE_ID":"",
  "PAGE_DOMAIN":"127.0.0.1:$WEB_PORT","R2_PUBLIC_URL":"http://127.0.0.1:$API_PORT","R2_LOCAL_MODE":"true","LOCAL_OUTBOUND_PROXY_URL":"http://127.0.0.1:$MOCK_PORT",
  "R2_S3_CREDENTIALS":"{\"endpoint\":\"http://127.0.0.1:$API_PORT/media\",\"bucketName\":\"featuremap-agent-local\",\"region\":\"auto\",\"accessKeyId\":\"featuremap-local\",\"secretAccessKey\":\"featuremap-local\"}",
  "SENTRY_DSN":"","GA_MEASUREMENT_ID":"","GA_MEASUREMENT_PROTOCOL_API_SECRET":"","GA_MEASUREMENT_PROTOCOL_MODE":"validate"
 }
}
JSON
mkdir -p "$STATE_DIR/r2-state"
env -i PATH="$PATH" HOME="$HOME" TMPDIR="${TMPDIR:-/tmp}" OUTBOUND_PROXY_PORT="$MOCK_PORT" FEATUREMAP_RUN_ID="$RUN_ID" OUTBOUND_MOCK_LOG="$RUN_DIR/mock-requests.log" nohup node "$ROOT/.agents/skills/verify-editor/scripts/mock-outbound.ts" > "$RUN_DIR/mock-outbound.log" 2>&1 < /dev/null &
echo $! > "$RUN_DIR/mock-outbound.pid"
cd "$SOURCE/apps/server"
env -i PATH="$PATH" HOME="$HOME" TMPDIR="${TMPDIR:-/tmp}" NODE_ENV=development nohup "$ROOT/apps/web/node_modules/.bin/wrangler" dev --config "$RUN_DIR/server.wrangler.jsonc" --port "$API_PORT" --inspector-port "$API_INSPECTOR_PORT" --ip 127.0.0.1 --persist-to "$STATE_DIR/r2-state" > "$RUN_DIR/server.log" 2>&1 < /dev/null &
echo $! > "$RUN_DIR/server.pid"
cd "$SOURCE/apps/web"
env -i PATH="$PATH" HOME="$HOME" TMPDIR="${TMPDIR:-/tmp}" NODE_ENV=development SKIP_ENV_VALIDATION=1 FEATUREMAP_WEB_INSPECTOR_PORT="$WEB_INSPECTOR_PORT" NEXT_PUBLIC_SERVER_URL=http://127.0.0.1:$API_PORT NEXT_PUBLIC_PAGE_DOMAIN=127.0.0.1:$WEB_PORT NEXT_PUBLIC_R2_PUBLIC_URL=http://127.0.0.1:$API_PORT NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.featuremap-local-fixture NEXT_PUBLIC_CREEM_PRO_MONTHLY_PRODUCT_ID=local-pro nohup bun run dev:bare -- --hostname 127.0.0.1 --port "$WEB_PORT" > "$RUN_DIR/web.log" 2>&1 < /dev/null &
echo $! > "$RUN_DIR/web.pid"
for _ in $(seq 1 120); do
	for name in web server mock-outbound; do kill -0 "$(cat "$RUN_DIR/$name.pid")" 2>/dev/null || { echo "$name exited before the stack was ready; see $RUN_DIR/$name.log" >&2; exit 1; }; done
	if [[ "$(curl -sS -m 2 -o /dev/null -w '%{http_code}' http://127.0.0.1:$API_PORT/ 2>/dev/null || true)" == 200 && "$(curl -sS -m 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:$WEB_PORT/sign-in 2>/dev/null || true)" == 200 ]]; then echo "ready web=http://127.0.0.1:$WEB_PORT api=http://127.0.0.1:$API_PORT db=$DB_URL"; wait "$(cat "$RUN_DIR/server.pid")"; exit 0; fi
	sleep 2
done
echo "local stack not ready; logs: $RUN_DIR" >&2
exit 1
