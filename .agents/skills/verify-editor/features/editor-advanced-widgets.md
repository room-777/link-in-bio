# Browse and add advanced widgets

An owner can browse the widget catalog, search for a widget, and start its add flow. Pro access gates widget use; some catalog entries are placeholders.

## Sub-features

- `widget-catalog`: lists the current widget choices.
- `widget-search`: filters by displayed name and shows an empty result state.
- `widget-navigation`: opens a widget detail, returns to the catalog, or closes it.
- `widget-mobile-picker`: presents the picker as a mobile drawer.
- `widget-plan-gate`: shows the upgrade dialog to a Free account.
- `widget-coming-soon`: shows placeholders for SoundCloud, Apple Music, and Signature.
- `widget-add-spotify`, `widget-add-rss`: add supported provider items.
- `widget-add-rss`: add an RSS feed widget and store its feed URL.

## How to get to it (user POV)

- Sign in, open your `/{handle}` page, and choose `Advanced` in the editor toolbar.
- Search the catalog or choose a widget. Use a narrow viewport to check the mobile drawer.

## Driving it with Playwright

Preconditions:

- Use the local Pro fixture for add flows. Use a separate local Free account for the upgrade gate.
- Provider previews need the local fixture responses.

- **Catalog and search.** Click `button "Advanced"`; confirm `dialog "Advanced widgets"` shows the catalog. Fill `textbox "Search widgets"` with `spotify`, open `button "Spotify"`, then return with `button "Back to widgets"`. Search a missing name and confirm `No widgets found.`
- **Close and mobile.** Press Escape to close. Repeat at a mobile viewport and confirm the picker opens as a drawer and can be closed.
- **Free gate.** On the Free fixture, choose a widget. Confirm `dialog "Upgrade to Pro"` appears and no item is saved.
- **Add providers.** On Pro, add a supported Spotify URL and RSS feed URL. Confirm each card after reload and check its `page_items` row.
- **Placeholders.** Open SoundCloud, Apple Music, and Signature. Confirm the current placeholder message and no Add action or saved row.
- **Proof.** Capture action/result screenshots and ARIA snapshots, provider request outcomes, and read-only rows for successful adds.

## Gotchas

- A blocked preview or unavailable provider is an environment block, not a successful add.
- Do not change the shared Pro fixture to test the Free gate.
- A placeholder proves only the current visible state, not a working integration.
