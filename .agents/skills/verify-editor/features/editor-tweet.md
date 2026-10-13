# Add a Tweet (X post)

An owner adds an X post as a large card by giving its status URL; the post is loaded and embedded.

## Sub-features

- `tweet-open` opens the X widget from the `Advanced` dialog.
- `tweet-add` loads the post and adds a `Full square` card.
- `tweet-invalid` shows "Unable to load this Tweet. Try again." for a bad or unavailable URL.

## How to get to it (user POV)

- Owner view or `/demo` → toolbar `Advanced` → find the X widget (use `textbox "Search widgets"`) → paste a status URL → add.

## Driving it with Playwright

Preconditions:

- `doctor.sh` OK. Outbound HTTPS to `react-tweet.vercel.app` from the browser.

- **Open.** Click `button "Advanced"`, fill `Search widgets` with `X`, open the X widget (`Back to widgets` returns to the list).
- **Add.** Paste `https://x.com/<user>/status/<id>` of a public post and confirm. A new card with the post appears.
- **Invalid.** Repeat with `https://x.com/i/status/1`. The error toast appears and no card is added.
- **Proof.** ARIA snapshot of the dialog, screenshot of the new card, `actions.md`; owner runs also read the `page_items` row (`metadata.provider = 'tweet'`).

## Gotchas

- The widget's exact accessible names inside the dialog were not captured when this map was seeded; take an ARIA snapshot after `Advanced` and update this file.
- The tweet is fetched from `react-tweet.vercel.app` by the browser; offline or blocked egress makes `tweet-add` fail for environment reasons.
