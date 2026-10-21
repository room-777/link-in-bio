#!/usr/bin/env bash
set -euo pipefail
RUN_DIR="${1:?usage: doctor.sh <RUN_DIR>}"
ROOT="$(git rev-parse --show-toplevel)"
WEB_PORT="${FEATUREMAP_WEB_PORT:-3000}"
API_PORT="${FEATUREMAP_API_PORT:-3001}"
MOCK_PORT="${FEATUREMAP_MOCK_PORT:-3002}"
CONTAINER="$(cat "$RUN_DIR/db-container")"
[[ "$(docker inspect --format '{{ index .Config.Labels "codex.featuremap.local" }}' "$CONTAINER")" == true ]] || { echo "FAIL: unowned DB container" >&2; exit 1; }
docker exec "$CONTAINER" pg_isready -U postgres >/dev/null
docker exec "$CONTAINER" psql -U postgres -d grabbin_featuremap -tAc "select to_regclass('public.page_items') is not null" | grep -q t
[[ "$(curl -fsS -m 15 http://127.0.0.1:$API_PORT/)" == '"OK"' ]]
[[ "$(curl -fsS -m 3 http://127.0.0.1:$MOCK_PORT/health)" == '{"mode":"mock","upstreamConnections":0}' ]]
SIGN_IN_PAGE="$(curl -fsS -m 20 http://127.0.0.1:$WEB_PORT/sign-in)"
[[ "$SIGN_IN_PAGE" == *"Send OTP"* ]]
echo "OK: $ROOT @ $(git -C "$ROOT" rev-parse --short HEAD); migration/web .env loaded, local API bindings and dedicated DB/API/web/mock ready"
