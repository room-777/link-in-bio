# Add and remove page items

An owner adds text, section, link, or map items from the editor toolbar, edits their content, and removes them. `/demo` supports interaction only; an owner page also saves changes.

## Sub-features

- `add-text`: creates a `Text content` item.
- `add-section`: creates and saves a section after its `Section title` is filled.
- `add-link`: creates a link card from a URL.
- `add-map`: creates a map item.
- `delete-item`: removes an item using its hover controls.
- `item-persist`: the owner's change remains after reload.
- `section-persist`: the saved section title remains after reload.
- `link-persist`: the link card and its URL remain after reload.
- `map-persist`: the map item remains after reload.

## How to get to it (user POV)

- Open `/demo` to try the editor without an account.
- For saved items, sign in and open your `/{handle}` page. Use the `Page editor toolbar` at the bottom.

## Driving it with Playwright

Preconditions:

- For persistence, use the local `featuremap@example.com` account and `featuremap-test` page on the full local stack.
- Start with a recorded item count and restore every change after capturing proof.

- **Add text.** Click `button "Add text"`, fill the focused `textbox "Text content"`, wait for autosave, then reload in a new context. The item and matching `page_items` row remain.
- **Add section.** Click `button "Add section"`, fill `textbox "Section title"`, wait for autosave, reload, and confirm its heading and row remain.
- **Add link or map.** Use `button "Add link"` or `button "Add map"`. Confirm the card appears; for an owner, confirm the corresponding `page_items` row after reload.
- **Delete.** Hover the target item, click its `button "Delete item"`, then reload. The item and row are gone.
- **Proof.** Capture before and after ARIA snapshots and screenshots, `actions.md`, and read-only database rows for owner persistence.

## Gotchas

- `/demo` intentionally makes no API calls. It cannot prove saved items or Pro access.
- An empty section is not saved; enter a title first.
- Delete controls appear on hover or focus. Do not force-click a hidden button.
- Link previews and map tiles need their external services and local configuration.
