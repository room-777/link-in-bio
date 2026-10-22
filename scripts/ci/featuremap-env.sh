#!/usr/bin/env bash
# Writes placeholder apps/server/.env and apps/web/.env for the isolated
# feature-map stack in CI. Values are fake and public; start-local.sh only
# needs the files to exist and gives the API its own local bindings.
# Never overwrites an existing .env.
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
write() {
	if [[ -e "$1" ]]; then echo "keep existing $1"; return; fi
	printf '%s\n' "${@:2}" > "$1"
	echo "wrote placeholder $1"
}
write "$ROOT/apps/server/.env" "NODE_ENV=development"
write "$ROOT/apps/web/.env" \
	"NODE_ENV=development" \
	"NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.featuremap-ci-placeholder" \
	"NEXT_PUBLIC_CREEM_PRO_MONTHLY_PRODUCT_ID=local-pro" \
	"NEXT_PUBLIC_CREEM_PRO_YEARLY_PRODUCT_ID="
