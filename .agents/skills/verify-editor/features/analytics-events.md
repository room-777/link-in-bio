# Analytics event flow

This map explains when Grabbin sends its main GA4 events. Browser events mark a screen opening or a successful action; Creem purchase events come from the server after a paid transaction is confirmed.

## Events

- `sign_up_start` is sent once per tab session when `/sign-in` opens.
- `sign_up` is sent after OTP or social sign-in creates a new account. `login` is sent after an existing account signs in. A failed sign-in sends neither event. Social sign-in uses the provider's new-account callback to send new users to `/create`.
- `page_created` is sent after the server successfully creates the page.
- `page_view` is sent once by the app for each screen. GA4's automatic page-view send is turned off to prevent counting the same screen twice.
- `page_edited` is sent after a page-item save succeeds, once per item type and action in that save. Actions are `create`, `update`, and `delete`.
- `profile_share` is sent only after the page URL is copied successfully.
- `profile_link_click` is sent when a visitor clicks a link inside a public page item. The existing click handler reads `data-ga-event`; GA4 does not read that attribute on its own. The event includes the item type and its visible position, and `is_owner` separates the owner view from a visitor view.
- `begin_checkout` is sent when the app returns a Creem checkout link. A failed request or already completed checkout does not send it.
- `purchase` is sent by the server only when Creem confirms a paid transaction. Each renewal has its own transaction ID. A failed payment does not send it.

## Data sent

- Browser events use the internal account ID for signed-in activity and clear it on sign-out. They send a safe page type instead of the full URL.
- Purchase data uses Creem's transaction ID, amount, currency, and product. Creem can resend a notice if it does not get a successful response. The server can then send the same transaction ID to GA4 again. The app does not keep a separate analytics table; GA4 uses the matching transaction ID to avoid counting the same web purchase twice.
- `page_id` is sent with page events for filtering, but it is not registered as a GA4 custom reporting field because it has many possible values.
- The GA4 API secret stays on the server. The app disables browser analytics in the local development stack; do not enable it there with the production measurement ID.

## How to verify

Preconditions:

- Run the full local feature-map stack and its doctor as described in `../SKILL.md`.
- Use the shared local account for existing-user sign-in. Use a disposable `@example.com` address for a new-account OTP check; read its code from the local database with `scripts/otp.sh`.
- Use a public page with at least one link item. Do not use a real paid checkout.
- Social sign-in needs working provider test credentials; do not treat a redirect to the provider as a completed sign-in.

- **Sign-in.** Verify an existing account and confirm it returns to its page. Repeat with a disposable new account and confirm it goes to `/create`. An invalid code must not create a session or change the account.
- **Social sign-in.** With a configured provider test account, confirm a new provider account goes to `/create` and an existing provider account returns to its requested page.
- **Page creation.** Complete page creation through `/create`; confirm the page exists after reload.
- **Public link.** Open the page as a visitor and click a link item. Confirm the clicked item has `data-ga-event="profile_link_click"`; repeat as its owner and confirm the event context can mark `is_owner`.
- **Checkout.** From the pricing screen, start checkout only with a configured Creem test store. A returned checkout URL starts checkout; an API error must not.
- **Purchase.** Use a Creem test payment to confirm a paid transaction sends `purchase` with that transaction's ID and product. A failed payment produces none; each paid renewal has a distinct transaction ID. Creem may send the same notice again, so check that each repeat uses the same transaction ID. GA4 deduplicates web purchases by that ID.

## Limits of local verification

The shared local development stack disables browser GA collection and uses a local Creem key, so it can verify page navigation and UI behavior but cannot prove events reached GA4 or complete a real Creem payment. To verify event delivery, use a dedicated test GA4 property and Creem test store. GA4 property settings, DebugView, and the internal-traffic exclusion rule require separate admin access.
