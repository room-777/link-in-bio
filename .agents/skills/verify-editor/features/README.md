# Grabbin feature verification map

This is the full maintained list of the mapped user journeys. Use the matching file for steps and proof standards. All browser journeys should use the actual user path and ARIA names below; a visible success message alone does not prove a saved change.

## Baseline preconditions

- Run only against a local stack at web `http://127.0.0.1:3000`, API `http://127.0.0.1:3001`, and the dedicated disposable PostgreSQL container on `127.0.0.1:15432`.
- For owner journeys, use local `featuremap@example.com`, handle `featuremap-test`, and the local Pro grant. Reuse the saved owner browser state at `~/.cache/grabbin-featuremap/owner-session.json`; recreate it only if it is missing or expired. Verify the target database and storage before changing data.
- Use a fresh browser context per journey. Load the saved owner state for protected journeys; the sign-in journey must start with an empty context. Never drive an instance you did not start or use production database/R2 credentials.
- `/demo` is database-free and Free. It proves editor interactions only, never sign-in, saving, Pro access, uploads, or a public stored page.

## Driving conventions

- Use Playwright with Chromium, fresh context, accessible roles/names, and stable page routes. Prefer the exact names listed in each journey over coordinates.
- Capture the action and resulting state: `actions.md`, before/after ARIA snapshots and screenshots, relevant request outcomes, and read-only database rows for persisted data.
- Wait for the save request to finish before reload. Confirm persisted changes from a new context and a database readback.
- Restore changed profile values, handle, items, layouts, and media after proof. Keep evidence under `artifacts/verify-editor/<RUN_ID>/<feature-id>/`; never commit it.
- When an external service or fixture is unavailable, report the journey as blocked with the unmet precondition. Do not substitute `/demo` or a different path.

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
