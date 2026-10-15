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

- Signed-in owner with a page. Start the shared full stack with `scripts/cloud-agent-start.sh` (`alchemy dev`). No R2 keys go in `.env`.
- Under `alchemy dev` the server's `R2_S3_CREDENTIALS` is alchemy's dev-only `r2_s3_credentials` binding. It points at the worker's own local S3 endpoint `{server url}/cdn-cgi/local/r2/s3` with fixed local credentials, and `R2_LOCAL_MODE=true` / `R2_PUBLIC_URL={server url}` are set by `packages/infra/alchemy.run.ts`. Uploads land in the local bucket; nothing reaches Cloudflare.

- **Flow.** `POST /pages/{handle}/items/upload` (presigned URL, asset row `pending`) → browser `PUT {server}/cdn-cgi/local/r2/s3/<dev bucket>/<key>` → `POST .../items/upload/complete` (API `HEAD`s via `R2_BUCKET`) → `PATCH .../batch` saves the `media` item.
- **Choose file.** Click toolbar `Add media` and answer the file chooser. A media block (`textbox "Media caption"`) appears.
- **Upload completes.** `page_items` gets a `type='media'` row with `data->>'objectKey'` and the asset row becomes `attached`. `GET {server}/media/<key>` returns the bytes, and after reload the `<img>` src is `{server}/media/<key>`.
- **Cancel.** Hold the local `PUT` with a Playwright route, click `Delete item` on the uploading block, then abort the `PUT`. The app sends `POST .../items/upload/cancel` (204), the asset becomes `pending_delete`, no item is added, and `GET {server}/media/<key>` is 404.
- **No cloud.** No request may go to `*.r2.cloudflarestorage.com`; the driver fails the journey if one does.
- **Scripted.** `RUN_DIR=<scratch> [WEB_URL=http://localhost:3000 SERVER_URL=http://localhost:3001] node scripts/drive-editor-journeys.mjs "$EVIDENCE_DIR" media-upload,media-cancel` from `$PW_DIR`.
- **Proof.** `actions.md`, `network.txt`, before/after screenshots + ARIA, `img-srcs.txt`.

## Gotchas

- `/demo` keeps media local (`blob:` preview only); it cannot prove upload or cancel.
- Never put real R2 keys in `apps/server/.env`. The only bucket in `alchemy.run.ts` (`grabbin`) is the production bucket. Plain `wrangler dev` with real S3 credentials uploads to production. That happened once on Oct 14 2026; the test objects were deleted.
- `scripts/start-local.sh` (plain `wrangler dev`, no Cloudflare login) has no local S3 endpoint, so upload/cancel are **blocked** there (`POST .../items/upload` 500 "R2 upload credentials are invalid"). Use the shared `scripts/cloud-agent-start.sh` environment.
- `network.txt` may log the routed local `PUT` as `FAILED net::ERR_ABORTED` even when it succeeded. Trust `upload/complete` 200 and the `/media/<key>` check.
- Verified Oct 14 2026 (PR #1 + `main`, `alchemy dev`): upload PASS, cancel PASS, no cloud R2 requests.
