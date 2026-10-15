#!/usr/bin/env bash
# One test-environment setup for every machine: the Grok Bot box, Cursor
# cloud agents and Codex cloud environments.
#
#   bash scripts/test-env.sh setup   # needs internet: toolchain, deps, Postgres binaries
#   bash scripts/test-env.sh test    # offline: verify + local-Postgres integration tests
#
# No secrets are needed or read. Tests only use a throwaway Postgres cluster
# that this script creates under a temp dir on TEST_PG_PORT (default 55432).
# It never touches port 54322 (shared Supabase), 3000/3001 (dev servers),
# production databases or the production R2 bucket.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

TOOLS="${GRABBIN_TOOLS_DIR:-$HOME/.local/grabbin-tools}"
NODE_MAJOR="$(tr -d '[:space:]' < .node-version)"
BUN_VERSION="$(sed -n 's/.*"packageManager": *"bun@\([^"]*\)".*/\1/p' package.json)"
PG_PORT="${TEST_PG_PORT:-55432}"
PG_DIR="${TEST_PG_DIR:-${TMPDIR:-/tmp}/grabbin-test-pg}"

export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
export PATH="$TOOLS/node/bin:$BUN_INSTALL/bin:$PATH"

log() { printf '\n[test-env] %s\n' "$*"; }
die() { printf '\n[test-env] ERROR: %s\n' "$*" >&2; exit 1; }

as_root() {
	if [[ "$(id -u)" == 0 ]]; then "$@"
	elif sudo -n true 2>/dev/null; then sudo "$@"
	else return 1; fi
}

pg_bin() {
	local dir
	if command -v pg_ctl >/dev/null 2>&1; then dirname "$(command -v pg_ctl)"; return; fi
	for dir in /usr/lib/postgresql/*/bin /usr/local/pgsql/bin /opt/homebrew/bin; do
		[[ -x "$dir/pg_ctl" ]] && { echo "$dir"; return; }
	done
	return 1
}

ensure_node() {
	if [[ "$(node --version 2>/dev/null | sed 's/^v\([0-9]*\).*/\1/')" == "$NODE_MAJOR" ]]; then return; fi
	log "installing Node $NODE_MAJOR.x into $TOOLS/node"
	local arch tarball
	case "$(uname -m)" in x86_64) arch=x64 ;; aarch64|arm64) arch=arm64 ;; *) die "unsupported CPU $(uname -m)" ;; esac
	tarball="$(curl -fsSL "https://nodejs.org/dist/latest-v${NODE_MAJOR}.x/" | grep -o "node-v${NODE_MAJOR}[0-9.]*-linux-${arch}.tar.gz" | head -1)"
	[[ -n "$tarball" ]] || die "could not find a Node $NODE_MAJOR download"
	mkdir -p "$TOOLS" && rm -rf "$TOOLS/node"
	curl -fsSL "https://nodejs.org/dist/latest-v${NODE_MAJOR}.x/${tarball}" | tar xz -C "$TOOLS"
	mv "$TOOLS/${tarball%.tar.gz}" "$TOOLS/node"
}

ensure_bun() {
	local have want_minor
	have="$(bun --version 2>/dev/null || true)"
	want_minor="${BUN_VERSION%.*}"
	if [[ "${have%.*}" == "$want_minor" ]]; then return; fi
	log "installing Bun $BUN_VERSION into $BUN_INSTALL"
	command -v unzip >/dev/null || apt_install unzip
	curl -fsSL https://bun.sh/install | bash -s "bun-v${BUN_VERSION}" >/dev/null
}

apt_install() {
	as_root env DEBIAN_FRONTEND=noninteractive apt-get update -qq || die "need root/sudo to install $*"
	as_root env DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "$@" >/dev/null
}

