# Upload media and cancel an upload

An owner adds an image to a media card, and can cancel while its upload is still pending. Upload proof requires the isolated local object store.

## Sub-features

- `media-add`: choose an image and show its local preview.
- `media-upload`: upload the bytes and attach the object to a saved media item.
- `media-upload-persist`: the uploaded media remains after reload.
- `media-cancel`: abort a pending upload and leave no item or stored object.

## How to get to it (user POV)

- Sign in, open your `/{handle}` page, and choose `Add media` in the editor toolbar.
- Choose an image file. To test cancel, delete the item while the upload is pending.

## Driving it with Playwright

Preconditions:

- Use the local fake upload URL and isolated Wrangler R2 bucket. Choose a disposable image fixture.
- Never use production R2 credentials or a real production bucket.

- **Upload.** Choose `button "Add media"`, select the image, and wait for completion. Confirm a media card appears and survives reload. Check its `page_items` row and local `/media/<key>` response.
- **Cancel.** Hold the local upload with a browser route, delete the pending item, and release the request. Confirm the cancel request succeeds, no item row remains, and the local media URL returns not found.
- **Boundary.** Record network requests and confirm none went to `*.r2.cloudflarestorage.com`.
- **Proof.** Capture actions, before/after screenshots and ARIA snapshots, network outcomes, and read-only asset/item rows.

## Gotchas

- `/demo` uses a browser-only blob preview; it cannot prove upload or cancel.
- The runner's local media route accepts uploads only when `R2_LOCAL_MODE=true` and only for its named local bucket.
- Stop immediately if the upload URL is not on `127.0.0.1`.
