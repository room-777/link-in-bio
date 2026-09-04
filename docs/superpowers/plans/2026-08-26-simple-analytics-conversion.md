# Simple Analytics Conversion Metrics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record production-only `signup_completed` and `first_page_created` Simple Analytics events with first-visit route metadata so aggregate conversion and route contribution can be measured.

**Architecture:** Keep browser analytics behind an importable function module that owns pageviews, event calls, route grouping, and the first-visit cookie. Keep server analytics behind a separate function that submits server-side events to Simple Analytics and swallows delivery failures. Better Auth's user-create-after hook records new accounts, while the pages controller records successful first-page creation through the existing background execution path.

**Tech Stack:** TypeScript, React 19, Next.js 16, Hono, Better Auth, Cloudflare Workers, Simple Analytics Events API, Bun, Biome.

**Spec:** `docs/superpowers/specs/2026-08-26-simple-analytics-conversion-design.md`

## Global Constraints

- Keep existing Simple Analytics manual pageview tracking and `data-auto-collect="false"` behavior.
- Record only `signup_completed` for actual Better Auth user creation and `first_page_created` for a successful first-page transaction.
- Store only the allowlisted `entry_route` value; never send email, user ID, page ID, or raw URL query.
- Send events only for the production hostname `grabbin.me`; local and staging requests must not reach Simple Analytics.
- Do not add an analytics database, outbox, retry queue, internal dashboard, or dependency.
- Keep analytics delivery best effort; a failed analytics request must not fail authentication or page creation.
- Keep Simple Analytics browser calls inside `apps/web/lib/analytics/simple-analytics.ts`; callers must import functions instead of using `window.sa_event` directly.
- Do not add frontend automated tests. Use focused server tests, scoped checks, and real browser QA.
- Preserve unrelated dirty work and stage only files belonging to this feature.

---

### Task 1: Add the browser analytics function module

**Files:**
- Create: `apps/web/lib/analytics/simple-analytics.ts`
- Modify: `apps/web/lib/simple-analytics-tracker.tsx`

**Interfaces:**
- Consumes: Existing `window.sa_pageview`, `usePathname`, production host gate, and stable public-page ID tracking.
- Produces: `EntryRoute`, `getEntryRoute(pathname)`, `rememberEntryRoute(pathname)`, `trackSimpleAnalyticsPageview(path)`, and `trackSimpleAnalyticsEvent(name, metadata)`.

- [ ] **Step 1: Define the route and event types**

  Add the exact low-cardinality values used by the spec:

  ```ts
  export type EntryRoute =
    | "home"
    | "pricing"
    | "blog"
    | "demo"
    | "login"
    | "new"
    | "public_handle"
    | "other";

  export type SimpleAnalyticsEventName =
    | "signup_completed"
    | "first_page_created";
  ```

  Keep the event union narrow for now. Future feature events must add an explicit product question before extending it.

- [ ] **Step 2: Implement route normalization and the session cookie**

  Implement `getEntryRoute(pathname: string): EntryRoute` with these mappings: `/` to `home`, `/pricing` to `pricing`, `/blog/` prefixes to `blog`, `/demo` to `demo`, `/log-in` to `login`, `/new` to `new`, and any single public handle path to `public_handle`; return `other` for every remaining value.

  Implement `rememberEntryRoute(pathname: string): EntryRoute` so it reads `grabbin_entry_route` first and never overwrites an existing valid value. When no value exists, write the normalized value as a session cookie with `Path=/`, `Domain=.grabbin.me`, `SameSite=Lax`, and `Secure` on production HTTPS. Omit `Domain` on local hosts because local analytics is disabled. Invalid cookie values resolve to `other`.

- [ ] **Step 3: Wrap the Simple Analytics browser calls**

  Keep the browser boundary small and failure-tolerant:

  ```ts
  export function trackSimpleAnalyticsPageview(path?: string) {
    if (!isProductionHost()) return;
    window.sa_pageview?.(path);
  }

  export function trackSimpleAnalyticsEvent(
    name: SimpleAnalyticsEventName,
    metadata: { entry_route: EntryRoute },
  ) {
    if (!isProductionHost()) return;
    window.sa_event?.(name, metadata);
  }
  ```

  Define the `Window.sa_event` type in this module. Do not throw when the script has not loaded; the page and product flow must continue.

