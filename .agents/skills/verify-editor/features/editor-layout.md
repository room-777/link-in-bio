# Change the page layout

An owner changes compact and wide layouts, moves cards, and selects a size preset. Layout changes save with the page items.

## Sub-features

- `layout-compact` and `layout-wide`: edit each breakpoint layout.
- `layout-drag`: move an item within the active layout.
- `layout-preset`: choose a supported item size.
- `layout-persist`: restore both layouts after reload.

## How to get to it (user POV)

- Sign in, open your `/{handle}` page at desktop width, and choose `Edit compact layout` or `Edit wide layout` in the toolbar.
- Hover or focus an item to reveal size presets, then drag the item to a different grid cell.

## Driving it with Playwright

Preconditions:

- Use the local Pro owner page and a desktop viewport wide enough to show both layout controls.
- Save the original `page_items.layouts` and item preset values for cleanup.

- **Switch layout.** Click `button "Edit compact layout"`, then `button "Edit wide layout"`. Confirm the selected layout changes.
- **Move item.** Record the target item's `data-bento-item-id` and bounds. Use pointer input to drag it to an open grid cell; confirm its bounds change.
- **Choose size.** Hover the item and select a visible preset such as `button "Full square"`. Confirm the item size changes.
- **Persist.** Wait for save, reload, and confirm the moved position and preset. Compare the page's `page_items.layouts` with the recorded values.
- **Proof.** Capture before/after screenshots and ARIA snapshots, item ID and bounds, and read-only database values.

## Gotchas

- Breakpoint controls are hidden at narrow widths.
- Preset and delete buttons appear on hover or focus.
- Restore the original layouts and presets; layout edits affect the whole page.
