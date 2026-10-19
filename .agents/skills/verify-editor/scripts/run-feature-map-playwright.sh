#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
RUN_ID="${FEATURE_MAP_RUN_ID:-ci-${GITHUB_RUN_ID:-local}-$$}"
RUN_DIR=""
EVIDENCE_DIR="$ROOT/artifacts/verify-editor/$RUN_ID"
mkdir -p "$EVIDENCE_DIR"
printf '%s\n' 'RUNNING' >"$EVIDENCE_DIR/run-status.txt"
git -C "$ROOT" rev-parse HEAD >"$EVIDENCE_DIR/revision"
export FEATURE_MAP_RUN_ID="$RUN_ID"

cleanup() {
	local result=$?
	if [[ -n "${APP_PID:-}" ]]; then
		kill "$APP_PID" 2>/dev/null || true
		wait "$APP_PID" 2>/dev/null || true
	fi
	if [[ -n "$RUN_DIR" ]]; then rm -rf "$RUN_DIR"; fi
	printf 'exit_code=%s\n' "$result" >"$EVIDENCE_DIR/run-status.txt"
	return "$result"
}
trap cleanup EXIT INT TERM

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
	printf '%s\n' "CLOUDFLARE_API_TOKEN is required for Alchemy's local R2 test runtime." >&2
	exit 1
fi
if curl -fsS --max-time 2 http://127.0.0.1:3000/ >/dev/null 2>&1 \
	|| curl -fsS --max-time 2 http://127.0.0.1:3001/ >/dev/null 2>&1; then
	printf '%s\n' "A local app already uses port 3000 or 3001; stop it before starting the feature-map suite." >&2
	exit 1
fi

RUN_DIR="$(mktemp -d "${TMPDIR:-/tmp}/grabbin-feature-map.XXXXXX")"
export PLAYWRIGHT_STORAGE_STATE="$RUN_DIR/auth-state.json"
cd "$ROOT"
.agents/skills/verify-editor/scripts/feature-map-start.sh >"$EVIDENCE_DIR/app.log" 2>&1 &
APP_PID=$!

ready=0
for _ in $(seq 1 180); do
	if .agents/skills/verify-editor/scripts/doctor.sh "$RUN_DIR" >"$EVIDENCE_DIR/doctor.log" 2>&1; then
		ready=1
		break
	fi
	if ! kill -0 "$APP_PID" 2>/dev/null; then
		cat "$EVIDENCE_DIR/app.log" >&2
		exit 1
	fi
	sleep 2
done
if [[ "$ready" != 1 ]]; then
	cat "$EVIDENCE_DIR/doctor.log" >&2
	cat "$EVIDENCE_DIR/app.log" >&2
	exit 1
fi

bun run test:feature-map
