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

Preconditions: rendering `/sign-in` needs no account. The shared setup prepares `featuremap@example.com` and its local Pro subscription with no page on first use. The local mail key is blank, and the one-time code is read from local Postgres. Create the `featuremap-test` handle through the UI; the same identity and handle are used in every agent environment.

- **Open the sign-in screen.** Navigate to `http://127.0.0.1:3000/sign-in`. The latest accessibility snapshot shows the email-code form and any enabled provider buttons.
- **Check email entry without sending.** Fill the email textbox with a reserved example address such as `verify@example.invalid`; confirm the form accepts the value. Do not click the send-code button in a read-only run.
- **Check the create-page gate.** Navigate to `http://127.0.0.1:3000/create` while signed out. The app returns to `/sign-in`. This proves the signed-out access gate only, not successful page creation.
- **Prove account and page creation.** Run `scripts/cloud-agent-start.sh`, then use `verify-editor/scripts/drive-create-page.mjs`. It signs in as `featuremap@example.com`, creates `featuremap-test` through the visible form when the account has no page, opens the owner route, and saves the screenshots and actions. Read the `user` and `pages` rows back from local Postgres.
- **Proof.** Capture the route, snapshots, visible result, and any stored-page readback. Never claim successful sign-in or page creation from the form alone.

## Gotchas

- Do not use another account or a deliverable address. Only the shared local fixture is authorized for OTP sign-in.
- An unauthenticated redirect from `/create` is an access-gate check, not proof that creating a page works.
- The local Supabase stack is not started by the web-only verification command. Do not use a personal or shared database as test data.
