# ARCHITECTURE

```
project-root/
├── bun.lock
├── tsconfig.json
├── package.json
├── Dockerfile
├── docker-compose.yml
│
├── src/
│   ├── index.ts              # App entry point
│   │
│   ├── schemas/              # Zod schemas (single source of truth)
│   │   └── user.schema.ts
│   │
│   ├── controllers/          # HTTP handlers (thin layer)
│   │   └── user.controller.ts
│   │
│   ├── services/             # Business logic (no HTTP details)
│   │   └── user.service.ts
│   │
│   ├── middlewares/          # Auth, logging, error handling
│   │   └── auth.middleware.ts
│   │
│   ├── models/               # Database models/DTOs
│   │   └── user.model.ts
│   │
│   ├── core/                 # Utilities and helpers
│   │   ├── logger.ts
│   │   ├── mailer.ts
│   │   └── auth.ts
│   │
│   ├── exceptions/           # Custom error classes
│   │   └── http-exceptions.ts
│   │
│   ├── crons/                # Background jobs
│   │   └── cleanup.cron.ts
│   │
│   └── db/                   # Database setup
│       └── index.ts
│
└── tests/                    # Mirrors src/ structure
    ├── controllers/
    ├── services/
    └── core/
```