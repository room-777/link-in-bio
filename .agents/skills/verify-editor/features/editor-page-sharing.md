# Share the page

An owner can open the share dialog, see its QR graphic, and copy the public page URL.

## Sub-features

- `share-open`: open the share dialog from desktop or mobile controls.
- `share-copy`: copy the page URL and show success feedback.
- `share-mobile`: reach the same dialog from a compact viewport.

## How to get to it (user POV)

- On a wide owner page, choose `Share page` in the owner controls.
- On a compact viewport, choose `Share link`.

## Driving it with Playwright

Preconditions:

- Sign in to the local `featuremap-test` owner page.
- Grant clipboard read/write permission for the local browser context.

- **Open.** Click `button "Share page"` on desktop or `button "Share link"` on mobile. Confirm `dialog "Share your page"` appears.
- **QR.** Confirm the graphic `QR code for your page` is visible. Do not inspect or decode its address content.
- **Copy.** Click `button "Copy Link"`. Confirm it changes to `Copied Link` and clipboard content equals the page URL.
- **Proof.** Capture the action and dialog result with screenshots and ARIA snapshots, plus the clipboard value. No database write is expected.

## Gotchas

- The mobile control is hidden at desktop width; set a compact viewport for that path.
- Clipboard access can be blocked by browser permissions. Record that as an environment block.
