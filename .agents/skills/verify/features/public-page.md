# Public creator page

A public creator page shows a person's name, profile, and arranged content at their Grabbin handle or custom domain.

## Sub-features

- `public-handle` opens a page at `/{handle}`.
- `public-domain` opens the mapped page at the custom hostname root.
- `public-missing` shows the not-found state for an unknown handle.

## How to get to it (user POV)

- Open a shared `https://grabbin.me/{handle}` link.
- Open a creator's custom domain at `/`.
- Follow a shared link for a handle that no longer exists.

## Driving it with Chrome DevTools

Preconditions: create the shared local `featuremap-test` page using `verify-editor/scripts/drive-create-page.mjs`. Public page checks use that stored row, never `/demo`. Custom-domain checks still require a deliberately seeded local domain-to-handle row and a local hostname mapping.

- **Open a known handle.** Navigate to `http://127.0.0.1:3000/{handle}` using a handle from the disposable fixture. The creator's public page and saved content appear without an owner edit state.
- **Open its custom domain.** Use the exact local hostname mapped in the fixture. The same creator page appears at `/`.
- **Open a missing handle.** Navigate to a deliberately unknown handle. The app shows its not-found page.
- **Proof.** Save snapshots and screenshots for the loaded and not-found states. Verify the expected page data from a read-only database view. If the fixture is absent, report the journey as blocked; do not substitute the demo page.

## Gotchas

- A missing profile fixture makes the public-page journey unavailable; it does not make the profile route pass.
- Custom-domain routing depends on the request hostname and database mapping. A `localhost` response does not prove the custom-domain path.
- The `/demo` sample is not evidence for a stored public profile.
