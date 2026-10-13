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

- Signed-in owner with a page. `scripts/drive-editor-journeys.mjs` writes its own 64x64 PNG fixture (153 B).
- A valid `R2_S3_CREDENTIALS` in `apps/server/.env` (JSON: `endpoint`, `bucketName`, `region: "auto"`, `accessKeyId`, `secretAccessKey`; endpoint `https://<account>.r2.cloudflarestorage.com`). Without it this journey is **blocked**, not failed. This is a **real bucket**: upload only tiny test images and delete them afterwards (`scripts/r2-objects.py`).
- `R2_PUBLIC_URL=http://127.0.0.1:3001` in `apps/server/.env`. The `.env.example` ships `R2_PUBLIC_URL=` (empty), and `--env-file` overrides the wrangler `vars`, so the API returns no `mediaUrl` and the block renders without an `<img>` after reload.

- **Flow.** `POST /pages/{handle}/items/upload` (presigned URL, `page_media_assets` row `pending`) → browser `PUT` to `<account>.r2.cloudflarestorage.com` → `POST .../items/upload/complete` (API `HEAD`s the object through the `R2_BUCKET` binding) → `PATCH .../batch` saves the `media` item.
- **Choose file.** Click toolbar `Add media` and answer the file chooser. A media block (`textbox "Media caption"`) appears.
- **Upload completes.** `page_items` gets a `type='media'` row with `data->>'objectKey'`, the asset row becomes `attached`, the object exists in the bucket (`r2-objects.py head <key>`), and after reload the `<img>` src is `http://127.0.0.1:3001/media/<objectKey>`.
- **Cancel.** Hold the `PUT` at the network (Playwright route), click `Delete item` on the uploading block, then let the `PUT` fail. The app sends `POST .../items/upload/cancel` (204), the asset row becomes `pending_delete` with `delete_after`, no `page_items` row is added, and no object is written.
- **Scripted.** `RUN_DIR=... GRABBIN_REPO=... R2_CREDS_JSON=<600 json> R2_PY=<python with boto3> node scripts/drive-editor-journeys.mjs "$EVIDENCE_DIR" media-upload,media-cancel` from `$PW_DIR`.
- **Proof.** `actions.md`, `network.txt`, before/after screenshots + ARIA, `img-srcs.txt`, and the DB/bucket lines in `actions.md`.

## Gotchas

- `/demo` keeps media local (`blob:` preview only); it cannot prove upload or cancel.
- `R2_LOCAL_MODE=true` only makes the API serve reads from the local `R2_BUCKET` binding (`/media/*`). Creating an upload always presigns against `R2_S3_CREDENTIALS` (`services/media.service.ts`); if it is missing or invalid, `POST /pages/{handle}/items/upload` returns 500 and the server log shows `Error: R2 upload credentials are invalid.` (seen Oct 13 2026: the box `.env` intentionally has no R2 keys).
- `media-cancel` needs an in-flight upload, so it is blocked whenever `media-upload` is.
- Local `wrangler dev` has no remote R2 binding (no Cloudflare account login), so `upload/complete` would `HEAD` an empty local bucket and fail. The driver bridges this: it routes the browser `PUT`, performs it against the real bucket from Node, then mirrors the same bytes into the local bucket with `wrangler r2 object put --local --persist-to $RUN_DIR/wrangler-state`. Doing the `PUT` from Node also avoids the bucket CORS rule, which allows `http://localhost:3000` but not `http://127.0.0.1:3000`. Report this bridge with the result.
- Cleanup: the app does not delete bucket objects synchronously. A canceled upload is only marked `pending_delete`. After a run, delete test objects with `R2_CREDS_JSON=... python scripts/r2-objects.py ls users/<userId>/` then `rm <key>`; the script refuses keys outside `users/`.
- Verified Oct 14 2026 (PR #1 + `main`): upload PASS, cancel PASS. All test objects were deleted afterwards (bucket prefix count 0).
- Local R2 lives under the wrangler `--persist-to` dir in `$RUN_DIR`; cleanup removes stored files but not evidence.
