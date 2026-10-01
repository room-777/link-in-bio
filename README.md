# grabbin

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines Next.js, Hono, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **Next.js** - Full-stack React framework
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **Shared UI package** - shadcn/ui primitives live in `packages/ui`
- **Hono** - Lightweight, performant server framework
- **workers** - Runtime environment
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Cloudflare Hyperdrive** - Database connection pooling for Workers
- **Authentication** - Better-Auth
- **Biome** - Linting and formatting

## Getting Started

First, install the dependencies:

```bash
bun install
```

## Database Setup

This project uses PostgreSQL with Drizzle ORM. The server connects through a
Cloudflare Hyperdrive binding at runtime, so the database provider can be
Supabase or another PostgreSQL service.

Use separate URLs for local development and deployment:

- `DATABASE_URL_LOCAL`: PostgreSQL running on your computer, such as Supabase Local
- `DATABASE_URL`: PostgreSQL used by the deployed Hyperdrive resource
- `apps/server/.env`: local database values
- `apps/server/.env.production`: production database values

When running locally, the server and Drizzle use `DATABASE_URL_LOCAL`. When
deploying, Hyperdrive and production migrations use `DATABASE_URL`. Keep these
files out of git.

### Local database options

Supabase Local:

```bash
bun run db:local:supabase
```

The project starts only PostgreSQL by default to keep local memory usage low.
Run `supabase start` directly when you need the full Supabase service stack.

Set `DATABASE_URL_LOCAL` in `apps/server/.env` to the connection string shown
by the selected local database. `DATABASE_URL` is still required by Alchemy;
for local-only work, it can use the same local connection string.

Stop Supabase Local with `db:local:supabase:stop`.

1. Generate migration files:

```bash
bun run db:generate
```

Then, run the development server:

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the web application.
The API is running at [http://localhost:3001](http://localhost:3001).

Apply migrations to the local database selected by `DATABASE_URL_LOCAL`:

```bash
bun run --filter @grabbin/db db:migrate:deploy
```

For production, set `NODE_ENV=production` so Drizzle reads
`apps/server/.env.production`:

```bash
NODE_ENV=production bun run --filter @grabbin/db db:migrate:deploy
```

Run the production command from CI when possible.

## UI Customization

React web apps in this stack share shadcn/ui primitives through `packages/ui`.

- Change design tokens and global styles in `packages/ui/src/styles/globals.css`
- Update shared primitives in `packages/ui/src/components/*`
- Adjust shadcn aliases or style config in `packages/ui/components.json` and `apps/web/components.json`

### Add more shared components

Run this from the project root to add more primitives to the shared UI package:

```bash
npx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Import shared components like this:

```tsx
import { Button } from "@grabbin/ui/components/button";
```

### Add app-specific blocks

If you want to add app-specific blocks instead of shared primitives, run the shadcn CLI from `apps/web`.

## Deployment

### Alchemy

- Target: web on Cloudflare + server on Cloudflare
- Configure provider login: `cd packages/infra && bunx alchemy login --configure`
- Dev: bun run dev (Alchemy manages the web Worker, server Worker, and bindings)
- Deploy: bun run deploy (source maps are uploaded to Sentry and removed from deployment files)
- Destroy: bun run destroy

The production web Worker and the local development web Worker are managed
through `packages/infra` and Alchemy. Alchemy injects the server Worker as the
`SERVER` Service Binding and the shared R2 bucket as `R2_BUCKET`. The
standalone `apps/web/wrangler.jsonc` is only a local preview config and does
not manage application bindings.

`alchemy login --configure` stores the selected Cloudflare provider profile
under `~/.alchemy`; no provider-specific setup command is required by this
scaffold.

Deploys are staged and default to a personal `dev_<username>` stage. For production, run the deploy with an explicit stage from `packages/infra`:

```bash
cd packages/infra && bun run deploy:production
```

Source map upload requires `SENTRY_AUTH_TOKEN`, `SENTRY_SERVER_ORG`, `SENTRY_SERVER_PROJECT`, `SENTRY_WEB_ORG`, and `SENTRY_WEB_PROJECT` in the deployment environment. The source maps are used by Sentry only and are deleted after upload, so they are not served by the deployed web or server files.

### App releases

Pushes to `main` create GitHub releases and `vX.Y.Z` tags from Conventional Commit messages:

- `feat:` bumps the feature number (`1.2.0` → `1.3.0`)
- `fix:` or `perf:` bumps the fix number (`1.2.0` → `1.2.1`)
- `feat!:` or a `BREAKING CHANGE:` footer bumps the major number (`1.2.0` → `2.0.0`)
- `docs:`, `chore:`, `refactor:`, `test:`, `build:`, and `ci:` keep the current version

The first qualifying commit creates `v1.0.0`.

The release tag identifies the source revision. It does not confirm that revision has been deployed; production deployment remains `bun run deploy:production`.

### Production origins

- Required after the first deploy: set `CORS_ORIGIN` in `apps/server/.env` to the exact deployed web origin, such as `https://app.example.com`, then deploy the server again.

## Git Hooks and Formatting

- Run checks: `bun run check`

## Project Structure

```
grabbin/
├── apps/
│   ├── web/         # Frontend application (Next.js)
│   └── server/      # Backend API (Hono)
├── packages/
│   ├── ui/          # Shared shadcn/ui components and styles
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `bun run dev`: Start the infra-managed web and server Workers
- `bun run build`: Build all applications
- `bun run dev:web`: Start the infra-managed web and server Workers
- `bun run dev:server`: Start only the server
- `bun run check-types`: Check TypeScript types across all apps
- `bun run db:generate`: Generate database client/types
- `bun run check`: Run Biome formatting and linting
