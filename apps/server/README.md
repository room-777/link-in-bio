# hono-starter

Hono + Cloudflare Workers 기준으로 `Better Auth + Supabase + Drizzle ORM` 기본 설정이 들어간 스타터입니다.

## 설치

```sh
bun install
```

## 필요한 값

Worker 런타임:

- `BETTER_AUTH_URL`
- `BETTER_AUTH_SECRET`
- `RESEND_FROM_EMAIL`
- `DATABASE_URL`
- `FRONTEND_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `RESEND_API_KEY`
- `RESEND_OTP_TEMPLATE_ID`
- `RESEND_ACCOUNT_DELETION_TEMPLATE_ID`
- `CREEM_API_KEY`
- `CREEM_WEBHOOK_SECRET`

권장 구성:

- 로컬/CLI는 Supabase `Shared Pooler` URI를 `DATABASE_URL`로 사용
- `BETTER_AUTH_URL`은 로컬에서는 `.dev.vars.local`, 프로덕션에서는 Worker secret/vars로 설정
- `wrangler.jsonc`에는 로컬 URL을 두지 않음

로컬 개발:

- `.dev.vars.example`를 복사해서 `.dev.vars.local` 생성
- `bun run dev`는 `--env local` 이라 `.dev.vars.local` 값을 읽음

프로덕션:

- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL`은 `wrangler secret put`
- `RESEND_FROM_EMAIL`, `RESEND_OTP_TEMPLATE_ID`, `RESEND_ACCOUNT_DELETION_TEMPLATE_ID`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `RESEND_API_KEY`도 secret로 설정
- `FRONTEND_URL`만 공개 설정이면 `wrangler.jsonc`의 `vars` 또는 환경별 `vars` 사용

## 스크립트

```sh
bun run dev
bun run cf-typegen
bun run auth:generate
bun run db:generate
bun run typecheck
```

## Creem 구독 결제

Creem은 Better Auth의 `/auth/creem/*` endpoint를 사용합니다. 구독 저장과
webhook 동기화를 켜려면 `CREEM_API_KEY`와 `CREEM_WEBHOOK_SECRET`을 Worker
secret으로 설정하세요. 운영 환경에서는 `CREEM_TEST_MODE=false`를 사용하고,
테스트 환경에서만 `CREEM_TEST_MODE=true`를 사용합니다. 결제 성공 후 이동할
주소는 `CREEM_SUCCESS_URL`로 설정합니다.

스키마 변경은 다음 명령으로 생성·적용합니다.

```sh
bun run db:generate
bun run db:migrate
```

Creem webhook 주소는 `https://api.grabbin.me/auth/creem/webhook`입니다.

## 메모

- Better Auth 라우트는 `/api/auth/*`
- Drizzle 스키마는 `src/db/schema.ts`
- Supabase pooler를 쓰므로 prepared statement를 자동으로 끕니다.
- 로그인 옵션은 이메일/비밀번호, 매직 링크, Google, GitHub 입니다.

## Profile image R2 setup

The backend expects an R2 bucket binding named `IMAGES` pointing to the
`test-images` bucket. Configure these Worker secrets before deploying:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

The access key must be an R2 API token with Object Read and Object Write access
to `test-images`. The browser uploads through short-lived presigned PUT URLs;
the bucket must have CORS configured to allow the frontend origins to send
`GET`, `HEAD`, and `PUT` requests with the `Content-Type` and `Cache-Control`
headers. `GET` and
`HEAD` are required when an existing original is opened for re-cropping.

Make the bucket publicly readable through an R2 custom domain (or an `r2.dev`
subdomain for development) and configure the matching `VITE_R2_PUBLIC_URL` in
the frontend. New profile images use an immutable source object and a display
object derived from the same UUID, such as
`users/{userId}/{pageId}/profile/{uuid}.jpg` and
`users/{userId}/{pageId}/profile/{uuid}-crop.webp`. The display object is
uploaded with `Cache-Control: no-cache, must-revalidate` because re-cropping
reuses its key.

Apply the Drizzle migration before deploying the Worker. The Worker reads the
new `pages.image_source` and `pages.image_crop` columns during page queries:

```sh
bun run --filter @grabbin/server db:migrate
bun run deploy:server
```

Keep the additive columns during rollback; deploy the previous Worker before
rolling back database schema changes.
