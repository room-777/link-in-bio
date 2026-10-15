# Edit the page profile and handle

An owner edits the name and bio inline, changes the profile image, and changes the page handle from page options. Profile fields save automatically. The handle change updates the page URL.

## Sub-features

- `profile-name-bio` edits `Name` and `Bio`, then saves them to `pages`.
- `profile-image-upload` uploads an image smaller than 5 MB.
- `profile-image-crop` changes the saved crop for the profile image.
- `profile-image-remove` clears the image and its crop.
- `page-handle-change` checks and saves a new available handle.

## How to get to it (user POV)

- Sign in as `featuremap@example.com` and open `/featuremap-test`.
- Edit the profile name or bio directly in the profile area.
- Hover or focus the profile image to reveal `Crop profile image` and `Remove profile image`. Click `Change profile image` to choose a file.
- Click `Open page options`, then `Change handle`.

## Driving it with Playwright

Preconditions:

- Run the `verify-editor` doctor and use its local `featuremap@example.com` account, `featuremap-test` page, and Pro grant.
- Use an image fixture accepted by `pageImageUploadSchema`, smaller than 5 MB. Keep a copy of its original so the crop and remove steps can be repeated.

- **Name and bio.** Fill `textbox "Name"` and `textbox "Bio"` with unique values. Wait at least 1.5 seconds for autosave and confirm the save request finishes. Reload `/featuremap-test`, then confirm both values remain. Read the `pages` row with `select handle, name, bio, image_key, image_crop from pages where handle = 'featuremap-test'`.
- **Image upload and crop.** Click `button "Change profile image"`, choose the fixture, and wait for the uploaded image to replace the preview. Click `button "Crop profile image"`, drag the image to a visibly different crop, and click `button "Apply profile image crop"`. Reload and confirm the image and crop remain. The `pages` query must show a non-null `image_key` and `image_crop`.
- **Image removal.** Click `button "Remove profile image"`, wait for autosave, and reload. The fallback image appears, and `image_key` and `image_crop` are null in the `pages` row.
- **Handle change.** Click `button "Open page options"` and the `Change handle` option. Fill `textbox "Handle"` with a unique valid handle, wait until availability reports it is available, and click `button "Change handle"`. The browser moves to the new `/{handle}` URL. Reload it and confirm the same page loads. Read `select id, handle from pages where handle = '<new-handle>'` and confirm the handle changed.
- **Restore the fixture URL.** Use `Change handle` again to return to `featuremap-test`. Reload `/featuremap-test` and confirm it resolves. The shared feature-map journeys use this fixed handle.
- **Proof.** Save screenshots and ARIA snapshots before and after each action, plus the page row before and after. Never use a direct API call to make the change.

## Gotchas

- The profile form saves after `PAGE_AUTO_SAVE_DELAY`; wait for the save request to finish before reloading.
- `Crop profile image` and `Remove profile image` appear on hover or keyboard focus. Focus the image group before querying these buttons.
- Handle policy rejects reserved, taken, or invalid names. Use an available name, and do not treat a rejected handle as a save failure.
- A profile image upload or handle change against a database other than the disposable local fixture changes that account's page. Keep the journey on the local stack.
