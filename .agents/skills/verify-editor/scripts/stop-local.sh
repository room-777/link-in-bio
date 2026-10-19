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
echo "stopped run-owned web/API/mock; persistent labeled test DB remains available for the next run"
