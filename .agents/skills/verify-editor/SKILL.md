---
name: verify-editor
description: "Run Grabbin's mapped web journeys in an isolated local stack with visible Chrome, a persistent owner account, and saved browser evidence. Use for feature-map verification or when a real local browser flow needs proof."
---

# Verify Grabbin features

## Launch

Run from the repository root. Choose a new run id, then start the local web/API processes against the dedicated PostgreSQL container:

```sh
RUN_ID="local-$(date +%Y%m%d-%H%M%S)"
RUN_DIR="artifacts/verify-editor/$RUN_ID"
.agents/skills/verify-editor/scripts/start-local.sh "$RUN_DIR"
```

`start-local.sh` uses `apps/server/.env` for migrations and `apps/web/.env` for the web process. It starts the API with isolated local bindings, so provider credentials from `apps/server/.env` never reach the API. Local database, API, page, billing and storage bindings point to the dedicated stack. It starts the mock outbound server on port 3002, which never connects to the internet. Wait for its `ready web=...` line, then in another terminal run:

```sh
.agents/skills/verify-editor/scripts/doctor.sh "$RUN_DIR"
```

The doctor must print `OK`. Web is `http://127.0.0.1:3000`, API is `http://127.0.0.1:3001`, the fake provider is `http://127.0.0.1:3002`, and the dedicated database is `grabbin_featuremap` on port `15432`. Set `FEATUREMAP_WEB_PORT`, `FEATUREMAP_API_PORT`, `FEATUREMAP_MOCK_PORT` and `FEATUREMAP_DB_PORT` to run a second stack beside one already on those ports. The scripts refuse occupied ports and only use their own labeled database container: `grabbin-featuremap` on port `15432`, `grabbin-featuremap-<port>` for any other `FEATUREMAP_DB_PORT`, each with its own volume. The owner browser state and the local R2 (file storage) folder follow the same rule: `~/.cache/grabbin-featuremap/` on port `15432`, `~/.cache/grabbin-featuremap/<port>/` otherwise, so a second stack never overwrites the first stack's login or uploads. Start a second stack from its own worktree, because Next.js runs only one dev server per project folder. They read but never change either `.env` file.

## Doctor

Run the command above before driving the browser and after any server restart. It checks that the owned database has its page-items table, the API and mock server answer, and the sign-in page is served. If it fails, inspect only this run's logs, then stop and repair this run before continuing.

## Drive

Create the test account and page once, only if `featuremap@example.com` and `featuremap-test` are absent from the dedicated local database:

```sh
node .agents/skills/verify-editor/scripts/setup-account.mjs "$RUN_DIR"
```

This uses a fresh visible Chrome context to sign in through `/sign-in` and create the page through `/create`. It grants the configured local-only `local-pro` product in the dedicated database and saves the owner's browser state at `owner-session.json` in the stack's state folder (`~/.cache/grabbin-featuremap/` on the default DB port, `~/.cache/grabbin-featuremap/<FEATUREMAP_DB_PORT>/` otherwise). Each stack signs in once into its own state folder. Keep that database volume and state file for later runs. Never replace them with an account or credentials from another environment.

Run the full feature driver in visible Chrome (macOS Google Chrome by default, or the binary in `CHROME_PATH`):

```sh
node .agents/skills/verify-editor/scripts/drive-parallel.mjs "$RUN_DIR"
```

`drive-parallel.mjs` is the default full run. It seeds one owner (user, page `featuremap-test-gN`, local Pro, signed session in `$RUN_DIR/owner-gN.json`) per journey group, runs the groups at the same time, and writes merged `results.md` / `results.json` (per-journey `timings`, per-group seconds) plus each group's evidence under `$RUN_DIR/groups/gN/`. Journeys that read data an earlier journey made stay in one group in their original order (`GROUPS` in the script). The run fails when any sub-feature fails or the wall time exceeds the budget (150 s; override with `FEATUREMAP_BUDGET_S`). Measured: about 116 s, against about 290 s for the old serial run.

