---
name: verify-editor
description: "Run Grabbin's mapped web journeys as @playwright/test specs against an isolated local stack, with one seeded owner per journey and saved browser evidence. Use for feature-map verification or when a real local browser flow needs proof."
---

# Verify Grabbin features

## Run

From the repository root:

```sh
bun run featuremap
```

This one command starts the isolated local stack, runs every journey, writes `featuremap-results/`, stops the stack, and exits nonzero when any sub-feature fails or the run exceeds its budget (150 s; override with `FEATUREMAP_BUDGET_S`). It needs no `.env` file and no production secret: the API gets local-only bindings, the web gets a fixture Mapbox token and the `local-pro` product id, and no request reaches the internet. Set `CI=1` (or `FEATUREMAP_HEADLESS=1`) for headless Chrome; `CHROME_PATH` picks the binary (macOS Google Chrome by default, Playwright's Chromium otherwise).

Extra arguments go to Playwright, so a focused run is:

```sh
bun run featuremap --grep "editor-tweet"
bun run featuremap journeys/editor-layout.journey.ts
```

Ports default to web `3000`, API `3001`, mock `3002`, and database `15432`. Set `FEATUREMAP_WEB_PORT`, `FEATUREMAP_API_PORT`, `FEATUREMAP_MOCK_PORT` and `FEATUREMAP_DB_PORT` to run beside a stack already on those ports; run a second stack from its own worktree, because Next.js runs one dev server per project folder. The scripts refuse occupied ports and only use their own labeled database container (`grabbin-featuremap`, or `grabbin-featuremap-<port>` for another DB port, each with its own volume) and state folder (`~/.cache/grabbin-featuremap/[<port>/]`). `FEATUREMAP_WORKERS` sets Playwright's worker count (default 6).

## Results

`featuremap-results/` (git-ignored) is the contract CI reads:

- `summary.json`: `{"status":"passed"|"failed","total","passed","failed","skipped","durationMs","commit","failures":[{"feature","test","error","file"}]}`. `feature` is the journey id, `test` the sub-feature title, `error` the first line of the failure, `file` the `path:line` of the failing test. Totals count journey tests only; a failing setup test or an over-budget run is still listed under `failures`.
- `results.md`: the same run as a table of journey, sub-feature, result and seconds.
- `screenshots/<journey>/`: PNG and ARIA snapshot proofs, plus `FAILED-<test>.png` for any failure.
- `logs/`: stack, server, web and mock request logs.
- `playwright-report/` and `playwright-report.json`: Playwright's own report (`npx playwright show-report featuremap-results/playwright-report`).

## Layout

- `playwright.config.ts`: fully parallel workers, no retries and `failOnFlakyTests` (a test that only passes on a retry fails the run), 60 s per test, global budget, and the results reporter.
- `journeys/account.setup.ts`: creates `featuremap@example.com` / `featuremap-test` through `/sign-in` and `/create` on a fresh database, grants local Pro, and opens the editor once so parallel journeys do not all wait on the first route compile. Every journey depends on it.
- `journeys/<feature-id>.journey.ts`: one spec per feature map in `features/`. Each test title is a sub-feature id from that map's `## Sub-features` list, so every sub-feature maps to one test.
- `harness/fixtures.ts`: `journey(id)` returns the journey's `test`. Each journey gets its own worker with its own seeded owner (user, page `featuremap-test-jN`, local Pro, signed session cookie) and fixtures: `owner`, `ownerPage`, `signedOutPage`, `openOwnerPage()`, and seeded `textItem`, `linkItem`, `mediaItem`. Journeys share no data, so they run in parallel; tests inside one journey run in order on its page.
- `harness/ui.ts` (locators), `harness/journey.ts` (navigation and settling), `harness/editor.ts` (item helpers and DB readback), `harness/mocks.ts` (browser fixtures), `harness/local.ts` (URLs, DB access, proofs), `harness/results-reporter.ts` (`featuremap-results/`).
- `scripts/featuremap.ts` drives the run; `scripts/start-local.sh`, `doctor.sh`, `stop-local.sh` and `mock-outbound.ts` manage the stack and can be used on their own with a run folder.

## Writing journeys

Journeys are regenerated often, so `bun run check:feature-drivers` (in `bun run verify` and the pre-commit hook) and `tsc -p .agents/skills/verify-editor` hold them to one shape:

- Start with `const test = journey("<feature-id>")` from `harness/fixtures.ts`, matching the file name and `features/<feature-id>.md`. Import `test` and `expect` only from the fixtures; type-only imports from `@playwright/test` are fine.
- Name each test after a sub-feature id from the map (`"tweet-add"`, or `"widget-coming-soon: Signature"` for one case of a sub-feature). Every listed sub-feature needs a test, and every test needs a listed sub-feature. Add the sub-feature to the map when you add a test.
- Use the fixtures for pages and contexts. Need a second owner tab? `openOwnerPage()`. A signed-out page? `signedOutPage`. Need data? Seed it in a fixture so the journey owns it instead of reading what another journey made.
- Find controls with `control(scope, role, name)` from `harness/ui.ts`. The name must be one the app renders in `apps/web/src` or a workspace package; an unknown name fails the check before any browser starts. Use `content(scope, role, name)` only for fixture data the journey created, and `exactText`, `item`, `marker`, `fileInput`, `otpInput`, `labelled` for the rest. Hover-revealed controls are hovered through their own group, so do not hover the card first.
- Assert web-first: `await expect(locator).toBeVisible()` / `toHaveText()` / `toHaveValue()`, and `expect.poll()` (or `row()` from `harness/editor.ts`) for database readback. `expect(await locator.isVisible())` and similar one-shot reads are rejected.
- Wait on conditions: `settled(page)` after a change (it covers the editor's 1.5 s save delay), `page.waitForResponse` / `waitForEvent` for a request or file chooser, and `gotoReady` / `reloadReady` to navigate. Raw `page.getBy*`, `locator`, `goto`, `reload`, `newContext`, `newPage`, `waitForTimeout`, `waitForFunction`, `waitForSelector`, timer sleeps and `force: true` are rejected; harness and script files are checked for fixed sleeps too.

## Evidence

Use the real browser controls and routes listed in each feature map. Browser HTTPS requests are blocked; Playwright serves local Mapbox, analytics and image fixtures. Server metadata, RSS and preview requests go through the fake outbound server. Uploads are stored in the isolated Wrangler R2 bucket. Capture the visible result with `proof()`, verify saved changes after reload or a new context, and read the matching row from the isolated database. A mocked integration proves local UI/API behavior and saved results, not delivery to a real provider.

## Feature map

Read `features/README.md` and the linked feature files before writing or changing a journey. The README is the index of all mapped browser behavior; update a map and its journey together.
