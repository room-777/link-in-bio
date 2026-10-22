#!/usr/bin/env bash
# `bun run featuremap`: starts the isolated feature-map stack, runs every
# journey (drive-parallel.mjs), and writes featuremap-results/ with
# summary.json, results.md/json, screenshots/ and logs/. Exits non-zero when
# any sub-feature fails or the stack does not start.
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
SKILL=.agents/skills/verify-editor/scripts
OUT="${FEATUREMAP_RESULTS_DIR:-$ROOT/featuremap-results}"
RUN_DIR="${FEATUREMAP_RUN_DIR:-$ROOT/artifacts/verify-editor/featuremap-$(date +%Y%m%d-%H%M%S)}"
export FEATUREMAP_COMMIT="${FEATUREMAP_COMMIT:-$(git rev-parse HEAD)}"
rm -rf "$OUT"
mkdir -p "$OUT/logs" "$RUN_DIR"
RUN_ERROR=""

finish() {
	local code=$?
	"$SKILL/stop-local.sh" "$RUN_DIR" >> "$OUT/logs/featuremap.log" 2>&1 || true
	cp "$RUN_DIR"/results.{md,json} "$OUT/" 2>/dev/null || true
	cp "$RUN_DIR"/*.log "$OUT/logs/" 2>/dev/null || true
	if [[ -d "$RUN_DIR/groups" ]]; then
		(cd "$RUN_DIR/groups" && find . \( -name '*.png' -o -name '*.aria.txt' \) -exec cp --parents {} "$OUT/screenshots/" \; 2>/dev/null) || true
		(cd "$RUN_DIR/groups" && find . \( -name '*.log' -o -name 'actions.md' -o -name 'results.*' \) -exec cp --parents {} "$OUT/logs/" \; 2>/dev/null) || true
	fi
	bun scripts/ci/featuremap-summary.ts "$RUN_DIR" "$SKILL/drive-all.mjs" "$OUT/summary.json" "$RUN_ERROR" || code=1
	[[ "$(jq -r .status "$OUT/summary.json" 2>/dev/null)" == passed ]] || code=1
	exit "$code"
}
trap finish EXIT
mkdir -p "$OUT/screenshots"

last_error() {
	grep -E '^([A-Za-z]*Error|FAIL)\b' "$1" | tail -n 1 | grep . || grep . "$1" | tail -n 1
}

step() {
	local name="$1"
	shift
	echo "▶ $name" | tee -a "$OUT/logs/featuremap.log"
	if ! "$@" >> "$OUT/logs/$name.log" 2>&1; then
		RUN_ERROR="$name failed: $(last_error "$OUT/logs/$name.log")"
		echo "✖ $RUN_ERROR" | tee -a "$OUT/logs/featuremap.log"
		return 1
	fi
}

"$SKILL/start-local.sh" "$RUN_DIR" > "$OUT/logs/start-local.log" 2>&1 &
STACK=$!
# start-local.sh prints `ready web=...` once API and web answer, then keeps
# serving; it exits only on failure, which also ends the tail below.
if ! timeout "${FEATUREMAP_START_TIMEOUT_S:-420}" grep -m1 -q '^ready ' \
	<(tail -n +1 -F --pid="$STACK" "$OUT/logs/start-local.log" 2>/dev/null); then
	RUN_ERROR="start-local failed: $(last_error "$OUT/logs/start-local.log")"
	echo "✖ $RUN_ERROR" | tee -a "$OUT/logs/featuremap.log"
	exit 1
fi
step doctor "$SKILL/doctor.sh" "$RUN_DIR" || exit 1
CONTAINER="$(cat "$RUN_DIR/db-container")"
if ! docker exec "$CONTAINER" psql -U postgres -d grabbin_featuremap -tAc \
	"select 1 from \"user\" where email='${FEATUREMAP_ACCOUNT:-featuremap@example.com}'" | grep -q 1; then
	step setup-account node "$SKILL/setup-account.mjs" "$RUN_DIR" || exit 1
fi
step warm node scripts/ci/featuremap-warm.ts || exit 1
echo "▶ drive-parallel" | tee -a "$OUT/logs/featuremap.log"
node "$SKILL/drive-parallel.mjs" "$RUN_DIR" 2>&1 | tee "$OUT/logs/drive-parallel.log"
