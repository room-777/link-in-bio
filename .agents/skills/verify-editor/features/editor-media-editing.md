# Edit a media card

An owner edits a media caption, crop, and destination link after upload. The editor saves these values on the media item.

## Sub-features

- `media-caption-edit` changes the visible caption and image alt text.
- `media-crop-edit` changes the image crop for the active breakpoint.
- `media-destination-link` adds, changes, or clears the link opened from the media card.
- `media-edit-persist` restores each change after reload.

## How to get to it (user POV)

- Sign in as `featuremap@example.com` and open `/featuremap-test`.
- Use `Add media` to upload an image if the page has no media card.
- Edit the `Caption` field on the card. Hover the card to show `Crop media` and `Add media link` or `Edit media link`.

## Driving it with Playwright

Preconditions:

- Run the `verify-editor` doctor, sign in as `featuremap@example.com`, and open its `featuremap-test` page with the local Pro grant. Use the local stack with its local R2 binding, as described in the media-upload feature map.
- Use a valid local image and record the media item's `id` and `data` before editing.

- **Caption.** Fill `textbox "Media caption"` with a unique value. Confirm it appears below the media and as the image's alt text.
- **Crop.** Hover the media shell and click `button "Crop media"`. Drag the image to a visibly different crop, then click `button "Apply media crop"`. Confirm the crop changes in the card.
- **Destination URL.** Click `button "Add media link"`, fill `textbox "Link URL"` with `https://example.com/featuremap-media`, and press Enter or move focus away. Confirm the control becomes `Edit media link` and the card has an `Open media` link to that URL.
- **Reload and inspect.** Wait for the item save, reload, and confirm caption, crop, and destination link remain. Query `select id, data from page_items where id = '<item-id>'`; confirm `caption`, `crop`, and `link` values.
- **Clear the destination.** Click `Edit media link`, clear `Link URL`, and commit by moving focus away. Reload and confirm `link` is absent and `Open media` is gone.
- **Proof.** Save screenshots, ARIA snapshots, and the read-only item row before and after.

## Gotchas

- Media crop controls appear only after upload completes and the media has a URL.
- Crop state is stored by breakpoint. Check the active compact or wide layout and the matching crop entry.
- Use an HTTPS destination. An invalid URL leaves the input marked invalid and does not save.
- Media upload requires the local R2 binding. A `/demo` blob preview does not prove saved media editing.
