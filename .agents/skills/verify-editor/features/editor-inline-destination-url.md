# Add links to text and media cards

An owner can make a text or media card open an external URL. These optional destinations are saved as `data.url`; link cards keep their separate required URL and metadata flow.

## Sub-features

- `text-destination-add` adds a destination to a text card.
- `media-destination-add` adds a destination to a media card.
- `destination-edit` changes a saved destination.
- `destination-clear` clears an optional destination.
- `destination-validation` rejects an invalid URL without replacing the saved value.
- `destination-persist` restores the destination after reload.
- `destination-open` opens the saved URL from the card action.

## How to get to it (user POV)

- Sign in as `featuremap@example.com` and open `/featuremap-test`.
- Add a text or media card if needed. Hover the card to reveal its controls.
- Choose `Add text link` or `Add media link`. After saving, use `Edit text link` or `Edit media link` to change it.

## Driving it with Playwright

Preconditions:

- Run the `verify-editor` doctor and open the signed-in owner page.
- For a media card, finish uploading an image before testing its destination.

- **Text destination.** Hover the text card, choose `Add text link`, enter `https://example.com/featuremap-text`, and press Enter. Confirm `Open text link` points to that URL.
- **Media destination.** Hover the media card, choose `Add media link`, enter `https://example.com/featuremap-media`, and press Enter. Confirm `Open media` points to that URL.
- **Validation.** Edit each destination, enter `not a url`, and move focus away. Confirm the field is invalid and the previously saved destination remains.
- **Persistence.** Wait for autosave, reload in a fresh browser context, and confirm each card action still points to its URL. Read `page_items.data` and confirm the destination is stored in `data.url`.
- **Clear.** Empty each `Link URL` field, commit, and reload. Confirm the external card action is gone and `data.url` is absent.
- **Proof.** Save before/after screenshots, ARIA snapshots, observed URLs, and read-only database rows under `$EVIDENCE_DIR/editor-inline-destination-url/`.

## Gotchas

- `/demo` does not persist changes; use the signed-in owner page for persistence proof.
- The controls appear on hover or focus. Focus the intended card before querying its link control.
- Text and media destinations accept HTTPS URLs and share the `Link URL` field label, so scope each locator to its open popover.
- Older rows may use `data.link`; the current API and migration store these destinations as `data.url`.
- Link-card destinations are covered by [Link metadata refresh](./editor-link-metadata.md); `Add link` does not test text or media destinations.
