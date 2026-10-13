# Page editor

The page editor lets a signed-in owner arrange and update the content on their own page.

## Sub-features

- `editor-open` opens the owner view for the account's primary page.
- `editor-layout` changes the page layout through visible editor controls.
- `editor-save` saves a profile or content change and shows it on a second view.

## How to get to it (user POV)

- Sign in and open the account's primary `/{handle}` page.
- Choose visible page-management controls from the owner view.
- Open the public page after saving to see the change.

## Driving it with Chrome DevTools

Preconditions: a dedicated signed-in test account, its primary page, a running disposable local PostgreSQL database, and any needed local media fixtures. The default repo does not provide these safely.

- **Open the owner view.** Sign in with the dedicated test account and navigate to its `/{handle}`. Confirm the owner controls appear.
- **Change a setting.** Choose a visible editor control from the latest snapshot, make one small reversible change, and save. Confirm a visible saved status or updated value.
- **Confirm persistence.** Reload the page and inspect the changed value. Then open the public view in a separate signed-out browser context and confirm the public result.
- **Proof.** Capture the action and resulting states. Read the saved value through a read-only database view. Restore the fixture after the proof while retaining evidence.

## Gotchas

- A public view does not prove owner editing, and an owner view does not prove public visibility.
- Do not make edits to a personal or shared account to satisfy this journey.
- If the test account, database, or media fixture is missing, report that precondition instead of weakening the journey.
