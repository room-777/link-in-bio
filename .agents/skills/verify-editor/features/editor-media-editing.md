# Edit media cards

An owner edits a media card caption and crop. The change should remain visible after the item saves and the page reloads.

## Sub-features

- `media-caption`: add or change the caption.
- `media-crop`: change the visible crop.
- `media-edit-persist`: restore caption and crop after reload.

## How to get to it (user POV)

- Sign in and open your `/{handle}` page with an uploaded media item.
- Edit the `Media caption` field or open the image crop controls on that item.

## Driving it with Playwright

Preconditions:

- Use the local owner page with a completed local media upload.
- Record the item's caption and crop before changing them; keep the original asset.

- **Caption.** Fill `textbox "Media caption"` with a unique caption. Confirm it appears on the card.
- **Crop.** Open the media crop control, move the image to a visibly different position, and apply the crop. Confirm the visible crop changes.
- **Persist.** Wait for autosave, reload in a new context, and confirm caption and crop remain. Read the `page_items` row for the item.
- **Proof.** Capture before/after screenshots and ARIA snapshots, the applied caption/crop, and read-only row.

## Gotchas

- A local blob preview from `/demo` does not prove an uploaded media item.
- Crop controls may only appear on hover or focus.
- Restore the original caption and crop after proof.
