# Sign-in and page creation

Sign-in lets a visitor use an email code or an enabled social provider; a signed-in visitor without a page can choose a handle and create one.

## Sub-features

- `sign-in-open` shows the signed-out form.
- `sign-in-email` requests and verifies an email code.
- `sign-in-social` starts an enabled social-provider flow.
- `create-page` saves a new page and handle for a signed-in account without a primary page.

## How to get to it (user POV)

- Open `/sign-in` or choose a page-creation link on the landing page.
- Complete a configured email-code or social sign-in flow.
- Open `/create` while signed in and without a primary page.

## Driving it with Chrome DevTools

Preconditions: rendering `/sign-in` needs no account. Completing sign-in needs working email or OAuth settings and can contact external services. Creating a page needs a dedicated test account with no primary page and a disposable local PostgreSQL database. These account and database fixtures are not available in the default repo setup.

- **Open the sign-in screen.** Navigate to `http://127.0.0.1:3000/sign-in`. The latest accessibility snapshot shows the email-code form and any enabled provider buttons.
- **Check email entry without sending.** Fill the email textbox with a reserved example address such as `verify@example.invalid`; confirm the form accepts the value. Do not click the send-code button in a read-only run.
- **Check the create-page gate.** Navigate to `http://127.0.0.1:3000/create` while signed out. The app returns to `/sign-in`. This proves the signed-out access gate only, not successful page creation.
- **Prove account creation only with fixtures.** If a disposable account and local database have been set up, complete sign-in, enter an unused test handle on `/create`, save it through the visible form, then open the resulting public page and confirm it belongs to the test account. Read the saved row back using the existing read-only database tooling. If those fixtures are missing, report the journey as blocked with the missing precondition.
- **Proof.** Capture the route, snapshots, visible result, and any stored-page readback. Never claim successful sign-in or page creation from the form alone.

## Gotchas

- Submitting email or provider sign-in can send a real request; never do it without a dedicated test setup.
- An unauthenticated redirect from `/create` is an access-gate check, not proof that creating a page works.
- The local Supabase stack is not started by the web-only verification command. Do not use a personal or shared database as test data.