- [ ] **Step 4: Refactor the existing tracker to use imports**

  Preserve all existing behavior in `SimpleAnalyticsTracker`:

  - The layout tracker records the actual pathname.
  - The public handle tracker records `/__analytics/pages/{pageId}` once per page ID.
  - The page ID ref does not overwrite the first-visit route cookie.
  - Non-production hosts make no analytics calls.

  Replace direct `window.sa_pageview` calls with `trackSimpleAnalyticsPageview` and call `rememberEntryRoute(pathname)` only for the route tracker without `pageId`.

- [ ] **Step 5: Run the scoped browser checks**

  ```sh
  bunx biome check apps/web/lib/analytics/simple-analytics.ts apps/web/lib/simple-analytics-tracker.tsx
  bun --cwd apps/web run check
  ```

  Expected: the touched files pass formatting, lint, and TypeScript checks. No server or unrelated frontend file is modified.

- [ ] **Step 6: Commit the browser boundary**

  ```sh
  git add apps/web/lib/analytics/simple-analytics.ts apps/web/lib/simple-analytics-tracker.tsx
  git commit -m "feat: centralize browser analytics tracking"
  ```

### Task 2: Add the server Simple Analytics sender

**Files:**
- Create: `apps/server/src/services/simple-analytics.service.ts`
- Create: `apps/server/src/services/simple-analytics.service.test.ts`

**Interfaces:**
- Consumes: `AppBindings.FRONTEND_URL`, the incoming request's `cookie` and `user-agent` headers, and the Simple Analytics queue endpoint.
- Produces: `EntryRoute`, `getEntryRouteFromRequest(request)`, and `trackSimpleAnalyticsEvent(input): Promise<void>` for server callers.

- [ ] **Step 1: Define the server event input and route parser**

  Export the same `EntryRoute` values locally in the server module so the browser bundle is not imported into the Worker. Define:

  ```ts
  type TrackSimpleAnalyticsEventInput = {
    env: AppBindings;
    event: "signup_completed" | "first_page_created";
    request?: Request;
    entryRoute?: EntryRoute | null;
  };

  export function getEntryRouteFromRequest(request?: Request): EntryRoute;
  export async function trackSimpleAnalyticsEvent(
    input: TrackSimpleAnalyticsEventInput,
  ): Promise<void>;
  ```

  Parse only `grabbin_entry_route`, validate it against the allowlist, and return `other` for missing or invalid values.

- [ ] **Step 2: Add the production guard and queue payload**

  Derive the hostname from `new URL(env.FRONTEND_URL).hostname` and return without fetching unless it is `grabbin.me`. Send JSON to `https://queue.simpleanalyticscdn.com/events` with only this shape:

  ```ts
  {
    type: "event",
    hostname: "grabbin.me",
    event: input.event,
    metadata: { entry_route: resolvedEntryRoute },
    ua: input.request?.headers.get("user-agent") ??
      "ServerSide/1.0 (+https://grabbin.me/)",
  }
  ```

  Do not send an API key; the queue is for submission, while the existing Stats API key remains unrelated. Treat non-2xx responses and fetch exceptions as delivery failures.

- [ ] **Step 3: Keep delivery failures non-blocking**

  Catch fetch and response errors inside the function, log the event name and failure status without logging cookie values, and resolve normally. The function must never throw into the auth or page creation request.

- [ ] **Step 4: Add focused server tests**

  Use Bun's existing test runner and mock `globalThis.fetch` to cover the smallest useful contract:

  ```ts
  test("sends an allowlisted event payload in production", async () => {
    // set FRONTEND_URL to https://grabbin.me
    // call trackSimpleAnalyticsEvent with a request containing the route cookie
    // assert fetch URL, event, entry_route, and absence of user identifiers
  });

  test("skips non-production hosts", async () => {
    // set FRONTEND_URL to a local host and assert fetch is not called
  });

  test("swallows queue failures", async () => {
    // make fetch reject and assert the function resolves
  });
  ```

  Keep the test setup local to this service; do not add fixtures or a new test framework.

