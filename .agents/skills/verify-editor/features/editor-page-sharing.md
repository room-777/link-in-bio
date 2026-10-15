# Share the page

An owner opens the share dialog, scans the page QR code, or copies the page URL. The copy button reports whether the link copied.

## Sub-features

- `share-open` opens the share dialog from the owner controls.
- `share-qr` renders a QR code for the current page URL.
- `share-copy` copies that URL and changes the button text to `Copied Link`.
- `share-mobile` opens the same dialog from the mobile share button.

## How to get to it (user POV)

- On a wide owner page, click `button "Share page"` in the owner footer.
- On a compact viewport, click `Share link`.

## Driving it with Playwright

Preconditions:

- Run the `verify-editor` doctor, sign in as `featuremap@example.com`, and open `/featuremap-test` with the local Pro grant.
- Grant clipboard read and write permissions to the local browser context.

- **Open the dialog.** On desktop, click `button "Share page"`. On mobile, click `button "Share link"`. Confirm `dialog "Share your page"` opens.
- **Check the QR code.** Confirm `img "QR code for your page"` is visible and the QR value corresponds to the current page URL.
- **Copy the URL.** Click `button "Copy Link"`, confirm it changes to `Copied Link`, and read the browser clipboard. The clipboard URL must equal the current page URL.
- **Proof.** Save screenshots and ARIA snapshots of the dialog, plus the current page URL and clipboard value. This flow has no database write.

## Gotchas

- The mobile share button is hidden in a wide viewport. Use a compact viewport for the mobile path.
- Copy requires browser clipboard permission and a secure browser context. Report permission denial as an environment block.
- The QR encodes `window.location.href`. Open the owner page directly so the code does not include an unrelated route.
