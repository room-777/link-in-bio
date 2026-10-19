# Add images to link cards

An owner can add an image to a link card, replace it, or remove it. The selected image is uploaded through the page media flow and saved with the link item.

## Sub-features

- `link-image-add`: attach an image to a link card.
- `link-image-replace`: replace its current image.
- `link-image-remove`: clear its image.
- `link-image-persist`: confirm the image remains after reload.

## How to get to it (user POV)

- Sign in and open your `/{handle}` page.
- Hover or focus a link card's image area and choose `Add link image`, `Replace link image`, or `Remove link image`.

## Driving it with Playwright

Preconditions:

- Use the runner's local media route and isolated Wrangler R2 bucket. Never configure or use production R2 credentials.
- Keep an accepted image fixture and record the link item's original data for cleanup.

- **Add.** Choose `Add link image`, select the fixture, and wait for upload completion. Confirm the image appears and the link item remains after reload.
- **Replace.** Choose `Replace link image` and select a second fixture. Confirm the new image appears after reload.
- **Remove.** Choose `Remove link image`. Confirm the image is gone after reload and the link item's image field is cleared.
- **Check storage.** Confirm the link item in `page_items` references the new image after add/replace and no longer references it after removal. Check local media requests; no request may reach Cloudflare R2.
- **Proof.** Capture each action/result, screenshots, ARIA snapshots, network outcomes, and read-only item rows.

## Gotchas

- `/demo` uses a local blob preview and cannot prove upload or persistence.
- Stop if the upload target is not `127.0.0.1`. Never use the production bucket.