`drive-all.mjs` still runs every journey serially on the one owner; set `FEATUREMAP_JOURNEYS=a,b` to run only some journeys. Drivers wait on conditions, never on a clock: `settled()` waits for `data-save-status="saved"` and no in-flight API request, and `check:feature-drivers` rejects `waitForTimeout` and timer sleeps in drivers and the harness.

The login map must use a fresh context with no saved browser state. Protected editor maps use the one saved owner state. `/demo` is not a substitute for account, save, Pro, upload, or public-page checks. The driver writes `results.md`, `results.json`, screenshots, ARIA snapshots, action notes, and observed local API responses under the run directory. Use the feature files in `features/` as the complete journey list. Update the driver and maps together when a mapped journey changes.

## Evidence

Use the real browser controls and routes listed in each feature map. Browser HTTPS requests are blocked by default; Playwright supplies local Mapbox, Google Analytics and asset fixtures. Server metadata, RSS and view-count requests go through the fake outbound server. Browser uploads are stored in the isolated Wrangler R2 bucket. No provider call reaches the internet. Capture visible results, verify saved changes after reload or a new context, then read the matching row from the isolated test database. A mocked integration may pass only for local UI/API behavior and saved results. It does not prove delivery to a real provider. Record mock requests at `mock-requests.log` and `mock-browser-requests.log` in the run directory.

## Cleanup

Stop only the local processes started by this run:

```sh
.agents/skills/verify-editor/scripts/stop-local.sh "$RUN_DIR"
```

This stops the run's web/API/mock processes. It keeps the labeled test database, its named volume, and the saved browser state for reuse. Evidence under `artifacts/verify-editor/$RUN_ID/` remains after cleanup. Never stop a process or container unless this run created and owns it.

## Writing drivers

Drivers are regenerated often, so the harness owns every browser call and `bun run check:feature-drivers` (in `bun run verify` and the pre-commit hook) rejects anything else:

- Open each feature with `journeys.open(feature, …)` (or the driver's `openOwner(feature)`). Each feature gets a fresh browser context, so a dialog or overlay left by one journey cannot break the next.
- Find controls with `control(scope, role, name)` from `harness/ui.mjs`. The name must be one the app renders in `apps/web/src` or a workspace package; an unknown name fails the check before any browser starts. Labels that change with state (`Add link image` / `Replace link image`) match every state. A control inside a popover is found from the page and its trigger is opened first. Controls revealed on hover are hovered through their item scope. Every action waits for React hydration.
- Use `content(scope, role, name)` only for fixture data the driver itself created, and `item`, `marker`, `fileInput`, `otpInput`, `labelled` for the rest.
- Wait with `settled(page)` after a change (it covers the editor's 1.5 s save delay) and navigate with `gotoReady` / `reloadReady`. Raw `page.getBy*`, `locator`, `goto`, `reload`, `waitForTimeout`, `waitForFunction`, `newContext` and `force: true` are rejected.

## Helpers

The runnable helpers are `scripts/start-local.sh`, `scripts/doctor.sh`, `scripts/stop-local.sh`, `scripts/mock-outbound.mjs`, `scripts/setup-account.mjs`, `scripts/drive-parallel.mjs`, `scripts/drive-all.mjs`, `scripts/drive-delete-check.mjs`, and `scripts/drive-widget-check.mjs`. Shared URLs, fixture identity, database readback, and evidence capture live in `scripts/local.mjs`; browser journeys and locators live in `harness/`.

For a focused follow-up after the full run, execute the delete check first, then refresh the widget placeholder evidence and summary:

```sh
node .agents/skills/verify-editor/scripts/drive-delete-check.mjs "$RUN_DIR"
node .agents/skills/verify-editor/scripts/drive-widget-check.mjs "$RUN_DIR"
```

## Feature map

Read `features/README.md` and the linked feature files before selecting journeys. The README is the index of all currently mapped browser behavior.
