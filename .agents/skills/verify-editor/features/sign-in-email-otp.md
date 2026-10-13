# Sign in with email OTP

A visitor enters an email, receives a 6-digit code, enters it, and lands signed in: on `/create` when the account has no page yet, otherwise on their own `/{handle}` editor.

## Sub-features

- `otp-request` sends a code and shows the "Check your inbox" step.
- `otp-verify` accepts the code and sets the `better-auth.session_token` cookie.
- `otp-landing` moves the signed-in user off `/sign-in` to `/create` or `/{handle}`.
- `otp-change-email` returns to the email step via `Use a different email`.

## How to get to it (user POV)

- Open `/sign-in` directly, or choose `Create your page` on the landing page or `/demo` while signed out (it redirects to `/sign-in`).
- Type the email in `Email`, choose `Send OTP`, type the code, choose `Verify code`.

## Driving it with Playwright

Preconditions:

- `doctor.sh` is OK. Address is `dev@example.com` (or another `@example.com`).

- **Request code.** Fill `textbox "Email"` with `dev@example.com`, click `button "Send OTP"`. `heading "Check your inbox"` appears with the address in bold.
- **Read code.** Run `scripts/otp.sh dev@example.com`. It prints 6 digits.
- **Verify.** Fill the single unnamed textbox in the code group, click `button "Verify code"` (disabled until 6 digits). `POST /auth/sign-in/email-otp` returns 200 and the context gains `better-auth.session_token`.
- **Landing.** The page does `location.replace` back through `/sign-in`, whose server render redirects a signed-in user to `/create` or `/{handle}`. Wait up to 3 min on first compile.
- **Scripted.** `node scripts/drive-sign-in.mjs "$EVIDENCE_DIR/sign-in" dev@example.com` from `$PW_DIR`.
- **Proof.** `otp-sent.png`, `after-verify.png`, `after-verify.aria.txt`, `actions.md`; plus `select id, email from "user" where email = 'dev@example.com'` and a `session` row for that user.

## Gotchas

- `RESEND_API_KEY` may be real. Never use a deliverable address; the code is read from the `verification` table (`identifier = 'sign-in-otp-<email>'`, value `<code>:<attempts>`).
- Known failure at the time of writing (Oct 2026, `hono@4.13.3`): `otp-landing` FAILS. `src/query/session/current.ts` calls `client.auth["*"].$get({ param: { "*": "get-session" } })`, and this hono client builds `http://get-session/127.0.0.1:3001/auth/*` (with the `SERVER` binding: `/server/auth/*`, 404). The server render therefore never sees the session and the user stays on `/sign-in`, and `/create` redirects back to `/sign-in`. The API side (`otp-request`, `otp-verify`) works. Report `otp-landing` as failing with this reason; do not bypass it.
- Codes expire after 5 minutes and each `Send OTP` replaces the previous code.
- The OTP input has no accessible name; use the first textbox inside the verification step.
