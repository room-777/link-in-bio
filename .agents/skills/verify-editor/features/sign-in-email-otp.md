# Sign in with email OTP

A visitor enters an email and one-time code to sign in. A new account continues to page creation; an existing account returns to its requested page or own page.

## Sub-features

- `otp-request`: request a code and see the inbox prompt.
- `otp-verify`: verify the code and establish a session.
- `otp-landing`: route new and existing accounts to the correct next page.
- `otp-change-email`: return to the email step.

## How to get to it (user POV)

- Open `/sign-in` directly, or choose `Create your page` from the landing page or `/demo` while signed out.
- Enter an email, choose `Send OTP`, enter the code, and choose `Verify code`.

## Driving it with Playwright

Preconditions:

- Use the isolated local stack and `featuremap@example.com` fixture. Read the newest code from the local test database only.
- Do not use a real person's email or a production mail key.

- **Request.** Fill `textbox "Email"` with the fixture address and click `button "Send OTP"`. Confirm `heading "Check your inbox"` appears.
- **Read and verify.** Read the local code from the `verification` row for `sign-in-otp-featuremap@example.com`. Fill the code field and click `button "Verify code"`. Confirm the session cookie is set and the existing account reaches its page.
- **New account.** With a disposable `@example.com` address, confirm successful first sign-in leads to `/create` and creates one local account.
- **Proof.** Capture request and result screenshots, ARIA snapshots, actions, and read-only local account/session evidence. Do not capture the OTP value in broadly shared artifacts.

## Gotchas

- OTPs expire after five minutes; requesting another replaces the previous code.
- If successful verification stays on `/sign-in`, record that route failure. Do not bypass it by directly creating a session.
- The code field may not have an accessible name; scope it to the verification step.
