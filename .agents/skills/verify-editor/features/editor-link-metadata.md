# Add links and refresh link details

An owner creates a link card from a URL and can ask Grabbin to refresh the card's title, description, and image details.

## Sub-features

- `link-add`: add a link using its destination URL.
- `link-metadata`: show fetched metadata on the card.
- `link-metadata-refresh`: refresh details for an existing card.
- `link-persist`: retain destination and metadata after reload.

## How to get to it (user POV)

- Sign in, open your `/{handle}` page, and choose `Add link` in the editor toolbar.
- On a link card, choose `Refresh link metadata` from its controls.

## Driving it with Playwright

Preconditions:

- Use the local owner page and a stable public HTTPS page under your control or a known test page.
- Record the original link data and avoid URLs that expose private or production-only content.

- **Add link.** Click `button "Add link"`, enter a URL in `textbox "Link URL"`, and confirm a link card appears with the expected destination.
- **Refresh.** Hover the card, click `button "Refresh link metadata"`, wait for the request, and confirm updated title/image details or a clear error state.
- **Persist.** Wait for autosave, reload in a new context, and confirm the destination and fetched metadata remain. Read the corresponding `page_items` row.
- **Proof.** Capture the entered URL, action, request result, card before/after, ARIA snapshots, and read-only row.

## Gotchas

- Metadata depends on the target website and outbound network access. A failed fetch is not proof of refresh success.
- Some sites block automated fetches or expose no usable metadata. Record the actual result.
- `/demo` cannot prove the saved row.
