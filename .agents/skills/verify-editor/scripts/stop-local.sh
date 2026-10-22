#!/usr/bin/env bash
set -euo pipefail
RUN_DIR="${1:?usage: stop-local.sh <RUN_DIR>}"
for name in web server mock-outbound; do
	file="$RUN_DIR/$name.pid"
	if [[ -f "$file" ]]; then
		pid="$(cat "$file")"
		if kill -0 "$pid" 2>/dev/null; then pkill -TERM -P "$pid" 2>/dev/null || true; kill -TERM "$pid" 2>/dev/null || true; fi
	fi
done
# Only this run's container (matched by its run label) and state folder.
RUN_ID="$(cat "$RUN_DIR/run-id" 2>/dev/null || true)"
if [[ -n "$RUN_ID" ]]; then
	ids="$(docker ps -aq --filter "label=codex.featuremap.run=$RUN_ID")"
	[[ -z "$ids" ]] || docker rm -f $ids >/dev/null
	STATE_DIR="$(cat "$RUN_DIR/state-dir")"
	[[ "$STATE_DIR" == */grabbin-featuremap-"$RUN_ID" ]] && rm -rf "$STATE_DIR"
fi
echo "stopped run $RUN_ID: web/API/mock, its database container and its state folder"
