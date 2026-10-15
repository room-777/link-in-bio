# Change the editor layout

An owner changes the compact or wide page layout, moves cards, and picks a size preset. Each breakpoint has its own layout and the editor saves layout changes to `page_items`.

## Sub-features

- `layout-compact` selects the compact layout.
- `layout-wide` selects the wide layout.
- `layout-drag` moves a card within the active layout.
- `layout-preset` applies a supported card size preset.
- `layout-persist` restores both breakpoint layouts after reload.

## How to get to it (user POV)

- Sign in as `featuremap@example.com` and open `/featuremap-test` in a desktop-sized viewport.
- Use `Edit compact layout` or `Edit wide layout` in the `Page editor toolbar`.
- Hover a card to show its controls. Drag a card to move it. Select a size button such as `Wide` or `Full square` to change its size.

## Driving it with Playwright

Preconditions:

- Run the `verify-editor` doctor, sign in as `featuremap@example.com`, and open its `featuremap-test` page with the local Pro grant.
- Use a desktop viewport wide enough to show both breakpoint buttons. Start from the saved `page_items.layouts` values and record them.

- **Switch breakpoints.** Click `button "Edit compact layout"`, then `button "Edit wide layout"`. Confirm the selected tab changes and the card arrangement can differ between layouts.
- **Move a card.** Record the `data-bento-item-id` and bounding box of a text card. Use Playwright pointer input to drag its center to an open grid cell. Confirm its box moves and the other card remains in place.
- **Change its size.** Hover the same shell, then click one available preset button by accessible name, for example `button "Full square"`. Confirm its `data-bento-item-preset` value and visible size change.
- **Reload and inspect.** Wait for the batch save to complete, reload the page, and confirm the moved card and chosen preset remain. Query `select id, type, layouts from page_items where page_id = (select id from pages where handle = 'featuremap-test') order by created_at, id`. Compare the edited `wide` or `compact` layout with the recorded values.
- **Proof.** Save before and after screenshots, ARIA snapshots, the card IDs and bounds, and the read-only `page_items` query.

## Gotchas

- The breakpoint controls are hidden at compact browser widths. Use a desktop viewport to test both controls.
- Preset buttons and delete controls appear on hover or focus. Hover the card shell before querying them.
- Grid constraints can shift nearby cards when a card moves or grows. Verify the target card and the full grid after reload, not only its transient drag preview.
- `page_items.layouts` stores `compact` and `wide` separately. A change in one breakpoint does not prove the other breakpoint saved.
