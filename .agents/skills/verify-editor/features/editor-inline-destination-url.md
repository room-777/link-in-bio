# Add links to text and media cards

An owner can give a text or media card an optional destination URL. Link cards have their own required destination and are covered by the link metadata map.

## Sub-features

- `text-destination-add` and `media-destination-add`: add an external destination.
- `destination-edit`: change a saved destination.
- `destination-clear`: remove the optional destination.
- `destination-validation`: reject invalid input without replacing the saved value.
- `destination-persist`: restore the destination after reload.

## How to get to it (user POV)

- Sign in and open your `/{handle}` page.
- Add a text or uploaded media card if needed, focus or hover it, then choose `Add text link` or `Add media link`.

## Driving it with Playwright

Preconditions:

- Use the local signed-in owner page. Finish media upload before testing a media destination.
- Record the original item data and restore the test values after proof.

- **Add and open.** Enter `https://example.com/featuremap-text` or `https://example.com/featuremap-media` in the matching `Link URL` field. Confirm the card action points to that URL.
- **Edit and validate.** Change the destination, then try `not a url`. Confirm invalid input is rejected and the previously saved URL remains.
- **Persist.** Wait for autosave and reload in a new context. Confirm the card action still points to the saved URL and the matching `page_items.data.url` is present.
- **Clear.** Empty the field and commit. Reload and confirm the external card action and `data.url` are gone.
- **Proof.** Capture before/after screenshots, ARIA snapshots, observed URLs, and read-only item rows.

## Gotchas

- `/demo` does not persist changes; use the owner page for persistence.
- Controls appear on hover or focus. Scope the shared `Link URL` field to its open editor.
- Older stored rows may use `data.link`; check the current API representation when reading old data.
