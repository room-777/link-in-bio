# Landing page

The landing page explains Grabbin and lets a visitor begin sign-in or open the interactive demo.

## Sub-features

- `landing-open` loads the public home page.
- `landing-sign-in` opens the sign-in screen from a creation call to action.
- `landing-demo` opens the interactive demo when a visible link is present.

## How to get to it (user POV)

- Open `/` on the local app.
- Choose a visible button or link to create a page; the destination is `/sign-in`.
- Open `/demo` directly. The current hero's sample cards are presentation content, not a link to the demo route.

## Driving it with Chrome DevTools

Preconditions: the local web app is healthy and the browser uses this run's isolated context.

- **Open the page.** Navigate to `http://127.0.0.1:3000/`. The page title and main heading describe Grabbin's visual personal website.
- **Follow the sign-in call to action.** From the latest accessibility snapshot, choose the visible create-page link or button. The browser reaches `/sign-in` and shows the sign-in form.
- **Open the demo.** Navigate to `http://127.0.0.1:3000/demo`. The interactive sample page appears.
- **Proof.** Save before/after accessibility snapshots and a screenshot for any interaction. Record the exact accessible name and final URL.

## Gotchas

- The landing page uses client-rendered sections. A direct HTML response alone does not prove the visible page is complete.
- Do not assume the visual hero cards are clickable; use a visible accessible control from the current snapshot.
