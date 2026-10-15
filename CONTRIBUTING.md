# Contributing

## Production keys

Production keys and resources are used **only** by the Deploy workflow
(`.github/workflows/deploy.yml`, GitHub `production` environment).
Local machines, bot machines, cloud agents and CI test jobs never use them.

- Do not put production values in `.env`, `.env.local` or any test config.
  Never commit `.env*` files other than `.env.example`.
- Do not read `.env.production` outside the deploy path (`packages/infra`,
  the server build config, and the explicit production migration in README).
- Never write to the production R2 bucket `grabbin` from a local or bot machine
  (no `wrangler r2 ... --remote`, no real `*.r2.cloudflarestorage.com`
  endpoint). Local development uses Alchemy dev's local R2; tests use fakes or
  a bucket with another name.
- Production database: read-only `SELECT` for investigation only. Tests use a
  throwaway local database (`127.0.0.1`/`localhost`, a `grabbin_*_test` name).
- The pre-commit hook applies Biome fixes to staged files and preserves
  unstaged changes. Do not skip the hook.
- CI runs the full `bun run verify` checks.

Automated checks:

- `bun run check:prod-keys` (part of `bun run verify`, so it runs in CI) fails
  when tracked files commit an env file, read
  `.env.production` or production secrets outside the deploy path, or point
  local/test code at a production host or the `grabbin` bucket.
- Every `bun test` run loads `scripts/test-preload.ts`, which stops the run
  when the environment points tests at production (`NODE_ENV=production`, a
  production host in a test database/R2 variable, or non-local R2 credentials).
- Database integration tests call `assertLocalTestDatabase()` from
  `@grabbin/env/prod-guard` before they connect.

## Checks on every pull request

- `verify`: runs the repository checks (`bun run verify`).
- `auth-smoke`: signs in with an email OTP against a throwaway Postgres and
  checks that `GET /auth/get-session` returns the session, not a server error.

After a deploy, the Deploy workflow checks the public site, the API and an
unauthenticated session read, and fails the run if any of them errors.
