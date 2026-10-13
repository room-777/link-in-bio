# Add an item

An owner adds a block (text, section, link, map) from the editor toolbar, edits it, and can delete it again. The same Bento editor store backs `/demo` (no saving) and the owner view of `/{handle}` (auto-saves to `page_items`).

## Sub-features

- `add-text` adds a `Text content` block.
- `add-section` adds a `Section title` block.
- `add-link` opens the `Link URL` field and adds a link card for the URL.
- `add-map` adds a map block (`region "Map"`).
- `delete-item` removes a block with `Delete item`.
- `item-persist` (owner only) saves the change and shows it after reload.

## How to get to it (user POV)

- `/demo` (no account): the toolbar is `group "Page editor toolbar"` at the bottom.
- Owner view: sign in, open your `/{handle}`; the same toolbar appears.

## Driving it with Playwright

Preconditions:

- `doctor.sh` OK. For `item-persist`: signed-in `dev@example.com` with a primary page (currently blocked, see sign-in Gotchas).

- **Count before.** Count `textbox "Text content"` (demo seed has 2).
- **Add.** Click toolbar `button "Add text"`. One more `Text content` textbox exists; fill it with `Verification note`.
- **Delete.** Click `button "Delete item"` of that block. The count returns to the original.
- **Persist (owner).** After adding, wait ≥2 s (auto-save), reload in a new context, confirm the block, and read `select type, data from page_items where page_id = ... order by created_at desc limit 1`.
- **Scripted (demo).** `node scripts/drive-demo-add-text.mjs "$EVIDENCE_DIR/editor-add-item"` from `$PW_DIR`.
- **Proof.** `before.png/.aria.txt`, `after-add.png/.aria.txt`, `after-delete.png`, `actions.md`; for owner runs also the DB row.

## Gotchas

- `/demo` never calls the API; it proves `add-text`/`delete-item` interaction only, not `item-persist`.
- `Add text` and `Add section` focus the new block; typing right after the click goes into it.
- `Add link` and `Add map` need network for previews (link metadata, Mapbox). Without `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` the map renders without tiles.
