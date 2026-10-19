# Add a Tweet (X post)

An owner adds an X post as a large card by giving its status URL; the post is loaded and embedded.

## Sub-features

- `tweet-open` opens the X widget from the `Advanced` dialog.
- `tweet-add` loads the post and adds a `Full square` card.
- `tweet-invalid` shows "Unable to load this Tweet. Try again." for a bad or unavailable URL.

## How to get to it (user POV)

- Signed-in Pro owner view → toolbar `Advanced` → `Tweet` → paste a status URL → `Add`.

## Driving it with Playwright

Preconditions:

- `doctor.sh` OK, signed-in owner. Outbound HTTPS to `react-tweet.vercel.app` from the API server.
- **Pro plan.** The shared fixture is granted the local-only `local-pro` product by `.agents/skills/verify-editor/scripts/prepare-feature-map-account.sh`. On a Free account clicking `Tweet` opens `dialog "Upgrade to Pro"` instead (`advanced-widgets-dialog.tsx`, `session.plan.tier === "pro"`).

- **Open.** Click `button "Advanced"` (toolbar) → `dialog "Advanced widgets"` lists buttons `Tweet`, `Spotify`, `SoundCloud`, `Apple Music`, `Signature`, `Calendly`, `RSS Feed` (and `textbox "Search widgets"`; searching `X` finds nothing). Click `button "Tweet"` → `dialog "Tweet"` with `Back to widgets`, `Close`, `group "Preview size"` (`Portrait` / `Full square`), `textbox "Tweet ID or URL"`, `button "Add"` (disabled until filled).
- **Add.** Fill `Tweet ID or URL` with a public post (e.g. `https://x.com/jack/status/20`), click `Add`. The browser sends `POST /widgets/preview` with `{ kind: "tweet", url }`. A card appears; the row is `type = 'tweet'`, `data->>'url' = 'https://x.com/i/status/<id>'`, and `data->'tweet'` holds the post.
- **Invalid.** Repeat with `https://x.com/i/status/1`. The error toast appears and no card is added.
- **Proof.** ARIA snapshot of the dialog, screenshot of the new card, `actions.md`; owner runs also read the `page_items` row (`type = 'tweet'`).

## Gotchas

- `local-pro` is included in the local worker environment as `CREEM_PRO_MONTHLY_PRODUCT_ID`, and the fixture subscription is renewed by `.agents/skills/verify-editor/scripts/prepare-feature-map-account.sh`. This applies only to the local PostgreSQL database; do not grant or test against a shared/remote or production database.
- The API server fetches the tweet from `react-tweet.vercel.app`; offline or blocked egress on the server makes `tweet-add` fail for environment reasons.
