# Add links to text and media cards

An owner gives a text or media card a destination URL. The card's visible action opens the saved HTTPS link.

## Sub-features

- `text-destination-link` adds, changes, and clears a destination on a text card.
- `media-destination-link` adds, changes, and clears a destination on a media card.
- `destination-link-validation` rejects invalid URLs without replacing the saved value.
- `destination-link-persist` restores a valid destination after reload.

## How to get to it (user POV)

- Sign in as `featuremap@example.com` and open `/featuremap-test`.
- Add a text or media card if needed. Hover a text card to reveal `Add text link`; hover a media card to reveal `Add media link`.
- Use `Edit text link` or `Edit media link` after the first save.

## Driving it with Playwright

Preconditions:

- Run the `verify-editor` doctor, sign in as `featuremap@example.com`, and open its `featuremap-test` page with the local Pro grant.
- For media, upload a valid image through the local R2 binding. Record the item IDs and original `data` values.

- **Text link.** Hover the text card, click `button "Add text link"`, fill `textbox "Link URL"` with `https://example.com/featuremap-text`, then press Enter. Confirm the card exposes `link "Open text link"` with that URL.
- **Media link.** Hover the media card, click `button "Add media link"`, enter `https://example.com/featuremap-media`, and commit it. Confirm `link "Open media"` has that URL.
- **Validation.** In each edit popover, enter `not a url` and move focus away. Confirm `textbox "Link URL"` is invalid and the prior destination remains on the card.
- **Persistence.** Wait for item saving, reload, and confirm both actions still point to their saved URLs. Read `select id, type, data from page_items where id in ('<text-id>', '<media-id>')` and confirm each `data.link` value.
- **Clear.** Clear each `Link URL` and commit. Reload and confirm the external actions are gone and both rows omit `link`.
- **Proof.** Save screenshots, ARIA snapshots, observed outbound URLs, and read-only rows before and after.

## Gotchas

- The item controls appear on hover or focus. Focus the intended card before querying a link control.
- Link controls commit on blur or Enter. Invalid non-empty values do not commit.
- Text and media destinations use the same `Link URL` label, so scope each locator to its open popover or card shell.
- Media cards need a completed upload before they can be used for this journey.