ensure_postgres() {
	if pg_bin >/dev/null; then return; fi
	log "installing PostgreSQL server binaries (no cluster is created or started)"
	as_root mkdir -p /etc/postgresql-common || die "PostgreSQL is missing and there is no root/sudo to install it"
	echo "create_main_cluster = false" | as_root tee /etc/postgresql-common/createcluster.conf >/dev/null
	apt_install postgresql
	pg_bin >/dev/null || die "PostgreSQL install did not provide pg_ctl"
}

setup() {
	command -v curl >/dev/null || die "curl is required"
	ensure_node
	ensure_bun
	log "node $(node --version), bun $(bun --version)"
	bun install --frozen-lockfile
	ensure_postgres
	log "setup done. Next: bash scripts/test-env.sh test"
}

# --- throwaway Postgres -------------------------------------------------------

PG_USER_CMD=()
start_pg() {
	local bin
	bin="$(pg_bin)" || die "PostgreSQL binaries missing: run 'bash scripts/test-env.sh setup' first"
	stop_pg
	rm -rf "$PG_DIR" && mkdir -p "$PG_DIR"
	if [[ "$(id -u)" == 0 ]]; then
		# initdb refuses to run as root; use the postgres (or nobody) account.
		local user=postgres
		id postgres >/dev/null 2>&1 || user=nobody
		chown "$user" "$PG_DIR"
		PG_USER_CMD=(runuser -u "$user" --)
	fi
	"${PG_USER_CMD[@]}" "$bin/initdb" -D "$PG_DIR/data" -U postgres --auth=trust >/dev/null
	"${PG_USER_CMD[@]}" "$bin/pg_ctl" -D "$PG_DIR/data" -l "$PG_DIR/log" -w \
		-o "-p $PG_PORT -k $PG_DIR -c listen_addresses=127.0.0.1" start >/dev/null
	local db
	for db in grabbin_smoke_test grabbin_ga_test grabbin_billing_test; do
		"$bin/createdb" -h 127.0.0.1 -p "$PG_PORT" -U postgres "$db"
	done
	log "throwaway Postgres on 127.0.0.1:$PG_PORT ($PG_DIR)"
}

stop_pg() {
	local bin
	bin="$(pg_bin)" || return 0
	[[ -f "$PG_DIR/data/postmaster.pid" ]] || return 0
	"${PG_USER_CMD[@]}" "$bin/pg_ctl" -D "$PG_DIR/data" -m fast -w stop >/dev/null 2>&1 || true
}

run_tests() {
	local base="postgres://postgres:postgres@127.0.0.1:$PG_PORT"
	ensure_node_present
	log "bun run verify (same checks as the pre-commit hook and CI)"
	bun run verify
	start_pg
	trap stop_pg EXIT
	# Each integration file runs on its own: they mock the same Worker modules.
	log "integration: login/session smoke"
	(cd apps/server && AUTH_SMOKE_TEST_DATABASE_URL="$base/grabbin_smoke_test" \
		bun test tests/integration/auth-session-smoke-postgres.test.ts)
	log "integration: GA server events"
	(cd apps/server && GA_TEST_DATABASE_URL="$base/grabbin_ga_test" \
		bun test tests/integration/ga-server-events-postgres.test.ts)
	log "integration: billing lifecycle"
	(cd apps/server && BILLING_TEST_DATABASE_URL="$base/grabbin_billing_test" \
		bun test tests/integration/billing-lifecycle-postgres.test.ts)
	log "all tests passed"
}

ensure_node_present() {
	[[ "$(node --version 2>/dev/null | sed 's/^v\([0-9]*\).*/\1/')" == "$NODE_MAJOR" ]] \
		|| die "Node $NODE_MAJOR.x not found: run 'bash scripts/test-env.sh setup' first"
	[[ -d node_modules ]] || die "dependencies missing: run 'bash scripts/test-env.sh setup' first"
}

case "${1:-}" in
	setup) setup ;;
	test) run_tests ;;
	all) setup && run_tests ;;
	*) echo "usage: bash scripts/test-env.sh setup|test|all" >&2; exit 2 ;;
esac
