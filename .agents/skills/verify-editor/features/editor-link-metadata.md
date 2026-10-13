# Link metadata refresh

An owner adds a link and the card fills in title, icon, and image from the URL; `Refresh link metadata` fetches them again after the URL changes.

## Sub-features

- `link-add` adds a link card from `Add link` → `Link URL`.
- `link-metadata-initial` fills provider/title after adding.
- `link-metadata-refresh` re-fetches with `Refresh link metadata` (from `Edit link URL`).

## How to get to it (user POV)

- Owner view → toolbar `Add link` → type or paste into `textbox "Link URL"` (placeholder "Add or paste link") → Enter.
- On a link card: `Edit link URL` → change the URL → `Refresh link metadata`.

## Driving it with Playwright

Preconditions:

- Signed-in owner with a page (blocked today). Outbound network for the target site; provider keys (YouTube, GitHub, Twitch, CHZZK, Product Hunt) improve results.

- **Add.** Click `Add link`, fill `Link URL` with `https://github.com/honojs/hono`, press Enter. A link card appears; within a few seconds its `Link title` is filled.
- **Refresh.** Click `Edit link URL`, change the URL, click `Refresh link metadata`. The card title/icon change.
- **Proof.** Before/after screenshots, the `POST` to the API metadata route, and `select data->'metadata' from page_items where id = ...`.

## Gotchas

- On `/demo` metadata is resolved locally without the API (`persistItems` off); it does not prove the server refresh path.
- Sandboxed boxes may block outbound HTTP from workerd; then metadata stays empty. Report it as an environment block.
- `Edit link URL` (and the other per-item controls) only show on hover; hover the card's `Link title` first, or the click times out.
- Verified Oct 13 2026 (PR #1 run): add `https://github.com/honojs/hono` → title "GitHub - honojs/hono: Web framework built on Web Standards", then edit URL to `https://github.com/microsoft/playwright` → `/pages/{handle}/metadata` 200 and the new title in `page_items`. PASS.
