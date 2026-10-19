# Add and edit a map

An owner adds a map card and searches for a place.

## Sub-features

- `map-add`: create a map item.
- `map-search`: find a location by name.

## How to get to it (user POV)

- Sign in, open your `/{handle}` page, and choose `Add map` in the editor toolbar.
- Use the map search field on the card.

## Driving it with Playwright

Preconditions:

- Use the local owner page. The runner supplies a fake Mapbox search result and a plain local map style through Playwright, without calling Mapbox.
- Record the page item count and restore the map after proof.

- **Add.** Click `button "Add map"` and confirm a map region appears.
- **Search.** Enter a known place in the map search field and choose the matching result. Confirm the map centers on the selected place.
- **Proof.** Capture screenshots, ARIA snapshots, search result, and the changed map `page_items` row.

## Gotchas

- Search results use a local fixture; this does not prove live Mapbox data or map tiles.
- A map shell alone proves add interaction, not a successful place search.
- `/demo` does not prove persistence.
