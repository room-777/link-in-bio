---
name: verify-editor
description: Drive Grabbin's full local stack (web :3000, Hono API :3001, local PostgreSQL) with headless Playwright to prove page-editor and email-OTP sign-in behavior. Use after changes to the Bento editor, its state/mutations, or auth, when the demo-only `verify` skill is not enough.
---

# Verify the Grabbin editor (full stack)

The `verify` skill covers `/demo` with no backend. This skill runs the API and database too, so editor and sign-in journeys can be driven against real storage. Feature recipes live in [`features/README.md`](features/README.md).

Commands below run from the repo root. To verify a different checkout, use its own dependencies and local `.env` files. The feature-map fixture is local to each agent's disposable Postgres instance but has the same email, handle, and Pro plan everywhere.

## Launch

Use the shared cloud-agent entrypoint for Grok Bot, Cursor, and Codex. Each environment needs Docker, Bun dependencies, `CLOUDFLARE_API_TOKEN`, and `CLOUDFLARE_ACCOUNT_ID` when the token can see multiple accounts. From the repository root run:

```sh
scripts/cloud-agent-start.sh
```

It configures loopback URLs, starts a regular PostgreSQL 15 container on `127.0.0.1:5432`, applies migrations, registers the Alchemy Cloudflare profile non-interactively, and prepares the same local Pro account in each agent's disposable database. Alchemy provides local R2 and the local S3 endpoint; no R2 keys go in `.env`. Stop it with Ctrl-C in the terminal that owns `bun run dev`.

Run the account driver after startup from the repository root. In a second terminal, change to that root first. The driver signs in as `featuremap@example.com`, creates `featuremap-test` through the visible `/create` form if needed, and saves screenshots and actions:

```sh
REPO="$(git rev-parse --show-toplevel)"
ACCOUNT_EVIDENCE_DIR="$REPO/artifacts/verify-editor/account-$(date +%Y%m%d-%H%M%S)-$$"
mkdir -p "$ACCOUNT_EVIDENCE_DIR"
node "$REPO/.agents/skills/verify-editor/scripts/drive-create-page.mjs" "$ACCOUNT_EVIDENCE_DIR"
```

The driver needs Playwright installed in the current directory (or run it from the configured Playwright directory). Later runs reuse the same account and page. `start-local.sh` is a limited fallback without local S3 and must not be used to claim media upload/cancel passed. The sign-in driver always uses `http://127.0.0.1:3000`.

Steps:

```sh
REPO="$(git rev-parse --show-toplevel)"
RUN_ID="$(date +%Y%m%d-%H%M%S)-$$"
RUN_DIR="/tmp/grabbin-verify-editor/$RUN_ID"          # scratch: pids, logs, wrangler state
EVIDENCE_DIR="$REPO/artifacts/verify-editor/$RUN_ID"   # proof: survives cleanup (artifacts/ is gitignored)
mkdir -p "$RUN_DIR" "$EVIDENCE_DIR"
git -C "$REPO" rev-parse HEAD > "$EVIDENCE_DIR/revision"

cd "$REPO" && scripts/cloud-agent-start.sh             # full shared stack + local Pro account
```

The shared launcher owns the foreground `bun run dev` process. It uses `127.0.0.1` URLs and fails if another stack is occupying the app ports.

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
node "$REPO/.agents/skills/verify-editor/scripts/drive-sign-in.mjs" "$EVIDENCE_DIR/sign-in" featuremap@example.com
RUN_DIR="$RUN_DIR" node "$REPO/.agents/skills/verify-editor/scripts/drive-editor-journeys.mjs" "$EVIDENCE_DIR/editor" media-upload,media-cancel,link-refresh,item-add
```

Each script prints its steps, ends with `RESULT: PASS` or `RESULT: FAIL <reason>`, sets the exit code, and writes `actions.md` plus screenshots/ARIA snapshots into the given directory. For journeys without a script, follow the matching file in `features/` and use the same conventions.

Sign-in: the shared launcher blanks `RESEND_API_KEY`; only use `featuremap@example.com` and read its code from the local database:

```sh
.agents/skills/verify-editor/scripts/otp.sh featuremap@example.com   # prints the newest 6-digit code
```

## Evidence

Proof goes to `$EVIDENCE_DIR/<feature-id>/` (under `artifacts/verify-editor/`, gitignored). Standards:

- Drive the real user path (toolbar buttons, forms), never internal setters or test-only endpoints.
- Capture the action and the result: a before snapshot/screenshot, the after state, and `actions.md` with each step and observed value.
- For anything that should persist, verify the side effect separately: reload in a new context and read the row back (`docker exec grabbin-featuremap-postgres psql -U postgres -c "select id, type from page_items where ..."`). A toast or "saved" status alone is not proof.
- `/demo` runs the same Bento editor store with persistence off and without Pro access; its driver records API traffic and fails if any request reaches the API. A `/demo` proof covers interaction only, not saving or gated features.
- Record the revision (`$EVIDENCE_DIR/revision`) and the feature/sub-feature IDs used.

## Cleanup

```sh
.agents/skills/verify-editor/scripts/stop-local.sh "$RUN_DIR"   # kills only the process groups recorded in RUN_DIR
rm -rf "$RUN_DIR"
ls "$EVIDENCE_DIR"                                               # proof must still be there
```

Never kill by process name. Leave the PostgreSQL container running so later runs can reuse the local fixture. Keep the shared fixture intact; evidence stays.

## Helpers

| Script | Use |
| --- | --- |
| `scripts/start-local.sh <RUN_DIR>` | Fallback: API + web on 127.0.0.1 without Cloudflare credentials (no media upload). |
| `scripts/stop-local.sh <RUN_DIR>` | Stop exactly what `start-local.sh` started. |
| `scripts/doctor.sh [RUN_DIR]` | Read-only health/ownership check. |
| `scripts/otp.sh <email>` | Print the newest sign-in OTP for an `@example.com` address from local Postgres. |
| `scripts/drive-demo-add-text.mjs <dir>` | Prove `editor-add-item` on `/demo` (add text block, then delete it). |
| `scripts/drive-sign-in.mjs <dir> [email]` | Drive email-OTP sign-in and check the post-sign-in landing page. |
| `scripts/drive-create-page.mjs <dir>` | Sign in and create `featuremap-test` through `/create` if it does not exist. |
| `scripts/drive-editor-journeys.mjs <dir> [ids]` | Owner editor journeys on the real `/{handle}`: `media-upload`, `media-cancel`, `link-refresh`, `item-add`. Env: `RUN_DIR`, optional `WEB_URL`/`SERVER_URL` (default `127.0.0.1`). Fails on any cloud R2 request. |
| `scripts/server.wrangler.jsonc` | Local API worker config used by `start-local.sh`. |

## Known gotchas (environment)

- Use `127.0.0.1` for browser, API, and app URLs with either launcher. In some sandboxes `localhost` resolves to `::1` only while the API binds IPv4; mixing hosts also splits auth cookies.
- Exported shell variables (`NEXT_PUBLIC_SERVER_URL`, ...) override `.env`; `start-local.sh` unsets them. If the browser calls the wrong API origin, check `env`.
- In Docker without systemd, start `dockerd` yourself; if containers cannot reach each other, the host FORWARD policy may be dropping bridge traffic.

- `GRABBIN_REPO` stays exported in your shell; unset or re-export it before starting a different checkout, and check the `checkout:` line `start-local.sh` prints.
- Use the shared `featuremap@example.com` account only; its OTP is read locally with `scripts/otp.sh`.
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
