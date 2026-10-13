# Grabbin editor verification map

Maintained recipes for the signed-in editor and sign-in, driven against the full local stack from [the verify-editor skill](../SKILL.md). The demo-only map lives in [`../../verify/features`](../../verify/features/README.md).

## Baseline preconditions

- Stack launched with `scripts/start-local.sh` and `scripts/doctor.sh` prints `OK: stack healthy`.
- Web at `http://127.0.0.1:3000`, API at `http://127.0.0.1:3001`, Postgres at `127.0.0.1:54322` with migrations applied.
- Test identity: `dev@example.com` only. Never a deliverable address (`RESEND_API_KEY` may be real).
- Owner journeys need the PR #5 session fix (on `main` since `c80d21e`). Tweet needs a local Pro grant (see editor-tweet); media needs `R2_S3_CREDENTIALS`.
- Signed-in journeys need the `dev@example.com` account with a primary page (create one via `/create` on first run).

## Driving conventions

- Headless Playwright, a fresh context per run, ARIA role + accessible name locators.
- Editor controls live in the `group "Page editor toolbar"` (buttons `Add media`, `Add map`, `Add text`, `Add section`, `Add link`, `Advanced`) and on each item (`Delete item`, size presets `Small square` / `Half banner` / `Wide` / `Portrait` / `Full square`, `Edit link URL`, `Refresh link metadata`).
- The owner editor saves automatically ~1.5 s after the last change. Wait for that before reloading.
- Restore what you change; keep the evidence.

## Proof and skip reporting

- Capture the action and the resulting state (before/after ARIA snapshot + screenshot), plus `actions.md`.
- Persistence needs a second view: reload in a new context and read `page_items` from Postgres.
- A `/demo` run proves editor interaction only (persistence is off there). Never report it as a save proof.
- If a precondition is missing, report the journey as blocked with the reason. Do not substitute another entry point.

## Features

- [Sign in with email OTP](./sign-in-email-otp.md): `/sign-in` → code → signed-in landing.
- [Add an item](./editor-add-item.md): toolbar `Add text` / `Add section` / `Add link` / `Add map`, then delete.
- [Media upload and cancel](./editor-media-upload.md): toolbar `Add media`, upload to local R2, delete mid-upload.
- [Link metadata refresh](./editor-link-metadata.md): `Add link` and `Refresh link metadata`.
- [Add a Tweet (X post)](./editor-tweet.md): `Advanced` → X widget with a status URL.
