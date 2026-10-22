#!/usr/bin/env bash
set -euo pipefail
RUN_DIR="${1:?usage: doctor.sh <RUN_DIR>}"
ROOT="$(git rev-parse --show-toplevel)"
USAGE="is unset; start the stack with bun run featuremap"
RUN_ID="${FEATUREMAP_RUN_ID:?FEATUREMAP_RUN_ID $USAGE}"
WEB_PORT="${FEATUREMAP_WEB_PORT:?FEATUREMAP_WEB_PORT $USAGE}"
API_PORT="${FEATUREMAP_API_PORT:?FEATUREMAP_API_PORT $USAGE}"
MOCK_PORT="${FEATUREMAP_MOCK_PORT:?FEATUREMAP_MOCK_PORT $USAGE}"
[[ "$(cat "$RUN_DIR/run-id")" == "$RUN_ID" ]] || { echo "FAIL: $RUN_DIR belongs to another run" >&2; exit 1; }
CONTAINER="$(cat "$RUN_DIR/db-container")"
STATE_DIR="$(cat "$RUN_DIR/state-dir")"
[[ -d "$STATE_DIR/r2-state" ]] || { echo "FAIL: missing local R2 dir $STATE_DIR/r2-state" >&2; exit 1; }
for name in web server mock-outbound; do kill -0 "$(cat "$RUN_DIR/$name.pid")" 2>/dev/null || { echo "FAIL: $name process exited; see $RUN_DIR/$name.log" >&2; exit 1; }; done
# Through DB_URL, the address the API and the tests use: it must answer with
# this run's id and have the migrated schema.
node "$ROOT/.agents/skills/verify-editor/harness/stack.ts" db-migrated || { echo "FAIL: DB_URL does not reach this run's migrated database" >&2; exit 1; }
[[ "$(curl -fsS -m 15 http://127.0.0.1:$API_PORT/)" == '"OK"' ]] || { echo "FAIL: API on $API_PORT" >&2; exit 1; }
[[ "$(curl -fsS -m 3 http://127.0.0.1:$MOCK_PORT/health)" == "{\"mode\":\"mock\",\"upstreamConnections\":0,\"runId\":\"$RUN_ID\"}" ]] || { echo "FAIL: mock on $MOCK_PORT is not this run's" >&2; exit 1; }
SIGN_IN_PAGE="$(curl -fsS -m 20 http://127.0.0.1:$WEB_PORT/sign-in)"
[[ "$SIGN_IN_PAGE" == *"Send OTP"* ]] || { echo "FAIL: web on $WEB_PORT" >&2; exit 1; }
echo "OK: $ROOT @ $(git -C "$ROOT" rev-parse --short HEAD); local API bindings and dedicated DB/API/web/mock ready; db=$CONTAINER state=$STATE_DIR"
