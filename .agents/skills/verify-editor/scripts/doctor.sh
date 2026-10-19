#!/usr/bin/env bash
set -euo pipefail
RUN_DIR="${1:?usage: doctor.sh <RUN_DIR>}"
ROOT="$(git rev-parse --show-toplevel)"
CONTAINER="$(cat "$RUN_DIR/db-container")"
[[ "$(docker inspect --format '{{ index .Config.Labels "codex.featuremap.local" }}' "$CONTAINER")" == true ]] || { echo "FAIL: unowned DB container" >&2; exit 1; }
docker exec "$CONTAINER" pg_isready -U postgres >/dev/null
docker exec "$CONTAINER" psql -U postgres -d grabbin_featuremap -tAc "select to_regclass('public.page_items') is not null" | grep -q t
[[ "$(curl -fsS -m 15 http://127.0.0.1:3001/)" == '"OK"' ]]
[[ "$(curl -fsS -m 3 http://127.0.0.1:3002/health)" == '{"mode":"mock","upstreamConnections":0}' ]]
SIGN_IN_PAGE="$(curl -fsS -m 20 http://127.0.0.1:3000/sign-in)"
[[ "$SIGN_IN_PAGE" == *"Send OTP"* ]]
echo "OK: $ROOT @ $(git -C "$ROOT" rev-parse --short HEAD); migration/web .env loaded, local API bindings and dedicated DB/API/web/mock ready"