- [ ] **Step 5: Run the service test and check**

  ```sh
  cd apps/server
  bun test src/services/simple-analytics.service.test.ts
  bunx biome check src/services/simple-analytics.service.ts src/services/simple-analytics.service.test.ts
  ```

  Expected: all focused tests pass and no real network request is made by the test suite.

- [ ] **Step 6: Commit the sender**

  ```sh
  git add apps/server/src/services/simple-analytics.service.ts apps/server/src/services/simple-analytics.service.test.ts
  git commit -m "feat: add server simple analytics events"
  ```

### Task 3: Connect the first-visit route to Better Auth user creation

**Files:**
- Modify: `apps/server/src/core/auth.ts`
- Modify: `apps/server/src/core/auth.options.ts`

**Interfaces:**
- Consumes: `getEntryRouteFromRequest` and `trackSimpleAnalyticsEvent` from Task 2, plus the existing `AsyncLocalStorage` background-task bridge.
- Produces: A `signup_completed` event after every actual Better Auth user creation, for OTP and social flows alike.

- [ ] **Step 1: Preserve the auth request in the existing async context**

  Extend the existing `AuthExecutionContext` in `apps/server/src/core/auth.ts` with the incoming `Request`. Pass the same request into `authExecutionContext.run(...)`; do not create a second request store or change the auth handler signature. The existing `apps/server/src/controllers/auth.controller.ts` already passes `c.req.raw` into `handleAuthRequest`, so it remains unchanged.

  Add an option callback to `betterAuthOptions` that reads the current request from this context. Keep the callback optional so direct unit-test auth calls without a Worker execution context still work.

- [ ] **Step 2: Add the user-create-after hook**

  In `betterAuthOptions`, add `databaseHooks.user.create.after`. Read the request through the context callback, resolve `entry_route` with the server helper, and schedule this call through the existing `backgroundTaskHandler`:

  ```ts
  backgroundTaskHandler?.(
    trackSimpleAnalyticsEvent({
      env,
      event: "signup_completed",
      request,
      entryRoute: getEntryRouteFromRequest(request),
    }),
  );
  ```

  The hook must not run for returning sign-ins because it is attached to user creation, not session creation. Do not inspect or transmit the user's email or ID.

- [ ] **Step 3: Verify the auth context does not block responses**

  Run the existing auth/server checks and confirm the hook only schedules a promise. If no execution context exists, the existing `backgroundTaskHandler` behavior remains unchanged and authentication still completes.

  ```sh
  cd apps/server
  bunx biome check src/core/auth.ts src/core/auth.options.ts
  bun test
  ```

- [ ] **Step 4: Commit the signup event connection**

  ```sh
  git add apps/server/src/core/auth.ts apps/server/src/core/auth.options.ts
  git commit -m "feat: track new account creation"
  ```

### Task 4: Connect successful first-page creation

**Files:**
- Modify: `apps/server/src/controllers/pages.controller.ts`
- Modify: `apps/server/src/controllers/pages.controller.test.ts`

**Interfaces:**
- Consumes: `trackSimpleAnalyticsEvent` and `getEntryRouteFromRequest` from Task 2, `c.executionCtx.waitUntil`, and the existing `currentUser.primaryPageId` check.
- Produces: One `first_page_created` event only for a successful first-page response.

- [ ] **Step 1: Capture the first-page condition before the transaction**

  After `assertPageCreationAllowed` returns, derive a local boolean from the existing user value:

  ```ts
  const isFirstPage = currentUser.primaryPageId === null;
  ```

  Keep the existing transaction and authorization checks unchanged.

- [ ] **Step 2: Schedule the event only after page creation succeeds**

  After `createPage(...)` returns and before returning the `201` response, schedule the event only when `isFirstPage` is true:

  ```ts
  if (isFirstPage) {
    c.executionCtx.waitUntil(
      trackSimpleAnalyticsEvent({
        env: c.env,
        event: "first_page_created",
        request: c.req.raw,
        entryRoute: getEntryRouteFromRequest(c.req.raw),
      }),
    );
  }
  ```

  A failed create never reaches this block. A concurrent second request is rejected by the existing user-row lock and primary-page guard, so it must not schedule the event.

