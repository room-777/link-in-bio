# Edit the page profile and handle

An owner changes the page name and bio, uploads or crops a profile image, and changes the page handle. Profile changes save to the page; a handle change updates its URL.

## Sub-features

- `profile-name-bio`: edit the name and bio.
- `profile-image-upload`, `profile-image-crop`, `profile-image-remove`: manage the profile image and crop.
- `profile-image-crop`: crop the profile image.
- `profile-image-remove`: remove the profile image.
- `profile-image-remove-persist`: the removed profile image stays removed after reload.
- `page-handle-change`: select an available handle and open the updated page URL.
- `profile-persist`: confirm saved profile details after reload.

## How to get to it (user POV)

- Sign in and open your `/{handle}` page. Edit `Name` or `Bio` inline.
- Focus the profile image for image controls. Choose `Open page options` then `Change handle` to edit the URL.

## Driving it with Playwright

Preconditions:

- Use the local Pro owner page and image fixture smaller than 5 MB. The runner stores uploads in its isolated Wrangler R2 bucket.
- Record original profile values and handle. Use a unique available temporary handle and restore all values after proof.

- **Name and bio.** Fill `textbox "Name"` and `textbox "Bio"`, wait for save, reload, and confirm both values. Read the matching `pages` row.
- **Image.** Choose `button "Change profile image"`, select the fixture, then use `Crop profile image` and `Apply profile image crop`. Reload and confirm the image and crop. Remove it and confirm the fallback image and cleared fields.
- **Handle.** Choose `button "Open page options"` then `Change handle`. Enter a valid available handle and submit. Confirm the browser opens that handle and it still resolves after reload.
- **Proof.** Capture action/result screenshots and ARIA snapshots and read-only page rows before and after.

## Gotchas

- Image controls appear on hover or focus; handle availability may take time.
- Reserved, invalid, or taken handles are correctly rejected.
- The profile form autosaves; wait for the save request before reloading.
- Changes affect the page identity. Restore the original profile and handle before cleanup.
