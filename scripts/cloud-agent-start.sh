#!/usr/bin/env bash
# Boot the shared local stack used by every cloud coding agent: Supabase
# Postgres and `bun run dev` (alchemy dev) on localhost. Alchemy supplies local R2.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export PATH="/usr/local/bin:${HOME}/.bun/bin:${PATH}"
BUN_VERSION="1.4.0"
SUPABASE_CLI_VERSION="2.121.0"

ensure_bun() {
	local installed=""
	if command -v bun >/dev/null 2>&1; then
		installed="$(bun --version)"
	fi
	if [[ "$installed" != "$BUN_VERSION" ]]; then
		export BUN_INSTALL="${HOME}/.bun"
		curl -fsSL https://bun.sh/install | bash -s "bun-v${BUN_VERSION}"
		export PATH="${BUN_INSTALL}/bin:${PATH}"
	fi
}

ensure_supabase_cli() {
	local installed=""
	if command -v supabase >/dev/null 2>&1; then
		installed="$(supabase --version | tr -d '\r\n')"
	fi
	if [[ "$installed" != "$SUPABASE_CLI_VERSION" ]]; then
		bun add --global "supabase@${SUPABASE_CLI_VERSION}"
		export PATH="${HOME}/.bun/bin:${PATH}"
	fi
}

ensure_bun
ensure_supabase_cli
bun install --frozen-lockfile

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
	printf '%s\n' "CLOUDFLARE_API_TOKEN is required for bun run dev; configure it as a cloud environment secret and rerun." >&2
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

write_localhost_env() {
	# Rebuild both ignored env files from the tracked templates on every run so
	# provider-specific local overrides cannot drift across agent environments.
	cp apps/server/.env.example apps/server/.env
	cp apps/web/.env.example apps/web/.env
	python3 - <<'PY'
from pathlib import Path

def update_env(path, values, template=None):
    path = Path(path)
    if not path.exists():
        path.write_text(Path(template).read_text())
    lines = path.read_text().splitlines()
    seen = set()
    result = []
    for line in lines:
        key = line.partition("=")[0]
        if key in values:
            result.append(f"{key}={values[key]}")
            seen.add(key)
        else:
            result.append(line)
    for key, value in values.items():
        if key not in seen:
            result.append(f"{key}={value}")
    path.write_text("\n".join(result) + "\n")

update_env("apps/server/.env", {
    "BETTER_AUTH_URL": "http://localhost:3001",
    "CORS_ORIGIN": "http://localhost:3000",
    "DATABASE_URL": "postgres://postgres:postgres@127.0.0.1:54322/postgres",
    "DATABASE_URL_LOCAL": "postgres://postgres:postgres@127.0.0.1:54322/postgres",
    # Keep local verification isolated from mail, billing, SaaS, and telemetry APIs.
    "RESEND_API_KEY": "",
    "CREEM_API_KEY": "",
    "CREEM_WEBHOOK_SECRET": "",
    "CLOUDFLARE_SAAS_API_TOKEN": "",
    "SENTRY_AUTH_TOKEN": "",
    "CREEM_PRO_MONTHLY_PRODUCT_ID": "local-pro",
    "CREEM_PRO_YEARLY_PRODUCT_ID": "",
}, "apps/server/.env.example")
update_env("apps/web/.env", {
    "NEXT_PUBLIC_SERVER_URL": "http://localhost:3001",
    "NEXT_PUBLIC_PAGE_DOMAIN": "localhost:3000",
}, "apps/web/.env.example")
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

bun run --filter @grabbin/db db:migrate:deploy
scripts/prepare-feature-map-account.sh

if stack_ready && [[ ! -e /tmp/grabbin-dev/server.pid && ! -e /tmp/grabbin-dev/web.pid ]]; then
	log "grabbin already ready: web http://localhost:3000  api http://localhost:3001"
	exit 0
fi

stop_fallback_stack
assert_ports_free

account_id="$(resolve_account_id)"
register_cloudflare_profile "$account_id"
log "starting bun run dev"
exec bun run dev
