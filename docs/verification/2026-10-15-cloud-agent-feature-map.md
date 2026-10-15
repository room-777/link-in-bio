# Cloud agent feature-map verification

Run date: 2026-10-15 (UTC)
Checkout: `chore/shared-cloud-feature-map` plus local review fixes for PR #30
Database: standard PostgreSQL 15 container `grabbin-featuremap-postgres` on `127.0.0.1:5432`
Result: **All runnable feature maps passed; social OAuth is credential-limited**

## Environment

| Check | Result |
| --- | --- |
| Bun dependencies | PASS; `bun install --frozen-lockfile` |
| Docker and PostgreSQL | PASS; official `postgres:15-alpine`, migrations applied, shared fixture prepared |
| Alchemy local R2 | PASS; media journeys used the local S3 endpoint and made no cloud R2 requests |
| Web/API health | PASS; `scripts/doctor.sh /tmp/pr30-run` reported `OK: stack healthy` |
| External API egress | PASS; dev-only loopback proxy passed through the executor's configured HTTPS proxy |
| Repository verification | PASS; `bun run verify` completed with 268 tests passed and all checks green |
| Runtime addresses | Web `127.0.0.1:3000`, API `127.0.0.1:3001`, outbound proxy `127.0.0.1:3002`, PostgreSQL `127.0.0.1:5432` |

The fixture is local to this disposable database: `featuremap@example.com`, handle `featuremap-test`, and local `local-pro` grant. No production database or R2 credentials were used.

## Feature-map results

| Feature map | Journeys | Result |
| --- | --- | --- |
| Landing | `landing-open`, `landing-sign-in` | PASS; landing loaded and its create CTA reached the email form |
| Interactive demo | `demo-open`, `demo-interact`, `demo-share-path` | PASS; edit reset after reload, footer CTA reached sign-in, no API requests |
| Sign-in and page creation | `sign-in-open`, `sign-in-email`, `create-page` | PASS; OTP returned 200, session cookie set, `/create` made the page through the UI. Social OAuth remains unverified because provider credentials are not configured. |
| Public creator page | `public-handle`, `public-domain`, `public-missing` | PASS; stored handle loaded without owner controls, seeded `featuremap.example.com` Host routed to the same page, unknown handle returned 404 |
| Page editor | `editor-open`, `editor-layout`, `editor-save` | PASS; owner toolbar loaded, compact/wide controls changed, profile bio autosaved to Postgres, survived reload and appeared in a separate signed-out view; fixture bio restored |
| Sign in with email OTP | `otp-request`, `otp-verify`, `otp-landing` | PASS; local OTP verified and landed on `/featuremap-test` |
| Add an item | `add-text`, `add-section`, `add-link`, `add-map`, `delete-item`, `item-persist` | PASS; rows persisted through reload, map was removed through its UI control, temporary rows cleaned up |
| Media upload and cancel | `media-add`, `media-upload`, `media-cancel` | PASS; uploaded PNG existed in local R2 and rendered after reload; cancelled upload returned 204 and left no object or item row |
| Link metadata refresh | `link-add`, `link-metadata-refresh` | PASS; fetched the real GitHub title through the external proxy, replaced the seeded stale title in Postgres, and cleaned up the temporary row. |
| Add a Tweet | `tweet-open`, `tweet-add`, `tweet-invalid` | PASS; valid `https://x.com/jack/status/20` preview returned 200 and persisted; invalid status URL returned 502 with a recoverable UI message and wrote no row. Both temporary rows were cleaned up. |

## Evidence

Browser screenshots, ARIA snapshots, actions, API response details, and database readbacks are under [`artifacts/verify`](../../artifacts/verify/). Key folders: `pr30-web`, `pr30-account`, `pr30-sign-in`, `pr30-public`, `pr30-editor`, `pr30-editor-retry`, `pr30-editor-layout-save`, and `pr30-tweet`.

The demo add/delete driver also passed independently in `pr30-demo-add-item`. Editor media evidence confirms no request reached `*.r2.cloudflarestorage.com`. Outbound proxy evidence is in `pr30-editor-proxy`, `pr30-tweet-valid-proxy`, and `pr30-tweet-invalid-proxy`.

## Review findings fixed

- The demo's Advanced widgets dialog called `authClient.useSession`, producing API requests on `/demo`; it is now omitted in demo mode. The demo driver asserts the API boundary.
- The account driver submitted `/create` before client hydration; it now waits for hydration and confirms handle availability before submitting.
- The startup path now provisions ordinary PostgreSQL 15 instead of Supabase Postgres and no longer installs the Supabase CLI.

## Remaining environment limits

- The cloud environment already has unrestricted outbound HTTP and injects `HTTP_PROXY`/`HTTPS_PROXY` at `http://proxy:8080`; no host allow-list change was needed. Since Alchemy's local API runs in Cloudflare `workerd`, dev mode now routes provider and metadata fetches through a Bun sidecar bound only to `127.0.0.1:3002`. The proxy allows public HTTPS GET/HEAD requests, validates DNS addresses and redirects, and caps response size. Production keeps native Worker fetch.
- `sign-in-social` needs OAuth provider credentials.
