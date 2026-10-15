# Grabbin verification map

Read this index before driving the web app, then use the matching feature file. Grabbin's main user surface is the web app; the API and PostgreSQL database provide sign-in, page storage, and public profile data.

## Baseline

- Follow [the verify skill](../SKILL.md) to run the web app on `http://127.0.0.1:3000` and check that this run owns the port.
- Use a fresh isolated browser context for each run.
- `/demo` uses built-in sample data and needs no database or account.
- `/`, `/demo`, and the signed-out `/sign-in` screen can be opened without changing stored data. Submitting an email code or social sign-in can contact external services; do not submit it during a read-only check.
- `/[handle]`, `/create`, and the page editor need a running local PostgreSQL database plus the shared `featuremap@example.com` / `featuremap-test` fixture prepared by [`scripts/cloud-agent-start.sh`](../../../scripts/cloud-agent-start.sh). The same account identity and local Pro grant are used by Grok Bot, Cursor, and Codex; the account is local to each disposable Postgres instance.
- Custom-domain pages use the custom hostname at `/`; verify them only with a deliberately seeded local domain mapping.

## Features

- [Landing page](./landing.md): `/`, sign-in links, and the demo route.
- [Interactive demo](./demo.md): `/demo`, the self-contained sample page.
- [Sign-in and page creation](./sign-in-and-create.md): `/sign-in` and the signed-in `/create` route using the shared fixture.
- [Public creator page](./public-page.md): `/{handle}` and custom-domain `/`.
- [Page editor](./page-editor.md): the signed-in owner view of `/{handle}`.
