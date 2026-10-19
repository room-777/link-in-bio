# Edit a map card

An owner searches for a place, selects a result, adjusts the map view, and opens that location in Google Maps. The selected coordinates, zoom, and caption save on the map item.

## Sub-features

- `map-location-search` searches and selects a Mapbox result.
- `map-zoom` changes zoom with the map controls.
- `map-locate` requests the browser's current location.
- `map-open` opens the saved coordinates in Google Maps.
- `map-caption` changes the visible location caption.
- `map-edit-persist` restores coordinates, zoom, and caption after reload.

## How to get to it (user POV)

- Sign in as `featuremap@example.com` and open `/featuremap-test`.
- Click `Add map` if needed. Hover the map card to reveal `Search location` and `Open map controls`.
- Search for a place, choose a result, then use `Zoom in`, `Zoom out`, or `Use current location` from the map controls.

## Driving it with Playwright

Preconditions:

- Run the `verify-editor` doctor, sign in as `featuremap@example.com`, and open its `featuremap-test` page with the local Pro grant. The Playwright runner sets a test-only Mapbox token and uses fixed style/search responses.
- Grant browser geolocation permission for the local app. The local fixture must contain a map item.
- Record its `id` and `data` before changing it.

- **Select a location.** Hover the map shell and click `button "Search location"`. Fill `combobox "Search location"` with `Seoul` and wait for `listbox "Location results"`. Click the matching `option` and confirm the viewport moves to the result. If the caption was empty, it becomes the selected result name. The test confirms the saved coordinates after reload.
- **Zoom.** Click `button "Open map controls"`, then click `button "Zoom in"` once. Confirm the map scale changes, wait for saving, and reload. Confirm the new zoom remains. Open the controls again and click `Zoom out` to restore the starting zoom if needed.
- **Locate.** Set a known browser geolocation in the Playwright context and grant location permission. Click `Open map controls` and `Use current location`. Confirm the map moves to the seeded coordinates, wait for saving, reload, and confirm the coordinates remain in the map item row.
- **Caption and open map.** Fill `textbox "Media caption"` with a unique caption. Click `link "Open location in Google Maps"` and confirm its URL contains the item's latitude and longitude.
- **Inspect.** Query `select id, data from page_items where id = '<item-id>'`; confirm the selected place's `latitude` and `longitude`, the saved `zoom`, and the caption. Confirm each value still appears after reload.
- **Proof.** Save before and after screenshots, ARIA snapshots, the outbound Google Maps URL, and the read-only item row.

## Gotchas

- Outside the Playwright runner, a real Mapbox token is needed for map tiles and search. The suite uses a test token and mocked responses instead.
- Search needs at least two characters and can show `No locations found.` when the Mapbox response is empty.
- `Use current location` needs geolocation permission. It writes the browser position to the map item after the browser reports it.
- `Open location in Google Maps` is an external link. Verify the URL and prevent the browser test from navigating away if needed.
