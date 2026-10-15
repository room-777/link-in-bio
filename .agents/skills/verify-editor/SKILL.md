---
name: verify-editor
description: Drive Grabbin's full local stack (web :3000, Hono API :3001, local Supabase Postgres) with headless Playwright to prove page-editor and email-OTP sign-in behavior. Use after changes to the Bento editor, its state/mutations, or auth, when the demo-only `verify` skill is not enough.
---

# Verify the Grabbin editor (full stack)

The `verify` skill covers `/demo` with no backend. This skill runs the API and database too, so editor and sign-in journeys can be driven against real storage. Feature recipes live in [`features/README.md`](features/README.md).

Commands below run from the repo root. To verify a different checkout (for example a PR worktree) with these scripts, export `GRABBIN_REPO=/path/to/that/checkout` before `start-local.sh` and `doctor.sh`; it needs its own `bun install` and `.env` files.

## Launch

Prerequisites (one-time per machine):

- Docker running, Supabase CLI installed, `bun install` done at the repo root.
- `apps/server/.env` and `apps/web/.env` exist (copy the `.env.example` files, `localhost` URLs). Do **not** add R2 keys.
- **Preferred launch (same as the Mac): `bun run dev`** (`alchemy dev`). It runs the server worker, cron, and `vinext dev` locally with alchemy's local R2 bucket and local S3 endpoint for presigned uploads. Web `http://localhost:3000`, API `http://localhost:3001`. It needs a Cloudflare profile because the stack state lives in Cloudflare (`Cloudflare.state()`). On a headless box or agent shell the interactive `alchemy profile edit` refuses to prompt, so register a token non-interactively:
  `cd packages/infra && bun ./node_modules/.bin/alchemy profile edit --add Cloudflare --method stored --set apiToken=env:CLOUDFLARE_API_TOKEN --set accountId=<id> --no-input` (account id: `GET https://api.cloudflare.com/client/v4/accounts`). Use `bun`; alchemy's CLI needs node ≥ 22.15. Stop it by killing the process group you started.
- **Cloud Agent:** from the repo root, `scripts/cloud-agent-start.sh` is the configured bootstrap. It starts Docker and local Postgres, writes example `.env` files with localhost URLs, registers the Cloudflare profile, applies local DB migrations, and starts `bun run dev`. It requires `CLOUDFLARE_API_TOKEN`; never put production R2 keys in `.env`. The bucket and S3 endpoint are local. If `localhost:3000` and `:3001` already answer, the script reuses them; run `doctor.sh` and confirm the checkout before driving.
- Fallback without Cloudflare: `scripts/start-local.sh` (plain `wrangler dev`, `127.0.0.1` URLs in `.env`). Sign-in, item, link, and tweet journeys work; media upload/cancel are blocked (no local S3 endpoint).

Steps:

```sh
REPO="$(git rev-parse --show-toplevel)"
RUN_ID="$(date +%Y%m%d-%H%M%S)-$$"
RUN_DIR="/tmp/grabbin-verify-editor/$RUN_ID"          # scratch: pids, logs, wrangler state
EVIDENCE_DIR="$REPO/artifacts/verify-editor/$RUN_ID"   # proof: survives cleanup (artifacts/ is gitignored)
mkdir -p "$RUN_DIR" "$EVIDENCE_DIR"
git -C "$REPO" rev-parse HEAD > "$EVIDENCE_DIR/revision"

cd "$REPO" && bun run db:local:supabase                 # Postgres on 54322 (idempotent; prints DB_URL when ready)
bun run --filter @grabbin/db db:migrate:deploy          # must end with "migrations applied successfully"
.agents/skills/verify-editor/scripts/start-local.sh "$RUN_DIR"
```

`start-local.sh` refuses to start if `:3000` or `:3001` is already in use, and exits 0 only after the API answers `OK` and `/sign-in` renders (first compile can take ~1-2 min). It prints `ready: web http://127.0.0.1:3000  api http://127.0.0.1:3001`.

## Doctor

Run before every drive and whenever something looks off. It is read-only.

```sh
.agents/skills/verify-editor/scripts/doctor.sh "$RUN_DIR"
```

It checks: Postgres container ready and migrated (`page_items` exists), API `/` returns `OK`, `/auth/get-session` answers, web serves `/demo`, and port 3000 is owned by a process inside this checkout. Anything else prints `FAIL: ...` and exits 1. Do not drive an instance you did not start (another agent's or the user's).

## Drive

Harness: headless Playwright (Chromium), one fresh browser context per run, locators by ARIA role and accessible name only.

```sh
cd "$PW_DIR"
node "$REPO/.agents/skills/verify-editor/scripts/drive-demo-add-text.mjs" "$EVIDENCE_DIR/editor-add-item"
node "$REPO/.agents/skills/verify-editor/scripts/drive-sign-in.mjs" "$EVIDENCE_DIR/sign-in" dev@example.com
```

Each script prints its steps, ends with `RESULT: PASS` or `RESULT: FAIL <reason>`, sets the exit code, and writes `actions.md` plus screenshots/ARIA snapshots into the given directory. For journeys without a script, follow the matching file in `features/` and use the same conventions.

