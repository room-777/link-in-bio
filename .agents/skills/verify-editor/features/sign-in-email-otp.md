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
- Requires the fix from PR #5 (`c80d21e` on `main`, review follow-up `9445df2`). Commit `6f9d991` ("refactor(web): enforce feature request boundaries") made `src/query/session/current.ts` call `client.auth["*"].$get({ param: { "*": "get-session" } })`. The hono client fills params with the regex `"/:" + key`; for key `*` that is `/:*` (zero or more colons), which matches the first `/` of `http://` and builds `http://get-session/127.0.0.1:3001/auth/*` (via the `SERVER` binding: `/server/auth/*`, 404). This is a misuse of a wildcard as a named param (same on hono 4.12.32-4.13.13), not a hono bug and not box-specific; it broke login on every machine. The fix adds a typed `.on(["GET"], "/get-session", ...)` route in `apps/server/src/controllers/auth.controller.ts`, and the web calls `client.auth["get-session"].$get(...)`. On a checkout without that commit, `otp-landing` FAILS (user stays on `/sign-in`) while `otp-request`/`otp-verify` pass; report it as that regression, do not bypass it.
- Verified Oct 13 2026 on `main` + this skill: `RESULT: PASS`, landed on `/{handle}`.
- Codes expire after 5 minutes and each `Send OTP` replaces the previous code.
- The OTP input has no accessible name; use the first textbox inside the verification step.
