# Add an X post

A Pro owner can add a public X post as an embedded page card by entering its status URL.

## Sub-features

- `tweet-open`: open Tweet from the Advanced widgets picker.
- `tweet-add`: load a public status and add its card.
- `tweet-invalid`: show an error for a bad or unavailable status without adding an item.

## How to get to it (user POV)

- Sign in to a Pro page, choose `Advanced`, then `Tweet`.
- Enter a public post URL or ID and choose `Add`.

## Driving it with Playwright

Preconditions:

- Use the local Pro owner page and outbound HTTPS access to the Tweet preview provider.
- Use a public test post. Do not use production data or infer that an unavailable post is valid.

- **Open.** Click `button "Advanced"`, then `button "Tweet"`. Confirm `dialog "Tweet"` includes `textbox "Tweet ID or URL"` and an Add button.
- **Add.** Enter a public status URL and click `button "Add"`. Confirm the card appears after reload and its `page_items` row has `type = 'tweet'` and the normalized URL.
- **Invalid.** Try a known unavailable status. Confirm the error `Unable to load this Tweet. Try again.` appears and no new row is added.
- **Free account.** If checking the plan gate, use a separate Free account and confirm `Upgrade to Pro`; do not change the shared Pro fixture.
- **Proof.** Capture dialog, action/result, screenshots, network outcome, and read-only item rows.

## Gotchas

- Offline or blocked provider access prevents the add flow; report an environment block.
- The widget is Pro-gated. `/demo` does not prove Pro behavior.
- Restore or delete the test item after proof.
