# Cloud agent feature-map verification

Run date: 2026-10-15 (UTC)  
Checkout: `chore/shared-cloud-feature-map`  
Result: **Blocked before stack startup; feature journeys not run**

## Environment preflight

| Check | Result | Evidence |
| --- | --- | --- |
| Docker daemon | Ready | `docker info` succeeded. |
| Bun | Ready | Shared launcher installed and pinned Bun `1.4.0` at `$HOME/.bun/bin/bun`. |
| Supabase CLI | Ready | Shared launcher installed and pinned Supabase CLI `2.121.0` at `$HOME/.bun/bin/supabase`. |
| Repository dependencies | Ready | `bun install --frozen-lockfile` completed; rerun reported no changes. |
| Docker daemon | Ready | `docker info` succeeded; Supabase image pull began during initial bootstrap. |
| Cloudflare development credential | Missing | Codex cloud environment status lists no secrets; `CLOUDFLARE_API_TOKEN` is unset in the task environment. |
| Cloud environment status | Connected, no secrets | Environment status reports connected/unrestricted and an empty `secrets` list. |

The canonical stack needs the shared Cloudflare token for Alchemy's local R2 service. The launcher now stops before starting Docker when that secret is absent. An earlier bootstrap attempt was interrupted while downloading the Supabase Postgres image; no local database or browser stack was left running. The shared test account and `featuremap-test` page could not be created. No browser screenshots or database readbacks are claimed.

The user later reported registering the token. On the retry, the current task's cloud environment still reported an empty secret list and the process had no `CLOUDFLARE_API_TOKEN`; the launcher again stopped before Docker startup. This indicates the registration has not reached this task's active executor yet. No token value was requested or logged.

## Checks that ran

| Check | Result |
| --- | --- |
| `scripts/cloud-agent-start.sh` | BLOCKED as designed: exits with `CLOUDFLARE_API_TOKEN is required` before Docker startup. Bun, Supabase CLI, and dependencies were installed first. |
| Retry after reported token registration | BLOCKED: this task's environment status showed no secret bindings and the launcher process did not receive `CLOUDFLARE_API_TOKEN`. |
| `bash -n scripts/cloud-agent-start.sh scripts/prepare-feature-map-account.sh .agents/skills/verify-editor/scripts/otp.sh` | PASS |
| `node --check` on changed Playwright `.mjs` drivers | PASS |
| `git diff --check` | PASS |
| `scripts/doctor.sh` | NOT RUN: canonical stack could not start without the Cloudflare secret. |

## Feature-map runs

Every browser journey below is **NOT RUN**, blocked by the missing canonical stack prerequisites above. `/demo` was not treated as evidence for the stored page or Pro access.

| Feature map | Journeys | Result |
| --- | --- | --- |
| Landing | `landing-open`, `landing-sign-in`, `landing-demo` | NOT RUN |
| Interactive demo | `demo-open`, `demo-interact`, `demo-share-path` | NOT RUN; browser driver now records API traffic and fails if `/demo` calls the API. |
| Sign-in and page creation | `sign-in-open`, `sign-in-email`, `sign-in-social`, `create-page` | NOT RUN; local OTP and the new UI-created page need the canonical stack. Social sign-in also needs provider credentials. |
| Public creator page | `public-handle`, `public-domain`, `public-missing` | NOT RUN; handle needs the shared page fixture; domain needs a local hostname mapping. |
| Page editor | `editor-open`, `editor-layout`, `editor-save` | NOT RUN; requires the shared signed-in owner page. |
| Sign in with email OTP | `otp-request`, `otp-verify`, `otp-landing`, `otp-change-email` | NOT RUN; requires local Postgres and the shared fixture. |
| Add an item | `add-text`, `add-section`, `add-link`, `add-map`, `delete-item`, `item-persist` | NOT RUN; demo and owner paths require browser execution; persistence requires the shared page. |
| Media upload and cancel | `media-add`, `media-upload`, `media-cancel`, `media-replace-link-image` | NOT RUN; requires Alchemy local R2. |
| Link metadata refresh | `link-add`, `link-metadata-initial`, `link-metadata-refresh` | NOT RUN; requires the full stack and outbound metadata provider access. |
| Add a Tweet | `tweet-open`, `tweet-add`, `tweet-invalid` | NOT RUN; requires the shared Pro owner and outbound access to `react-tweet.vercel.app`. |

## Shared fixture for the next run

The canonical launcher creates the same local account identity and Pro subscription in each agent's disposable Postgres database: `featuremap@example.com`, user ID `feature-map-test-user`, and local product ID `local-pro`. After starting it, `drive-create-page.mjs` signs in and creates the `featuremap-test` handle through `/create` if it is absent. Use those values in Grok Bot, Cursor, and Codex; do not substitute `/demo` for owner, persistence, Pro, or public-page proof.