- [ ] **Step 3: Add the focused first-page event assertion**

  Extend the existing `createTestApp` helper to accept a test `env` and a captured `ExecutionContext`. For the first-page test, use `FRONTEND_URL: "https://grabbin.me"`, send a `Cookie: grabbin_entry_route=pricing` header, collect promises passed to `waitUntil`, and mock `globalThis.fetch` to return `204`. Assert that the response remains `201`, one scheduled promise resolves, and its captured request body contains `event: "first_page_created"` and `metadata.entry_route: "pricing"`.

  In the existing secondary-page test, keep `primaryPageId: "page_1"`, use the same captured execution context, and assert that no analytics promise is scheduled.

- [ ] **Step 4: Run focused controller and server checks**

  ```sh
  cd apps/server
  bun test src/controllers/pages.controller.test.ts
  bunx biome check src/controllers/pages.controller.ts
  ```

  Expected: existing page creation behavior remains passing; event scheduling does not alter the response body or status.

- [ ] **Step 5: Commit the activation event connection**

  ```sh
  git add apps/server/src/controllers/pages.controller.ts apps/server/src/controllers/pages.controller.test.ts
  git commit -m "feat: track first page activation"
  ```

### Task 5: Run end-to-end browser QA and configure the dashboard

**Files:**
- No repository file changes unless a focused defect from QA requires one.

**Interfaces:**
- Consumes: The completed browser and server event paths from Tasks 1-4.
- Produces: Production evidence for pageviews, route metadata, new-account events, first-page events, and failure isolation.

- [ ] **Step 1: Verify the browser route cookie and pageview behavior**

  On `https://grabbin.me`, open a fresh browser session and visit `/`, `/pricing`, `/blog`, `/demo`, `/log-in`, and a public handle page. Confirm:

  - the first visible route sets `grabbin_entry_route` once;
  - later routes do not overwrite it;
  - actual pathname pageviews still occur;
  - the public handle stable page ID path still occurs once;
  - no event is sent from localhost or staging.

- [ ] **Step 2: Verify OTP and social signup events**

  With disposable test accounts, complete one new OTP signup and one new social signup. In the browser/server network evidence and Simple Analytics Events Explorer, confirm exactly one `signup_completed` per newly created account and the expected `entry_route` metadata.

  Sign in with an existing account and confirm no `signup_completed` event is emitted.

- [ ] **Step 3: Verify first-page activation and duplicate protection**

  Create the first page for a new account and confirm one `first_page_created` event. Create a second page, retry a failed handle, and refresh the success screen; confirm none of these add another first-page event.

- [ ] **Step 4: Verify failure isolation and payload privacy**

  Temporarily make the Simple Analytics queue request fail in a controlled local test or mocked server test. Confirm auth and page creation still return their normal success result. Inspect the event payload and confirm it contains only the event name, hostname, user agent, and `entry_route` metadata.

- [ ] **Step 5: Create the Simple Analytics Goals**

  In the production Simple Analytics dashboard, create Goals for `signup_completed` and `first_page_created`. Use Events Explorer filters for `entry_route` and compare the same date range with pageview visitors. Label the result as an aggregate period conversion rate, not a user-level funnel.

- [ ] **Step 6: Record evidence without adding a repository test document**

  Record the browser URL, event names, `entry_route` values, timestamps, response statuses, and dashboard counts in the related Linear issue or its Resources. Do not add a local test document unless explicitly requested.

## Final Verification Commands

```sh
bunx biome check \
  apps/web/lib/analytics/simple-analytics.ts \
  apps/web/lib/simple-analytics-tracker.tsx \
  apps/server/src/services/simple-analytics.service.ts \
  apps/server/src/services/simple-analytics.service.test.ts \
  apps/server/src/core/auth.ts \
  apps/server/src/core/auth.options.ts \
  apps/server/src/controllers/pages.controller.ts

cd apps/server
bun test src/services/simple-analytics.service.test.ts
bun test src/controllers/pages.controller.test.ts
```

Expected: focused checks pass, no production event is sent from local/staging, and the manual QA evidence confirms the two event contracts and route metadata.
