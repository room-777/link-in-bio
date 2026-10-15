# Edit and format text cards

An owner changes text, alignment, vertical position, and background color on a text card. The card content and style save with the page item.

## Sub-features

- `text-content-edit` edits the `Text content` field.
- `text-align` sets left, center, or right alignment.
- `text-vertical-align` sets top, center, or bottom alignment.
- `text-background` selects a palette color or enters a hex color.
- `text-format-persist` restores text and style after reload.

## How to get to it (user POV)

- Sign in as `featuremap@example.com` and open `/featuremap-test`.
- Click `Add text` if the page has no text card. Otherwise hover a text card and click `Open text style options`.
- Type in `Text content`. Use the style options for alignment and color.

## Driving it with Playwright

Preconditions:

- Run the `verify-editor` doctor, sign in as `featuremap@example.com`, and open its `featuremap-test` page with the local Pro grant.
- Identify one text card by its `data-bento-item-id`; record its `data` and `style` before editing.

- **Edit content.** Fill `textbox "Text content"` with a unique string. Confirm it appears in the card.
- **Set alignment.** Hover the card and click `button "Open text style options"`. Click `Align text center` and `Align text to the bottom`. Confirm both buttons expose `aria-pressed="true"` and the text moves within the card.
- **Set color.** Click `Toggle text background color options`, choose `radio "Blue"`, then enter `#123abc` in `textbox "Text background hex color"` and press Enter. Confirm the card background changes to the custom color.
- **Reload and inspect.** Wait for the item save, reload, and confirm the text and appearance remain. Query `select id, data, style from page_items where id = '<item-id>'` and confirm the text, `textAlign`, `verticalAlign`, and `backgroundColor` values.
- **Proof.** Save screenshots and ARIA snapshots before and after, plus the read-only item row.

## Gotchas

- Item controls appear on hover or focus. Keep the style popover open while using its controls.
- The hex field commits on Enter or blur. An invalid hex value does not replace the saved color.
- The `halfBanner` preset centers text vertically by default. Set `Align text to the bottom` explicitly when proving a saved bottom alignment.
