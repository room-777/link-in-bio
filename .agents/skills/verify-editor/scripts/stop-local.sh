#!/usr/bin/env bash
# Stop only the process groups start-local.sh recorded in RUN_DIR. Evidence is never touched.
set -uo pipefail
RUN_DIR="${1:?usage: stop-local.sh <RUN_DIR>}"
for name in web server; do
  pidfile="$RUN_DIR/$name.pid"
  [ -f "$pidfile" ] || continue
  pid="$(cat "$pidfile")"
  kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
  rm -f "$pidfile"
done
sleep 3
for port in 3000 3001; do
  ss -ltn "sport = :$port" | grep -q LISTEN && echo "port $port still in use" >&2
done
exit 0
