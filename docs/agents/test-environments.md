# Test environments

One script sets up and runs the tests everywhere: `scripts/test-env.sh`.

| Command | Network | What it does |
| --- | --- | --- |
| `bash scripts/test-env.sh setup` | needed | Installs Node `.node-version` major and Bun `packageManager` version under the user's home if missing, runs `bun install --frozen-lockfile`, installs PostgreSQL server binaries (apt, no cluster created) if missing |
| `bash scripts/test-env.sh test` | not needed | `bun run verify` (Biome, typecheck, all unit tests, plan boundary, production-key check), then a throwaway Postgres on `127.0.0.1:55432` and the three integration files (login/session smoke, GA server events, billing lifecycle), each on its own; the cluster is stopped at the end |
| `bash scripts/test-env.sh all` | needed | `setup` then `test` |

Safety: no secrets are read. Tests refuse production resources (`@grabbin/env/prod-guard`, `scripts/test-preload.ts`). The script never touches port 54322 (shared Supabase), 3000/3001 (dev servers), production databases or the production R2 bucket `grabbin`. Running as root (Codex) is fine: Postgres runs as the `postgres` account.

Optional variables: `TEST_PG_PORT` (default `55432`), `TEST_PG_DIR` (default `$TMPDIR/grabbin-test-pg`), `GRABBIN_TOOLS_DIR` (default `~/.local/grabbin-tools`).

## Required variables per environment (names only)

| Environment | For tests | For the dev stack (`bun run dev`) |
| --- | --- | --- |
| Grok Bot box | none | `CLOUDFLARE_API_TOKEN` (optional `CLOUDFLARE_ACCOUNT_ID`) |
| Cursor cloud agent | none | `CLOUDFLARE_API_TOKEN` (optional `CLOUDFLARE_ACCOUNT_ID`), set as Cursor secrets |
| Codex cloud | none | not supported (tests only) |

Never add production values (`DATABASE_URL` to the production DB, R2 keys, `*_PRODUCTION` env files) to any of these environments.

## Grok Bot box

```bash
bash scripts/test-env.sh all
```

## Cursor cloud agents

`.cursor/environment.json` runs `bash scripts/test-env.sh setup` as the install step. Agents then run `bash scripts/test-env.sh test`. `scripts/cloud-agent-start.sh` (dev stack) also calls `setup` first.

## Codex cloud

Codex reads `AGENTS.md`. In ChatGPT → Codex → Settings → Environments:

1. **Create environment** (or edit the existing one) and pick the `room-777/link-in-bio` repository.
2. **Container image**: default `universal`. Leave preinstalled package versions as they are; the script installs the pinned Node/Bun itself.
3. **Environment variables / Secrets**: add none.
4. **Setup script**: paste exactly
   ```bash
   bash scripts/test-env.sh setup
   ```
5. **Agent internet access**: Off is fine (tests run offline after setup).
6. Save, then start a task in this environment with the prompt:
   `Run bash scripts/test-env.sh test and report the pass/fail counts.`
7. Expect the log to end with `[test-env] all tests passed`.
