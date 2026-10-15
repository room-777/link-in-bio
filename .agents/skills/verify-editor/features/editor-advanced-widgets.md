# Browse and add advanced widgets

An owner browses the advanced widget catalog, searches for a widget, and opens its add flow. The catalog changes to a drawer on mobile and shows a Pro upgrade prompt to Free accounts.

## Sub-features

- `widget-catalog` lists the configured advanced widgets.
- `widget-search` filters by the widget's displayed name and reports no matches.
- `widget-detail-navigation` opens a widget, returns to the catalog, and closes the picker.
- `widget-mobile-picker` displays the same flow in a mobile drawer.
- `widget-plan-gate` opens the upgrade dialog for a Free account.
- `widget-coming-soon` shows the current placeholder for SoundCloud, Apple Music, and Signature.
- `widget-add-spotify` previews and adds a Spotify item.
- `widget-add-rss` adds a supported RSS feed.
- `widget-add-calendly` connects Calendly, selects an event, and adds it.

## How to get to it (user POV)

- Sign in as `featuremap@example.com`, open `/featuremap-test`, and click `Advanced`.
- Search by a displayed name such as `Spotify`. Select a result to open its details.
- On mobile, the picker is a drawer. On a Free page, selecting a widget opens `Upgrade to Pro`.

## Driving it with Playwright

Preconditions:

- Run the `verify-editor` doctor and use the local `featuremap@example.com` page with its Pro grant.
- For the Free plan gate, use a separate local Free account. Do not alter the shared Pro fixture to simulate Free.
- Spotify and RSS add flows need their provider preview requests to succeed. Calendly add needs an authorized Calendly connection and at least one event.

- **Catalog and search.** Click `button "Advanced"` and confirm `dialog "Advanced widgets"` includes `Tweet`, `Spotify`, `RSS Feed`, and `Calendly`. Fill `textbox "Search widgets"` with `spotify`, select `button "Spotify"`, and confirm the detail view. Search for an unmatched string and confirm `No widgets found.`
- **Back and close.** Click `button "Back to widgets"` and confirm the catalog returns. Click `button "Spotify"` again, press Escape, and confirm the dialog closes. Repeat on a mobile viewport and confirm the picker is exposed as a drawer with the `Advanced widgets` name, and that Back and Escape return or close it.
- **Free plan gate.** On the separate local Free account, click `Advanced`, select a widget, and confirm `dialog "Upgrade to Pro"`. Confirm no widget row was added.
- **Spotify.** On the Pro fixture, open Spotify, fill `textbox "Spotify URL"` with a supported public track or album URL, wait for its preview, and click `Add`. Confirm the card appears and survives reload. Read its `page_items` row and confirm `type = 'spotify'` and its provider data.
- **RSS.** Open `RSS Feed`, fill `textbox "RSS feed URL"` with a supported feed URL, and click `Add`. Confirm the feed card appears and survives reload. Read its `page_items` row and confirm `type = 'rss'` and its feed URL.
- **Calendly.** Open `Calendly`. If disconnected, click `Connect to Calendly` and complete the real OAuth flow. Select an event under `Select your event`, click `Add`, and confirm the calendar card remains after reload. Read the row and confirm `type = 'calendly'` and the selected event data.
- **Coming Soon.** Open `SoundCloud`, `Apple Music`, and `Signature`. Confirm each detail view shows `Sipping coffee while crafting a polished widget...`; do not expect an add control or a saved row.
- **Proof.** Save screenshots, ARIA snapshots, network results for provider previews, and read-only `page_items` rows for successful adds. Keep Free, Pro, and third-party authentication evidence separate.

## Gotchas

- The catalog button is disabled while session state is pending or unavailable. Run the doctor before treating that as a picker failure.
- `No widgets found.` reflects the current client-side label filter. Clear `Search widgets` before opening an item.
- The shared feature map account has Pro. The Free plan gate needs a separate local Free account; do not change the shared fixture's subscription.
- Spotify, RSS, and Calendly depend on external services. A blocked preview, unsupported feed, or missing Calendly connection is not a successful add.
- Calendly's OAuth cannot be proven without an authorized external account. Mark that journey blocked if no test connection is available.
- SoundCloud, Apple Music, and Signature use the same placeholder activity today. Record that visible state only; do not claim they are implemented.
