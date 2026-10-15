# Grabbin editor verification map

Maintained recipes for the signed-in editor and sign-in, driven against the full local stack from [the verify-editor skill](../SKILL.md). The demo-only map lives in [`../../verify/features`](../../verify/features/README.md).

## Baseline preconditions

- Stack launched with `scripts/cloud-agent-start.sh` and `scripts/doctor.sh` prints `OK: stack healthy`.
- Every provider uses web `http://127.0.0.1:3000`, API `http://127.0.0.1:3001`, and local PostgreSQL at `127.0.0.1:5432`.
- Shared identity: `featuremap@example.com`, handle `featuremap-test`, and local Pro product `local-pro`. The launcher creates the same user and Pro grant in each disposable local database. `drive-create-page.mjs` signs in and creates the handle through `/create` on first run.
- `/demo` is intentionally database-free and Free. It can prove demo interactions only; it never counts as proof for owner access, Pro widgets, persistence, or a public stored page.
- Media upload/cancel require the shared Alchemy local R2 endpoint. Never use real R2 keys or a production database.

## Driving conventions

- Headless Playwright, a fresh context per run, ARIA role + accessible name locators.
- Use the same account (`featuremap@example.com`), handle (`featuremap-test`), and local Pro grant (`local-pro`) in Grok Bot, Cursor, and Codex.
- Editor controls live in the `group "Page editor toolbar"` (buttons `Add media`, `Add map`, `Add text`, `Add section`, `Add link`, `Advanced`) and on each item. Item controls include `Delete item`, size presets (`Small square`, `Half banner`, `Wide`, `Portrait`, `Full square`), `Edit link URL`, `Add/Edit text link`, `Add/Edit media link`, `Refresh link metadata`, text style, media crop, map search and navigation, and media or link captions.
- The owner editor saves automatically ~1.5 s after the last change. Wait for that before reloading.
- Restore what you change; keep the evidence.

## Proof and skip reporting

- Capture the action and the resulting state (before/after ARIA snapshot + screenshot), plus `actions.md`.
- Persistence needs a second view: reload in a new context and read `page_items` from Postgres.
- A `/demo` run proves editor interaction only (persistence is off there). Never report it as a save proof or a Pro-gated feature proof.
- If a precondition is missing, report the journey as blocked with the reason. Do not substitute another entry point.

## Features

- [Sign in with email OTP](./sign-in-email-otp.md): `/sign-in` → code → signed-in landing.
- [Add an item](./editor-add-item.md): toolbar `Add text` / `Add section` / `Add link` / `Add map`, then delete.
- [Media upload and cancel](./editor-media-upload.md): toolbar `Add media`, upload to local R2, delete mid-upload.
- [Profile and handle](./editor-profile-and-handle.md): edit the name, bio, profile image, image crop, and page handle.
- [Layout and item placement](./editor-layout.md): switch compact and wide layouts, drag items, and apply size presets.
- [Text formatting](./editor-text-formatting.md): edit text and section content, alignment, and background colors.
- [Media editing](./editor-media-editing.md): edit captions and crop uploaded media.
- [Map editing](./editor-map-editing.md): search for a location and adjust the map view.
- [Link card images](./editor-link-card-images.md): add, replace, and remove a link card image.
- [Link metadata refresh](./editor-link-metadata.md): `Add link` and `Refresh link metadata`.
- [Text and media destination URLs](./editor-inline-destination-url.md): add, edit, clear, and confirm optional destinations.
- [Add a Tweet (X post)](./editor-tweet.md): `Advanced` → X widget with a status URL.
- [Advanced widgets](./editor-advanced-widgets.md): browse the catalog and add Spotify, RSS, or Calendly widgets.
- [Share the page](./editor-page-sharing.md): open the share dialog, copy the page link, and read its QR code.
