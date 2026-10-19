#!/usr/bin/env bash
# Boot the local feature-map stack: PostgreSQL and `bun run dev` (alchemy dev)
# on 127.0.0.1. Alchemy supplies local R2.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$ROOT"

BUN_VERSION="1.4.0"
BUN_INSTALL="${BUN_INSTALL:-${HOME}/.bun}"
export BUN_INSTALL
export PATH="/usr/local/bin:${BUN_INSTALL}/bin:${PATH}"
PG_CONTAINER="grabbin-featuremap-postgres"

ensure_bun() {
	local installed=""
	if command -v bun >/dev/null 2>&1; then
		installed="$(bun --version)"
	fi
	if [[ "$installed" != "$BUN_VERSION" ]]; then
		curl -fsSL https://bun.sh/install | bash -s "bun-v${BUN_VERSION}"
		export PATH="${BUN_INSTALL}/bin:${PATH}"
	fi
}

ensure_bun
bun install --frozen-lockfile

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
	printf '%s\n' "CLOUDFLARE_API_TOKEN is required for bun run dev; provide a non-production token and rerun." >&2
	exit 1
fi

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

load_feature_map_env() {
	# Load tracked feature-map values; never read or rewrite a developer's .env.
	set -a
	. apps/server/.env.example
	. apps/web/.env.example
	set +a

	export BETTER_AUTH_URL=http://127.0.0.1:3001
	export CORS_ORIGIN=http://127.0.0.1:3000
	export CREEM_SUCCESS_URL=http://127.0.0.1:3000/
	export DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres
	export DATABASE_URL_LOCAL=postgres://postgres:postgres@127.0.0.1:5432/postgres
	export PAGE_DOMAIN=127.0.0.1:3000
	# Keep local verification isolated from mail, billing, SaaS, and telemetry APIs.
	export RESEND_API_KEY=
	export CREEM_API_KEY=local-verification-key
	export CREEM_WEBHOOK_SECRET=local-verification-secret
	export CLOUDFLARE_SAAS_API_TOKEN=
	export SENTRY_AUTH_TOKEN=
	export CREEM_PRO_MONTHLY_PRODUCT_ID=local-pro
	export CREEM_PRO_YEARLY_PRODUCT_ID=
	export NEXT_PUBLIC_SERVER_URL=http://127.0.0.1:3001
	export NEXT_PUBLIC_PAGE_DOMAIN=127.0.0.1:3000
	export NEXT_PUBLIC_GA_MEASUREMENT_ID=
	export NEXT_PUBLIC_R2_PUBLIC_URL=http://127.0.0.1:3001
	export R2_PUBLIC_URL=http://127.0.0.1:3001
	export FEATURE_MAP_LOCAL_STACK=true
	export FEATURE_MAP_MOCK_EXTERNAL_APIS=true
	export NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=feature-map-test-token
}

start_postgres() {
	if docker exec "$PG_CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then
		return
	fi
	if docker container inspect "$PG_CONTAINER" >/dev/null 2>&1; then
		docker start "$PG_CONTAINER" >/dev/null
	else
		docker run --detach \
			--name "$PG_CONTAINER" \
			--restart unless-stopped \
			--publish 127.0.0.1:5432:5432 \
			--env POSTGRES_USER=postgres \
			--env POSTGRES_PASSWORD=postgres \
			--env POSTGRES_DB=postgres \
			--volume grabbin-featuremap-postgres-data:/var/lib/postgresql/data \
			postgres:15-alpine >/dev/null
	fi
	for _ in $(seq 1 60); do
		if docker exec "$PG_CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then
			return
		fi
		sleep 1
	done
	log "local Postgres did not become ready" >&2
	exit 1
}

stack_ready() {
	curl -fsS -m 5 http://127.0.0.1:3001/ >/dev/null 2>&1 \
		&& curl -fsS -m 20 http://127.0.0.1:3000/ >/dev/null 2>&1 \
		&& [[ "$(curl -sS -m 2 -o /dev/null -w '%{http_code}' http://127.0.0.1:3002/ 2>/dev/null)" == "404" ]]
}

stop_fallback_stack() {
	local stop_script=".agents/skills/verify-editor/scripts/stop-local.sh"
	local port busy
	if [[ -d /tmp/grabbin-dev && -x "$stop_script" ]]; then
		"$stop_script" /tmp/grabbin-dev || true
	fi
	for _ in $(seq 1 20); do
		busy=0
		for port in 3000 3001 3002; do
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
	for port in 3000 3001 3002; do
		if ss -ltn "sport = :${port}" | grep -q LISTEN; then
			log "port ${port} is in use" >&2
			exit 1
		fi
	done
}

start_dockerd
load_feature_map_env
start_postgres

NODE_ENV=development \
	DATABASE_URL_LOCAL=postgres://postgres:postgres@127.0.0.1:5432/postgres \
	DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres \
	bun run --filter @grabbin/db db:migrate:deploy
.agents/skills/verify-editor/scripts/prepare-feature-map-account.sh

if stack_ready && [[ ! -e /tmp/grabbin-dev/server.pid && ! -e /tmp/grabbin-dev/web.pid ]]; then
	log "grabbin already ready: web http://127.0.0.1:3000  api http://127.0.0.1:3001"
	exit 0
fi

stop_fallback_stack
assert_ports_free

account_id="$(resolve_account_id)"
register_cloudflare_profile "$account_id"
log "starting bun run dev"
exec bun run dev
