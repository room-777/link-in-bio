#!/usr/bin/env bash
set -euo pipefail
RUN_DIR="${1:?usage: start-local.sh <RUN_DIR>}"
ROOT="$(git rev-parse --show-toplevel)"
WEB_PORT="${FEATUREMAP_WEB_PORT:-3000}"
API_PORT="${FEATUREMAP_API_PORT:-3001}"
MOCK_PORT="${FEATUREMAP_MOCK_PORT:-3002}"
DB_PORT="${FEATUREMAP_DB_PORT:-15432}"
# One container and volume per DB port, so a second stack never reuses the
# first stack's container. The default port keeps the original names.
SUFFIX="$([[ "$DB_PORT" == 15432 ]] || echo "-$DB_PORT")"
CONTAINER="grabbin-featuremap$SUFFIX"
VOLUME="grabbin-featuremap-agent-data$SUFFIX"
# Owner browser state and local R2 are per DB port too, so concurrent stacks
# never overwrite each other's login or uploads. local.mjs uses the same rule.
STATE_DIR="$HOME/.cache/grabbin-featuremap$([[ -z "$SUFFIX" ]] || echo "/$DB_PORT")"
DB_URL="postgres://postgres:postgres@127.0.0.1:$DB_PORT/grabbin_featuremap"
SERVER_ENV="$ROOT/apps/server/.env"
WEB_ENV="$ROOT/apps/web/.env"
[[ -f "$SERVER_ENV" && -f "$WEB_ENV" ]] || { echo "apps/server/.env and apps/web/.env are required" >&2; exit 1; }
mkdir -p "$RUN_DIR"
RUN_DIR="$(cd "$RUN_DIR" && pwd)"
# The configured host binding, read from HostConfig so it is known even while
# the container is stopped (`docker port` only reports running containers).
bound_port() { docker inspect --format '{{ range (index .HostConfig.PortBindings "5432/tcp") }}{{ .HostIp }}:{{ .HostPort }} {{ end }}' "$CONTAINER" 2>/dev/null | xargs; }
for port in "$WEB_PORT" "$API_PORT" "$MOCK_PORT" "$DB_PORT"; do
	if [[ "$port" == "$DB_PORT" ]] && docker container inspect "$CONTAINER" >/dev/null 2>&1 && [[ "$(docker inspect --format '{{ index .Config.Labels "codex.featuremap.local" }}' "$CONTAINER")" == true ]] && [[ "$(bound_port)" == "127.0.0.1:$DB_PORT" ]]; then continue; fi
	if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then echo "port $port occupied" >&2; exit 1; fi
done
if docker container inspect "$CONTAINER" >/dev/null 2>&1; then
	[[ "$(docker inspect --format '{{ index .Config.Labels "codex.featuremap.local" }}' "$CONTAINER")" == true ]] || { echo "unowned container exists" >&2; exit 1; }
	[[ "$(bound_port)" == "127.0.0.1:$DB_PORT" ]] || { echo "$CONTAINER publishes '$(bound_port)', not 127.0.0.1:$DB_PORT" >&2; exit 1; }
	docker start "$CONTAINER" >/dev/null
else
	docker volume create "$VOLUME" >/dev/null
	docker run -d --name "$CONTAINER" --label codex.featuremap.local=true --publish 127.0.0.1:$DB_PORT:5432 --env POSTGRES_USER=postgres --env POSTGRES_PASSWORD=postgres --env POSTGRES_DB=postgres --volume "$VOLUME:/var/lib/postgresql/data" postgres:15-alpine >/dev/null
fi
echo "$CONTAINER" > "$RUN_DIR/db-container"
echo "$STATE_DIR" > "$RUN_DIR/state-dir"
for _ in $(seq 1 60); do docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done
docker exec "$CONTAINER" pg_isready -U postgres >/dev/null
if ! docker exec "$CONTAINER" psql -U postgres -tAc "select 1 from pg_database where datname='grabbin_featuremap'" | grep -q 1; then docker exec "$CONTAINER" createdb -U postgres grabbin_featuremap; fi
env -i PATH="$PATH" HOME="$HOME" TMPDIR="${TMPDIR:-/tmp}" NODE_ENV=development DATABASE_URL="$DB_URL" DATABASE_URL_LOCAL="$DB_URL" bun --env-file="$SERVER_ENV" run --filter @grabbin/db db:migrate:deploy
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
env -i PATH="$PATH" HOME="$HOME" TMPDIR="${TMPDIR:-/tmp}" OUTBOUND_PROXY_PORT="$MOCK_PORT" OUTBOUND_MOCK_LOG="$RUN_DIR/mock-requests.log" nohup node "$ROOT/.agents/skills/verify-editor/scripts/mock-outbound.mjs" > "$RUN_DIR/mock-outbound.log" 2>&1 < /dev/null &
echo $! > "$RUN_DIR/mock-outbound.pid"
cd "$SOURCE/apps/server"
env -i PATH="$PATH" HOME="$HOME" TMPDIR="${TMPDIR:-/tmp}" NODE_ENV=development nohup "$ROOT/apps/web/node_modules/.bin/wrangler" dev --config "$RUN_DIR/server.wrangler.jsonc" --port "$API_PORT" --ip 127.0.0.1 --persist-to "$STATE_DIR/r2-state" > "$RUN_DIR/server.log" 2>&1 < /dev/null &
echo $! > "$RUN_DIR/server.pid"
cd "$SOURCE/apps/web"
env -i PATH="$PATH" HOME="$HOME" TMPDIR="${TMPDIR:-/tmp}" NODE_ENV=development SKIP_ENV_VALIDATION=1 NEXT_PUBLIC_SERVER_URL=http://127.0.0.1:$API_PORT NEXT_PUBLIC_PAGE_DOMAIN=127.0.0.1:$WEB_PORT NEXT_PUBLIC_R2_PUBLIC_URL=http://127.0.0.1:$API_PORT nohup bun --env-file="$WEB_ENV" run dev:bare -- --hostname 127.0.0.1 --port "$WEB_PORT" > "$RUN_DIR/web.log" 2>&1 < /dev/null &
echo $! > "$RUN_DIR/web.pid"
for _ in $(seq 1 120); do
	if [[ "$(curl -sS -m 2 -o /dev/null -w '%{http_code}' http://127.0.0.1:$API_PORT/ 2>/dev/null || true)" == 200 && "$(curl -sS -m 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:$WEB_PORT/sign-in 2>/dev/null || true)" == 200 ]]; then echo "ready web=http://127.0.0.1:$WEB_PORT api=http://127.0.0.1:$API_PORT db=$DB_URL"; wait "$(cat "$RUN_DIR/server.pid")"; exit 0; fi
	sleep 2
done
echo "local stack not ready; logs: $RUN_DIR" >&2
exit 1
