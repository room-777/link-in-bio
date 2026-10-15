# Interactive demo

The interactive demo lets a visitor explore a sample Grabbin page without an account or saved page data.

## Sub-features

- `demo-open` loads the built-in sample.
- `demo-interact` edits the sample name through its visible textbox.
- `demo-share-path` links visitors toward learning about Grabbin or starting a page.

## How to get to it (user POV)

- Open `/demo` directly.
- Use a visible link on the page to return to the landing page or start creating a page.

## Driving it with Chrome DevTools

Preconditions: the local web app is healthy. No account, database, or seed rows are needed.

- **Open the sample.** Navigate to `http://127.0.0.1:3000/demo`. The heading `Explore an interactive Grabbin page demo` and sample Bento cards appear.
- **Edit the sample.** Fill the `Name` textbox with `Avery Reed Verification`. Take another snapshot and confirm that value is visible. Restore `Avery Reed`, reload the route, and confirm the built-in sample value returns.
- **Follow a page link.** Choose a visible link to learn about Grabbin or create a page. Confirm its destination from the browser URL.
- **Proof.** Save the before and after snapshots, full-page screenshot, URL, action, and visible result. Check that this sample journey did not create account or page data.

## Gotchas

- Demo content comes from built-in sample data, not a user-owned database row.
- The demo edit is in memory only. It does not prove that changes to a saved user page persist.
- Some sample cards may load third-party media or maps. Report blocked external content separately from the app shell.
- The web-only run may show a failed read-only `GET /auth/get-session` because the API server is not running. Record it; it does not block this demo journey.
