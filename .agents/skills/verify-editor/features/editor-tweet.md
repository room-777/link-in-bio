# Add a Tweet (X post)

An owner adds an X post as a large card by giving its status URL; the post is loaded and embedded.

## Sub-features

- `tweet-open` opens the X widget from the `Advanced` dialog.
- `tweet-add` loads the post and adds a `Full square` card.
- `tweet-invalid` shows "Unable to load this Tweet. Try again." for a bad or unavailable URL.

## How to get to it (user POV)

- Owner view or `/demo` → toolbar `Advanced` → `Tweet` (Pro only) → paste a status URL → `Add`.

## Driving it with Playwright

Preconditions:

- `doctor.sh` OK, signed-in owner. Outbound HTTPS to `react-tweet.vercel.app` from the browser.
- **Pro plan.** On a Free account clicking `Tweet` opens `dialog "Upgrade to Pro"` instead (`advanced-widgets-dialog.tsx`, `session.plan.tier === "pro"`). Grant Pro on the **local** DB only (see Gotchas).

- **Open.** Click `button "Advanced"` (toolbar) → `dialog "Advanced widgets"` lists buttons `Tweet`, `Spotify`, `SoundCloud`, `Apple Music`, `Signature`, `Calendly`, `RSS Feed` (and `textbox "Search widgets"`; searching `X` finds nothing). Click `button "Tweet"` → `dialog "Tweet"` with `Back to widgets`, `Close`, `group "Preview size"` (`Portrait` / `Full square`), `textbox "Tweet ID or URL"`, `button "Add"` (disabled until filled).
- **Add.** Fill `Tweet ID or URL` with a public post (e.g. `https://x.com/jack/status/20`), click `Add`. A card appears; the row is `type = 'link'`, `data->>'url' = 'https://x.com/i/status/<id>'`, `data->'metadata'->>'provider' = 'tweet'`.
- **Invalid.** Repeat with `https://x.com/i/status/1`. The error toast appears and no card is added.
- **Proof.** ARIA snapshot of the dialog, screenshot of the new card, `actions.md`; owner runs also read the `page_items` row (`data->'metadata'->>'provider' = 'tweet'`).

## Gotchas

- Local Pro grant (local Postgres `127.0.0.1:54322` only, never a shared/remote DB). Plan comes from `creem_subscription` via `getPlanAccess` (`packages/plan`): a row with `product_id` in `CREEM_PRO_MONTHLY_PRODUCT_ID`/`CREEM_PRO_YEARLY_PRODUCT_ID`, status `active`/`trialing`/`paid`, and `period_end` in the future:
  ```sh
  PID=$(sed -n 's/^CREEM_PRO_MONTHLY_PRODUCT_ID=//p' apps/server/.env | tr -d '"')
  docker exec supabase_db_grabbin psql -U postgres -c "insert into creem_subscription (id, product_id, reference_id, creem_subscription_id, status, period_end) select 'local-dev-pro', '$PID', id, 'local-dev-pro', 'active', now() + interval '1 year' from \"user\" where email = 'dev@example.com' on conflict (id) do nothing"
  ```
  Remove with `delete from creem_subscription where id = 'local-dev-pro'`. Verified Oct 13 2026: after the grant, `tweet-add` PASS.
- The tweet is fetched from `react-tweet.vercel.app` by the browser; offline or blocked egress makes `tweet-add` fail for environment reasons.
