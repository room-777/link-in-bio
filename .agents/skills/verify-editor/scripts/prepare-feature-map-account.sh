#!/usr/bin/env bash
# Create the deterministic, local-only identity used by the feature-map suite.
set -euo pipefail

if ! docker exec grabbin-featuremap-postgres pg_isready -U postgres >/dev/null 2>&1; then
	printf '%s\n' "Local PostgreSQL is not ready; run .agents/skills/verify-editor/scripts/feature-map-start.sh first." >&2
	exit 1
fi

docker exec -i grabbin-featuremap-postgres psql -v ON_ERROR_STOP=1 -U postgres <<'SQL'
BEGIN;

INSERT INTO "user" (id, name, email, email_verified, role)
VALUES ('feature-map-test-user', 'Feature Map Test', 'featuremap@example.com', true, 'user')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  email_verified = true,
  updated_at = now();

DO $$
BEGIN
  IF (SELECT id FROM "user" WHERE email = 'featuremap@example.com') <> 'feature-map-test-user' THEN
    RAISE EXCEPTION 'featuremap@example.com is already attached to a different local user';
  END IF;
END $$;

INSERT INTO creem_subscription (
  id, product_id, reference_id, creem_subscription_id, status, period_start, period_end, cancel_at_period_end
)
VALUES (
  'feature-map-local-pro', 'local-pro', 'feature-map-test-user', 'feature-map-local-pro', 'active', now(), now() + interval '1 year', false
)
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  reference_id = EXCLUDED.reference_id,
  status = 'active',
  period_start = now(),
  period_end = now() + interval '1 year',
  cancel_at_period_end = false;

COMMIT;

SELECT 'fixture ready' AS result, email, creem_subscription.product_id
FROM "user"
JOIN creem_subscription ON creem_subscription.reference_id = "user".id
WHERE "user".id = 'feature-map-test-user';
SQL