Sign-in: `apps/server/.env` may hold a real `RESEND_API_KEY`, so "Send OTP" sends a real email. Only ever use reserved `@example.com` addresses (`drive-sign-in.mjs` refuses anything else). Read the code from the local database instead of a mailbox:

```sh
.agents/skills/verify-editor/scripts/otp.sh dev@example.com   # prints the newest 6-digit code
```

## Evidence

Proof goes to `$EVIDENCE_DIR/<feature-id>/` (under `artifacts/verify-editor/`, gitignored). Standards:

- Drive the real user path (toolbar buttons, forms), never internal setters or test-only endpoints.
- Capture the action and the result: a before snapshot/screenshot, the after state, and `actions.md` with each step and observed value.
- For anything that should persist, verify the side effect separately: reload in a new context and read the row back (`docker exec supabase_db_grabbin psql -U postgres -c "select id, type from page_items where ..."`). A toast or "saved" status alone is not proof.
- `/demo` runs the same Bento editor store with persistence off; a `/demo` proof covers editor interaction, not saving. Say so in the report.
- Record the revision (`$EVIDENCE_DIR/revision`) and the feature/sub-feature IDs used.

## Cleanup

```sh
.agents/skills/verify-editor/scripts/stop-local.sh "$RUN_DIR"   # kills only the process groups recorded in RUN_DIR
rm -rf "$RUN_DIR"
ls "$EVIDENCE_DIR"                                               # proof must still be there
```

Never kill by process name. Leave Supabase running unless this run started it (`bun run db:local:supabase:stop` then). Remove test rows you created (for example the `dev@example.com` user and its page) only if the journey requires a clean state; evidence stays.

## Helpers

| Script | Use |
| --- | --- |
| `scripts/start-local.sh <RUN_DIR>` | Fallback: API + web on 127.0.0.1 without Cloudflare credentials (no media upload). |
| `scripts/stop-local.sh <RUN_DIR>` | Stop exactly what `start-local.sh` started. |
| `scripts/doctor.sh [RUN_DIR]` | Read-only health/ownership check. |
| `scripts/otp.sh <email>` | Print the newest sign-in OTP for an `@example.com` address from local Postgres. |
| `scripts/drive-demo-add-text.mjs <dir>` | Prove `editor-add-item` on `/demo` (add text block, then delete it). |
| `scripts/drive-sign-in.mjs <dir> [email]` | Drive email-OTP sign-in and check the post-sign-in landing page. |
| `scripts/drive-editor-journeys.mjs <dir> [ids]` | Owner editor journeys on the real `/{handle}`: `media-upload`, `media-cancel`, `link-refresh`, `item-add`. Env: `RUN_DIR`, optional `WEB_URL`/`SERVER_URL` (default `localhost`). Fails on any cloud R2 request. |
| `scripts/server.wrangler.jsonc` | Local API worker config used by `start-local.sh`. |

## Known gotchas (environment)

- With `start-local.sh`, use `127.0.0.1` everywhere (both in `.env` and when driving); with `bun run dev`, use the `localhost` URLs alchemy prints (Chromium resolves `localhost` to both `::1` and `127.0.0.1`). In some sandboxes `localhost` resolves to `::1` only, and `vinext dev` binds there while the API binds IPv4; mixing hosts also splits auth cookies between `localhost` and `127.0.0.1`.
- Exported shell variables (`NEXT_PUBLIC_SERVER_URL`, ...) override `.env`; `start-local.sh` unsets them. If the browser calls the wrong API origin, check `env`.
- In Docker without systemd, start `dockerd` yourself; if containers cannot reach each other (Supabase start fails with `DbSetupError`), the host FORWARD policy is dropping bridge traffic.

- `GRABBIN_REPO` stays exported in your shell; unset or re-export it before starting a different checkout, and check the `checkout:` line `start-local.sh` prints.
- `RESEND_API_KEY` may be real: only ever use `@example.com` addresses (`dev@example.com`); read the OTP with `scripts/otp.sh`.
- `start-local.sh` only: `apps/server/.env` (`--env-file`) overrides `vars` in `scripts/server.wrangler.jsonc`, even with an empty value.
- `GET /pages/{handle}/views` returns 500 locally ("Simple Analytics request failed"); the footer shows "Views on break". Expected without analytics access; ignore it.

## Last verification run (Oct 14 2026, PR #1 `refactor/web-bento-data-layer` + `main` c80d21e)

| Journey | Result | Note |
|---|---|---|
| doctor | OK | |
| sign-in-email-otp | PASS | needs PR #5 (on `main`) |
| editor-add-item (owner) | PASS | text/section/link/map persisted; delete removed the row |
| editor-media-upload | PASS | `bun run dev`, local bucket via `/cdn-cgi/local/r2/s3`, no cloud R2 requests |
| editor-media-cancel | PASS | `upload/cancel` 204, `pending_delete`, no item, no local object |
| editor-link-metadata refresh | PASS (flaky upstream) | 4/6 runs; failures returned 200 with the old title |
| editor-tweet | PASS after local Pro grant | Oct 13 run |

After the stack changes (new routes, renamed buttons, new env vars), keep this skill honest with `/maintain-verification-skill`.
