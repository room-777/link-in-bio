#!/usr/bin/env bash
# Boot the same local stack the verify-editor skill prefers: Supabase Postgres
# and `bun run dev` (alchemy dev) on localhost. Alchemy supplies local R2.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export PATH="/usr/local/bin:${HOME}/.bun/bin:${PATH}"

log() {
	printf '%s\n' "$*"
}

start_dockerd() {
	if docker info >/dev/null 2>&1; then
		return
	fi
	sudo iptables -P FORWARD ACCEPT || true
	if ! pgrep -x dockerd >/dev/null 2>&1; then
		sudo nohup dockerd --host=unix:///var/run/docker.sock >/tmp/dockerd.log 2>&1 &
	fi
	for _ in $(seq 1 60); do
		if [[ -S /var/run/docker.sock ]]; then
			sudo chmod 666 /var/run/docker.sock || true
		fi
		if docker info >/dev/null 2>&1; then
			return
		fi
		sleep 1
	done
	log "dockerd did not become ready" >&2
	exit 1
}

write_localhost_env() {
	cp apps/server/.env.example apps/server/.env
	python3 - <<'PY'
from pathlib import Path

lines = []
for line in Path("apps/web/.env.example").read_text().splitlines():
    if line.startswith("NEXT_PUBLIC_SERVER_URL="):
        lines.append("NEXT_PUBLIC_SERVER_URL=http://localhost:3001")
    elif line.startswith("NEXT_PUBLIC_PAGE_DOMAIN="):
        lines.append("NEXT_PUBLIC_PAGE_DOMAIN=localhost:3000")
    else:
        lines.append(line)
Path("apps/web/.env").write_text("\n".join(lines) + "\n")
PY
}

start_postgres() {
	if docker exec supabase_db_grabbin pg_isready -U postgres >/dev/null 2>&1; then
		return
	fi
	sudo iptables -P FORWARD ACCEPT || true
	bun run db:local:supabase
	for _ in $(seq 1 60); do
		if docker exec supabase_db_grabbin pg_isready -U postgres >/dev/null 2>&1; then
			return
		fi
		sleep 1
	done
	log "local Postgres did not become ready" >&2
	exit 1
}

stack_ready() {
	curl -fsS -m 5 http://localhost:3001/ >/dev/null 2>&1 \
		&& curl -fsS -m 20 http://localhost:3000/ >/dev/null 2>&1
}

stop_fallback_stack() {
	local stop_script=".agents/skills/verify-editor/scripts/stop-local.sh"
	local port busy
	if [[ -d /tmp/grabbin-dev && -x "$stop_script" ]]; then
		"$stop_script" /tmp/grabbin-dev || true
	fi
	for _ in $(seq 1 20); do
		busy=0
		for port in 3000 3001; do
			if ss -ltn "sport = :${port}" | grep -q LISTEN; then
				busy=1
			fi
		done
		if [[ "$busy" == 0 ]]; then
			return
		fi
		sleep 1
	done
}

resolve_account_id() {
	if [[ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
		printf '%s' "$CLOUDFLARE_ACCOUNT_ID"
		return
	fi
	curl -fsS --max-time 30 \
		-H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
		https://api.cloudflare.com/client/v4/accounts \
		| python3 -c '
import json, sys
body = json.load(sys.stdin)
if not body.get("success"):
    sys.stderr.write("Cloudflare accounts request failed\n")
    sys.exit(1)
accounts = body.get("result") or []
if len(accounts) != 1:
    sys.stderr.write(
        "CLOUDFLARE_ACCOUNT_ID is required (%s accounts visible)\n" % len(accounts)
    )
    sys.exit(1)
sys.stdout.write(accounts[0]["id"])
'
}

register_cloudflare_profile() {
	local account_id="$1"
	local -a action
	if (
		cd packages/infra
		bun ./node_modules/.bin/alchemy profile show --no-input 2>/dev/null | grep -Eiq 'cloudflare'
	); then
		action=(--reconfigure Cloudflare)
	else
		action=(--add Cloudflare)
	fi
	(
		cd packages/infra
		bun ./node_modules/.bin/alchemy profile edit \
			"${action[@]}" \
			--method stored \
			--set apiToken=env:CLOUDFLARE_API_TOKEN \
			--set "accountId=${account_id}" \
			--no-input
	)
}

assert_ports_free() {
	local port
	for port in 3000 3001; do
		if ss -ltn "sport = :${port}" | grep -q LISTEN; then
			log "port ${port} is in use" >&2
			exit 1
		fi
	done
}

start_dockerd
write_localhost_env
start_postgres

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
	log "CLOUDFLARE_API_TOKEN is required for bun run dev" >&2
	exit 1
fi

if stack_ready && [[ ! -e /tmp/grabbin-dev/server.pid && ! -e /tmp/grabbin-dev/web.pid ]]; then
	log "grabbin already ready: web http://localhost:3000  api http://localhost:3001"
	exit 0
fi

stop_fallback_stack
assert_ports_free

account_id="$(resolve_account_id)"
register_cloudflare_profile "$account_id"
bun run --filter @grabbin/db db:migrate:deploy
log "starting bun run dev"
exec bun run dev
