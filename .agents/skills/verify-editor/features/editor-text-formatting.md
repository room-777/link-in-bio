# Edit and format text cards

An owner edits text content, alignment, and background color. The item should keep its content and style after reload.

## Sub-features

- `text-content-edit`: change the text content.
- `text-align`: set left, center, or right alignment.
- `text-vertical-align`: set top, center, or bottom alignment.
- `text-background`: choose a palette or custom hex color.
- `text-format-persist`: restore content and style after reload.

## How to get to it (user POV)

- Sign in and open your `/{handle}` page. Add a text card if none exists.
- Use the card's `Open text style options` control to change alignment and background.

## Driving it with Playwright

Preconditions:

- Use the local owner page. Record the target item's content and style for cleanup.

- **Content.** Fill `textbox "Text content"` with a unique value and confirm it appears on the card.
- **Alignment.** Open `button "Open text style options"`; choose `Align text center` and `Align text to the bottom`. Confirm both controls are pressed and the card reflects them.
- **Color.** Open `Toggle text background color options`, choose `radio "Blue"`, then enter `#123abc` in `textbox "Text background hex color"` and press Enter. Confirm the background changes.
- **Persist.** Wait for save, reload, and confirm content/style. Read the matching `page_items.data` and `style` values.
- **Proof.** Capture before/after screenshots and ARIA snapshots plus the read-only row.

## Gotchas

- Card controls appear on hover or focus; keep the style popover open while using its controls.
- The hex value commits on Enter or blur. Invalid colors must not replace the saved value.
- Restore the original content and style after proof.
