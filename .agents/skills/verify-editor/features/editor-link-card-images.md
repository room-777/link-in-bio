# Edit a link card image

An owner adds a custom image to a link card, replaces it, or removes it. The image choice persists with the link item.

## Sub-features

- `link-image-add` uploads a local image to a link card.
- `link-image-replace` changes the card's custom image.
- `link-image-remove` removes the custom image and returns to the metadata image when one exists.
- `link-image-persist` restores the custom image after reload.

## How to get to it (user POV)

- Sign in as `featuremap@example.com` and open `/featuremap-test`.
- Add a link card if needed. Hover or focus its image area to show `Add link image`, `Replace link image`, and `Remove link image`.

## Driving it with Playwright

Preconditions:

- Run the `verify-editor` doctor, sign in as `featuremap@example.com`, and open its `featuremap-test` page. Pro access is not required for link-card images. Use the local stack with its local R2 binding.
- Keep two valid image fixtures smaller than the upload limit, one for the first image and one for replacement.
- Record the link item `id`, `data.imageKey`, and `data.imageUrl` before editing.

- **Add.** Focus the link card image area and click `button "Add link image"`. Choose the first fixture. Wait for upload to finish, then confirm the chosen image appears on the card.
- **Replace.** Click `button "Replace link image"` and choose the second fixture. Confirm the card displays the second image.
- **Reload and inspect.** Wait for saving, reload, and confirm the replacement remains. Read `select id, data from page_items where id = '<item-id>'`; confirm the `imageKey` changed and resolves to the displayed image.
- **Remove.** Click `button "Remove link image"`, wait for saving, and reload. Confirm the custom image is gone. If link metadata provides an image, confirm the card falls back to that image; otherwise confirm its empty image treatment. The saved `imageKey` is null.
- **Proof.** Save screenshots, ARIA snapshots, upload completion evidence, and the read-only item row before and after.

## Gotchas

- The image controls appear when the card image area is hovered or focused. Do not query them before focusing the correct link card.
- Uploads require the local R2 binding described in `editor-media-upload.md`. Do not use production R2 credentials.
- A link card may have several provider images. Removing the custom image can reveal the provider image instead of a blank card.
- Keep the link URL and metadata fixed during this journey so the test isolates the image change.
