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
- `apps/server/.env` and `apps/web/.env` exist (copy the `.env.example` files). For this stack they must use `127.0.0.1`, not `localhost`:
  - server: `BETTER_AUTH_URL=http://127.0.0.1:3001`, `CORS_ORIGIN=http://127.0.0.1:3000`, `PAGE_DOMAIN=127.0.0.1:3000`, `DATABASE_URL(_LOCAL)=postgres://postgres:postgres@127.0.0.1:54322/postgres`
  - web: `NEXT_PUBLIC_SERVER_URL=http://127.0.0.1:3001`, `NEXT_PUBLIC_PAGE_DOMAIN=127.0.0.1:3000`
- Playwright with Chromium in any scratch directory (`$PW_DIR`): `mkdir -p "$PW_DIR" && cd "$PW_DIR" && bun add playwright && bunx playwright install chromium`. Drive scripts load Playwright from the current working directory, so run them from `$PW_DIR`.

Why not `bun run dev`: the repo-standard command runs `alchemy dev`, which needs a Cloudflare profile (`Provider 'Cloudflare' is not configured in profile 'default'`) because Alchemy keeps state in Cloudflare. `scripts/start-local.sh` replaces it with plain `wrangler dev` for the API (local Hyperdrive to Postgres, local R2, `R2_LOCAL_MODE=true`, config in `scripts/server.wrangler.jsonc`) plus `vinext dev` for the web app. No Cloudflare account is touched.

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
| `scripts/start-local.sh <RUN_DIR>` | Start API + web on 127.0.0.1 without Cloudflare credentials; waits until usable. |
| `scripts/stop-local.sh <RUN_DIR>` | Stop exactly what `start-local.sh` started. |
| `scripts/doctor.sh [RUN_DIR]` | Read-only health/ownership check. |
| `scripts/otp.sh <email>` | Print the newest sign-in OTP for an `@example.com` address from local Postgres. |
| `scripts/drive-demo-add-text.mjs <dir>` | Prove `editor-add-item` on `/demo` (add text block, then delete it). |
| `scripts/drive-sign-in.mjs <dir> [email]` | Drive email-OTP sign-in and check the post-sign-in landing page. |
| `scripts/server.wrangler.jsonc` | Local API worker config used by `start-local.sh`. |

## Known gotchas (environment)

- Use `127.0.0.1` everywhere. In some sandboxes `localhost` resolves to `::1` only, and `vinext dev` binds there while the API binds IPv4; mixing hosts also splits auth cookies between `localhost` and `127.0.0.1`.
- Exported shell variables (`NEXT_PUBLIC_SERVER_URL`, ...) override `.env`; `start-local.sh` unsets them. If the browser calls the wrong API origin, check `env`.
- In Docker without systemd, start `dockerd` yourself; if containers cannot reach each other (Supabase start fails with `DbSetupError`), the host FORWARD policy is dropping bridge traffic.

After the stack changes (new routes, renamed buttons, new env vars), keep this skill honest with `/maintain-verification-skill`.
