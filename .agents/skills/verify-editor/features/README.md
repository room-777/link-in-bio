# Grabbin feature verification map

This is the full maintained list of the mapped user journeys. Use the matching file for steps and proof standards. All browser journeys should use the actual user path and ARIA names below; a visible success message alone does not prove a saved change.

## Baseline preconditions

- Run through `bun run featuremap`, which starts an isolated local stack (web, API, mock outbound server, and a dedicated disposable PostgreSQL container) and never touches another instance or production database/R2 credentials.
- `journeys/account.setup.ts` creates local `featuremap@example.com` with handle `featuremap-test` and the local Pro grant. Each journey then seeds its own owner copy (`featuremap-test-jN`) with a signed session, so journeys share no data. The sign-in journey starts from an empty context.
- `/demo` is database-free and Free. It proves editor interactions only, never sign-in, saving, Pro access, uploads, or a public stored page.

## Driving conventions

- Use the `@playwright/test` fixtures in `harness/fixtures.ts`, accessible roles/names, and stable page routes. Prefer the exact names listed in each journey over coordinates.
- Capture the action and resulting state with `proof()` (screenshot and ARIA snapshot under `featuremap-results/screenshots/<feature-id>/`) and read-only database rows for persisted data.
- Wait for the save to settle before reload. Confirm persisted changes after a reload or a new context and a database readback.
- Each run reseeds the journey owners, so a journey does not need to restore what it changed. Never commit `featuremap-results/`.
- Every external provider is served by local fixtures; a journey that cannot reach one fails rather than reporting a block.

## Features

- [Email OTP sign-in](./sign-in-email-otp.md): request and verify a code, then reach the right account page.
- [Add and remove page items](./editor-add-item.md): text, section, link, map, delete, and owner persistence.
- [Media upload and cancel](./editor-media-upload.md): upload through local R2 and cancel a pending upload.
- [Profile and handle](./editor-profile-and-handle.md): profile text/image, crop, removal, and handle change.
- [Layout](./editor-layout.md): compact/wide layouts, drag, size presets, and persistence.
- [Text formatting](./editor-text-formatting.md): content, alignment, color, and persistence.
- [Media editing](./editor-media-editing.md): captions, crop, and persistence.
- [Map editing](./editor-map-editing.md): add a map and search for a place.
- [Link card images](./editor-link-card-images.md): add, replace, remove, and persistence.
- [Link metadata](./editor-link-metadata.md): add a URL and refresh fetched details.
- [Text/media destinations](./editor-inline-destination-url.md): add, edit, validate, clear, and persist optional URLs.
- [X post](./editor-tweet.md): add a public post and reject an unavailable post.
- [Advanced widgets](./editor-advanced-widgets.md): browse, search, plan gate, provider add flows, and placeholders.
- [Page sharing](./editor-page-sharing.md): open the share dialog, show its QR graphic, copy the page URL, and open the dialog on mobile.
