---
name: verify
description: Drive Grabbin's local web app in a real browser to check the landing page, interactive demo, sign-in screen, and page flows. Use after web changes or when browser behavior needs proof.
---

# Verify Grabbin

Use this skill to check Grabbin through its browser UI. The primary surface is the web app. The API and database support it, but this recipe uses the built-in demo so it can run without signing in or changing stored data.

## Launch

This check needs Bun dependencies already installed. It does not need a database, migrations, or seed rows because `/demo` uses the built-in `DEMO_PAGE_RESPONSE` sample. It does not start the API or prove database-backed or signed-in flows. The web app may still try a read-only session check, which can fail while the demo remains usable.

1. Make a unique scratch folder and a lasting evidence folder, then record the checkout revision:

   ```sh
   RUN_ID="$(date +%Y%m%d-%H%M%S)-$$"
   RUN_DIR="${TMPDIR:-/tmp}/grabbin-verify/$RUN_ID"
   EVIDENCE_DIR="$PWD/artifacts/verify/$RUN_ID"
   mkdir -p "$RUN_DIR"
   mkdir -p "$EVIDENCE_DIR"
   git rev-parse HEAD > "$RUN_DIR/revision"
   printf 'RUN_ID=%s\nRUN_DIR=%s\nEVIDENCE_DIR=%s\n' "$RUN_ID" "$RUN_DIR" "$EVIDENCE_DIR"
   ```

   Keep these printed values. Set `RUN_DIR` and `EVIDENCE_DIR` again when using a separate terminal session; terminal sessions do not share shell variables.

2. Refuse to start if port `3000` is already in use. This recipe uses that port and must not share or drive another run's app.

3. In a dedicated long-running Codex terminal session at the repository root, start the web app:

   ```sh
   bun run --filter web dev
   ```

   Keep the terminal session ID. Do not start it in the background.

4. Wait for the terminal to show `Local: http://localhost:3000/`. Then confirm the demo returns HTTP 200 and the page title:

   ```sh
   curl -fsS http://localhost:3000/demo | rg -q '<title>Interactive Link in Bio Demo \| Grabbin</title>'
   ```

   A listening port by itself is not ready.

## Doctor

Before driving after anything looks wrong, check that the app on port `3000` belongs to this checkout and serves the expected demo page. Authentication is not needed for this public demo.

```sh
RUN_DIR="<absolute RUN_DIR printed during Launch>"
cat "$RUN_DIR/revision"
git rev-parse HEAD
lsof -nP -iTCP:3000 -sTCP:LISTEN
ps -p "$(lsof -tiTCP:3000 -sTCP:LISTEN | head -1)" -o command=
curl -fsS http://localhost:3000/demo | rg -q '<title>Interactive Link in Bio Demo \| Grabbin</title>'
```

The saved revision must match the current checkout. The port owner must be this checkout's `apps/web/node_modules/.bin/vinext` process. A successful title check proves the expected build is answering. If the checkout, port owner, or title does not match, stop and clean up this run before investigating. Do not drive an unknown or shared instance.

## Drive

Use Codex's Chrome DevTools browser tools. Create a fresh isolated browser context named with `RUN_ID`, then open `http://localhost:3000/demo` in that context. Take an accessibility snapshot before acting and use its current element IDs for clicks or fills. Do not reuse a user's normal browser context.

To check the interactive demo:

1. Confirm the page heading is `Explore an interactive Grabbin page demo` and the sample page shows its profile and Bento cards.
2. From the latest accessibility snapshot, fill the `Name` textbox with `Avery Reed Verification`. Take another snapshot and confirm the textbox shows that value. Restore `Avery Reed` through the same textbox, reload, and confirm the sample value is back. This is a browser edit to the in-memory demo only.
3. Save a full-page screenshot and the before/after accessibility snapshots in `$EVIDENCE_DIR`. If Chrome DevTools refuses its `filePath` because of its file-access limit, save the returned snapshot/image through the shell instead.

For another feature, read its file under `features/` first. Use routes, accessible names, and current snapshot IDs; never rely on screen coordinates or stale IDs.

## Evidence

Keep proof in `$EVIDENCE_DIR` (`artifacts/verify/<RUN_ID>/`) so cleanup can remove the app and scratch state without deleting the proof. Capture:

- `demo-before.txt` and `demo-after.txt`: accessibility snapshots before and after the browser action.
- `demo.png`: full-page screenshot of the resulting state.
- `actions.md`: exact URL, visible action and accessible name used, observed result, checkout revision, and any failed or skipped step with its reason.

Exercise the real user path and record both the action and resulting state. Check visible behavior and any relevant side effect. The `/demo` journey uses local sample data and should not write app data or send requests that change account state. Do not trust a dry-run or test-mode label without checking what it actually does. Use external-service mocks only where Grabbin already has a boundary that supports them.

## Cleanup

Close only the isolated browser page/context created for this run. Send Ctrl-C to the exact terminal session started in Launch, then confirm its Vinext process exited and port `3000` is free. Do not kill by process name.

Remove `$RUN_DIR` after cleanup. Keep `$EVIDENCE_DIR` and its files. If a failed attempt left a child process holding the port, identify it through the launch terminal's process tree and stop only that child.

## Helpers

No helper script is shipped. Use the commands and Chrome DevTools tools in this skill directly.

## Feature map

Read [`features/README.md`](features/README.md) before choosing a journey. It lists the known user entry points and names the checks that need a local database or signed-in seed account.
