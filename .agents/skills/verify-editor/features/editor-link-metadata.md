# Link metadata refresh

An owner adds a link and the card fills in title, icon, and image from the URL; `Refresh link metadata` fetches them again after the URL changes.

## Sub-features

- `link-add` adds a link card from `Add link` → `Link URL`.
- `link-url-edit` changes the link destination through `Edit link URL`.
- `link-url-validation` rejects an invalid or empty link URL without changing the saved destination.
- `link-metadata-initial` fills provider/title after adding.
- `link-metadata-refresh` re-fetches with `Refresh link metadata` (from `Edit link URL`).

## How to get to it (user POV)

- Owner view → toolbar `Add link` → type or paste into `textbox "Link URL"` (placeholder "Add or paste link") → Enter.
- On a link card: `Edit link URL` → change the URL → `Refresh link metadata`.

## Driving it with Playwright

Preconditions:

- Sign in as `featuremap@example.com` and use its `featuremap-test` page with the local Pro grant. The server needs outbound network access to the target site. Provider keys (YouTube, GitHub, Twitch, CHZZK, Product Hunt) improve results.

- **Add.** Click `Add link`, fill `Link URL` with `https://github.com/microsoft/playwright`, press Enter. A link card appears; within a few seconds its `Link title` is filled.
- **Refresh.** Hover the card, click `Edit link URL`; the popover holds `textbox "Link URL"` and `button "Refresh link metadata"`. Clicking refresh sends `POST /pages/{handle}/metadata` with `{ itemId, url }`; the server refetches, merges, and **writes `page_items` itself** (no batch `PATCH` needed). To make it observable, set `data->'metadata'->>'title'` to a stale value in the local DB first.
- **Change destination.** Hover the card and click `Edit link URL`. Fill `textbox "Link URL"` with a valid HTTPS URL, then press Enter or move focus away. Confirm the card's destination updates. Wait for save, reload the owner page, and confirm the URL remains. Read `select id, data->>'url' as url from page_items where id = '<item-id>'`.
- **Reject invalid input.** In the same popover, enter `not a url` and move focus away. Confirm `textbox "Link URL"` is invalid and the previous destination remains after reload. Link items do not allow an empty URL.
- **Scripted.** `node scripts/drive-editor-journeys.mjs "$EVIDENCE_DIR" link-refresh` (it saves `metadata-response.json`).
- **Proof.** Before/after screenshots, the `POST` to the API metadata route, and `select data->'metadata' from page_items where id = ...`.

## Gotchas

- On `/demo` metadata is resolved locally without the API (`persistItems` off); it does not prove the server refresh path.
- Sandboxed boxes may block outbound HTTP from workerd; then metadata stays empty. Report it as an environment block.
- `Edit link URL` (and the other per-item controls) only show on hover; hover the card's `Link title` first, or the click times out.
- Refresh is flaky against GitHub. Out of 6 runs on Oct 14 2026, 4 PASS and 2 returned 200 but kept the old title; one captured response had no `description` or `imageUrl`. On Oct 15 2026, two more target URLs returned 200 but kept the stale title. The server merges new metadata over the old, so an empty upstream fetch keeps the stale title. That is an upstream or environment result, not an editor bug; retry once and attach `metadata-response.json`.
- Verified Oct 13 2026 (PR #1 run): add `https://github.com/honojs/hono` → title "GitHub - honojs/hono: Web framework built on Web Standards", then edit URL to `https://github.com/microsoft/playwright` → `/pages/{handle}/metadata` 200 and the new title in `page_items`. PASS.
