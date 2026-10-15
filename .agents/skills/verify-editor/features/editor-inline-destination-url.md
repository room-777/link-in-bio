# Text and media destination URLs

An owner can make a text or media block open an external destination. These optional URLs use `data.url`; link cards keep their separate required URL and metadata flow.

## Sub-features

- `text-destination-add` adds a destination with `Add text link` in the text block controls.
- `media-destination-add` adds a destination with `Add media link` in the media block controls.
- `destination-edit` changes a saved destination through `Edit text link` or `Edit media link`.
- `destination-clear` clears the optional URL by emptying the `Link URL` field.
- `destination-persist` saves the URL to `page_items.data.url` and restores the external action after reload.
- `destination-open` opens the saved URL from `Open text link` or `Open media`.

## How to get to it (user POV)

- Sign in with `dev@example.com`, open the owner's `/{handle}`, and add a text block with `Add text` or an image/video block with `Add media`.
- Hover the block to reveal its controls. Choose `Add text link` or `Add media link`; existing destinations use the matching `Edit ... link` control.

## Driving it with Playwright

Preconditions:

- `doctor.sh` is OK and `dev@example.com` has an owner page.
- For the media journey, run `bun run dev` so Alchemy provides the local R2 endpoint. Never use production R2 credentials.

- **Text.** Click `Add text`, fill `textbox "Text content"`, hover the block, click `button "Add text link"`, and fill `textbox "Link URL"` with `https://example.com/text-destination`. Press Enter or blur to commit.
- **Media.** Click `Add media`, choose a small local image, wait for upload and autosave, hover the block, click `button "Add media link"`, and fill `textbox "Link URL"` with `https://example.com/media-destination`. Press Enter or blur to commit.
- **Persist.** Wait at least 2 seconds for autosave, reload in a fresh browser context, and confirm each block exposes `Open text link` / `Open media`. Read the corresponding `page_items` rows and confirm `data->>'url'` equals the entered URL.
- **Edit and clear.** Use `Edit text link` / `Edit media link`, change the URL and reload; then clear the field and confirm the external action disappears after reload.
- **Proof.** Save before/after screenshots and ARIA snapshots plus `actions.md`; include the two `page_items.data` values. Keep proof under `$EVIDENCE_DIR/editor-inline-destination-url/`.

## Gotchas

- `/demo` does not persist changes; only the signed-in owner view proves the API and database path.
- The controls are hover-revealed. Hover the item before locating its `Add ... link` or `Edit ... link` button.
- The input accepts HTTPS destinations only. An invalid value stays in the editor and must not be reported as saved.
- Legacy rows with `data.link` remain readable during rollout. New API requests canonicalize text/media destinations to `data.url`; the migration has a separate deployment order in `packages/db/src/migrations/0018_rename_text_media_link_to_url.sql`.
- Link-card destinations and metadata are covered by [Link metadata refresh](./editor-link-metadata.md); do not use `Add link` as a substitute for this feature.
