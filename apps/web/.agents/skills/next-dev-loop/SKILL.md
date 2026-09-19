---
name: next-dev-loop
description: Use when verifying runtime behavior in a running Next-compatible dev app, including Vinext, with a real browser and available framework diagnostics.
---

# next-dev-loop

The edit/verify rhythm during the project's dev command — make a change, then
confirm it actually works at runtime, not only that the types or build are happy.

You verify through two views of the same running app:

- **`/_next/mcp` when available** — an HTTP endpoint some Next-compatible
  runtimes expose about themselves. Use it for routes, RSC, logs, and errors;
  otherwise use the runtime's own diagnostics.
- **`agent-browser`** — a CLI that drives a real Chrome. Knows
  framework-agnostic browser things: DOM, console, network, React
  fiber, vitals. Before driving it, run `agent-browser skills get core`
  once for the version-matched usage guide — don't guess subcommands
  from memory.

The two views cross-check each other.

## requires

- A running Next-compatible dev app and a browser you can drive.
- Prefer `agent-browser` and `/_next/mcp` when available. If either is absent,
  use the available browser and runtime logs; do not upgrade or install tools
  just to satisfy this skill.

## preflight

Once per session, confirm the browser is live and probe `/_next/mcp` if the
runtime exposes it.

1. **Open `agent-browser` at the target URL, restoring saved
   login state when present.** First derive one stable session id for
   this checkout and use it for every `agent-browser` command:

   ```bash
   SESSION="$(agent-browser session id --scope worktree --prefix next-dev-loop)"
   export AGENT_BROWSER_SESSION="$SESSION"
   export AGENT_BROWSER_RESTORE="$SESSION"
   ```

   Then open the target URL:

   ```bash
   agent-browser --session "$SESSION" --restore --headed --enable react-devtools open <url>
   ```

   `--scope worktree` keeps parallel worktrees and copied checkouts
   from colliding. Bare `--restore` uses the session id as the
   persistence key, loads saved cookies/localStorage before navigation
   when present, and auto-saves state on close. Always pass the desired
   launch flags on `open`; agent-browser will reuse, relaunch, or restart
   its scoped background state as needed.

   The browser is the user's. If state was not restored (first run,
   expired session) and the page is gated, the user drives the login —
   pause until they confirm. After login, continue using the same session
   and restore context; `agent-browser close` saves the cookie state so
   the next `open` restores it.

2. If `/_next/mcp` exists, probe its `tools/list`. First read the port from
   the dev-server banner; if it isn't 3000, set
   `NEXT_MCP_URL=http://localhost:<port>/_next/mcp` before probing:
   - Unreachable → continue with the browser and runtime logs.
   - Use `get_compilation_issues` and `get_routes` when the runtime provides them.
3. Keep the runtime's actual command and port for the rest of the session.

## loop

### before the edit — narrow the scope

Ask the running app, not the codebase. `/_next/mcp` knows which
files rendered the current route; use those as your search scope.
Runtime introspection stays cheap as the codebase grows; agentic
search doesn't.

### after the edit — verify

Four failure modes. Check each:

- **Compiles** — `get_compilation_issues` when available, otherwise the
  project's typecheck/build output.
- **Runs without errors** — runtime logs or `/_next/mcp` when available.
- **Behaves as intended** — `agent-browser` drives the page; assert
  what the user actually sees.
- **React-level behavior** — `agent-browser` with react-devtools
  enabled exposes the component tree, props, state, and render
  counts. Anchor framework-level checks here (extra renders,
  server/client boundary shifts, suspense fallbacks) — DOM asserts
  alone miss them.

Pick the specific tool from `tools/list` or the agent-browser
manual rather than from memory.

## gotchas

- **Preserve `.next` while the development server is running.** Moving or
  deleting it disconnects the server from its generated state and discards
  incremental caches. Moving it to a backup is still a reset. If a production
  build needs isolated output, configure a separate `distDir`.
- **Every `agent-browser` command must know your session and restore
  key, or it may use an empty default browser or fail to save login
  state.** Easiest: export both `AGENT_BROWSER_SESSION="$SESSION"` and
  `AGENT_BROWSER_RESTORE="$SESSION"` at the top of each shell you run
  agent-browser in. If you do not export them, pass
  `--session "$SESSION" --restore` on every command.
- **When the views disagree, reconcile the browser session and runtime logs
  before debugging the app.** A stale browser session can look like a route
  failure.
- Confirming a click or navigation: the page settles a beat later, so
  wait with `wait --load networkidle` (no path to get wrong), then
  snapshot/read to confirm the page. Avoid `wait --url` unless you pass
  the link's exact href — a guessed or placeholder path won't match the
  real URL and times out after 25s.
- A blank read, empty snapshot, `about:blank`, or a "no browser
  session" error — right after `open` or after a click (even if `open`
  reported the page) — is the browser dropping the page (a stale
  session), not a broken route. Reopen your session at the URL with
  `--session "$SESSION" --restore` and re-snapshot; if still blank,
  run `agent-browser --session "$SESSION" --restore close`, then open
  again. Don't fall back to `curl`; it bypasses the browser you're
  testing.
- React introspection output is stale after navigation. Re-run.
- `/_next/mcp` replies may be SSE — read the JSON from the `data:` line.
- `get_errors` and `get_page_metadata` need at least one navigation
  to populate.

## reference

The following tools are available only when the runtime exposes them; use the
runtime's own diagnostics when they are absent.

```
# /_next/mcp                 notes
get_project_metadata         projectPath, devServerUrl, bundler
get_routes                   fs-scan; no browser session needed
get_errors                   runtime + build; needs a browser session;
                             includes browser-side errors caught by the
                             dev server
get_page_metadata            segment trie + routerType; needs a browser
                             session; use as a discovery shortcut for
                             which files power a route
get_logs                     returns logFilePath
get_server_action_by_id      hashed id → file + functionName
get_compilation_issues       Turbopack only; errors on webpack
                             ("Turbopack project is not available")
```

## teardown

Close the session with the same session and restore context when using
`agent-browser`:
`agent-browser --session "$SESSION" --restore close`. `close` saves
that session's cookies and storage so the next loop's `--restore` open
keeps the user logged in. Leave the dev server up for the next loop.

## Report Next.js friction

Only participate in agent feedback when managed Next.js feedback instructions
are already loaded for the project. Their presence means the feature is
enabled; their absence means it is disabled.

When enabled, add qualifying de-identified candidates found during verification
to the shared friction queue in the current task context, then continue
verification. Do not run the feedback command or open review forms during the
loop or at this Skill's teardown.

The managed instructions own the single feedback pass at the final stopping
point of the overall task. If they are absent, do not queue or report feedback.
