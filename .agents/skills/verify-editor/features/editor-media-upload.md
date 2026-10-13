# Media upload and cancel

An owner adds a photo/video from the toolbar; a placeholder appears immediately, the file uploads, and the block switches to the stored media. Deleting the block while it uploads cancels the upload.

## Sub-features

- `media-add` shows a local preview block right after the file is chosen.
- `media-upload` gets a presigned PUT URL from the API, uploads the file to R2, and sets the item's `objectKey`.
- `media-cancel` deleting during upload aborts it and removes the pending upload record.
- `media-replace-link-image` replaces a link card image (`Replace link image`).

## How to get to it (user POV)

- Owner view of `/{handle}` → toolbar `Add media` → pick a file.
- On a link card: `Replace link image` / `Remove link image`.

## Driving it with Playwright

Preconditions:

- Signed-in owner with a page. A small image fixture (any real PNG/JPEG, e.g. a screenshot from an earlier run).
- A valid `R2_S3_CREDENTIALS` in `apps/server/.env` (JSON: `endpoint`, `bucketName`, `region: "auto"`, `accessKeyId`, `secretAccessKey`). Without it this journey is **blocked**, not failed.

- **Choose file.** `page.setInputFiles` on the toolbar's file input (the `button "Choose File"` inside `group "Page editor toolbar"`), or wait for the file chooser after clicking `Add media`. A new media block appears with a blurred preview.
- **Upload completes.** Wait for the upload request to the API to finish (`/pages/.../media` 2xx). Reload; the block shows the stored image served from `http://127.0.0.1:3001`.
- **Cancel.** Add a larger file, click `Delete item` on the new block before the upload finishes. The block disappears and no `page_media_assets` row stays attached to it.
- **Proof.** Screenshots before/after, network log of the upload, `select * from page_media_assets order by created_at desc limit 3`.

## Gotchas

- `/demo` keeps media local (`blob:` preview only); it cannot prove upload or cancel.
- `R2_LOCAL_MODE=true` only makes the API serve reads from the local `R2_BUCKET` binding (`/media/*`). Creating an upload always presigns against `R2_S3_CREDENTIALS` (`services/media.service.ts`); if it is missing or invalid, `POST /pages/{handle}/items/upload` returns 500 and the server log shows `Error: R2 upload credentials are invalid.` (seen Oct 13 2026: the box `.env` intentionally has no R2 keys).
- `media-cancel` needs an in-flight upload, so it is blocked whenever `media-upload` is.
- Local R2 lives under the wrangler `--persist-to` dir in `$RUN_DIR`; cleanup removes stored files but not evidence.
