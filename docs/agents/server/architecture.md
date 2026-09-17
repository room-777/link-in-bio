# Server architecture reference

이 문서는 `apps/server`의 현재 코드와 앞으로 코드를 나눌 기준을 함께 설명합니다. 현재는 `src/controllers`, `src/services`, `src/middlewares`, `src/models`가 주로 사용되고, 공유 도메인·인증·DB는 `packages/*`에 있습니다. 아래 폴더는 필요할 때만 만들며, 빈 폴더를 미리 만들지 않습니다.

## 전체 구조

```text
apps/server/
├── package.json
├── tsconfig.json
├── Dockerfile / docker-compose.yml
├── src/
│   ├── index.ts                 # Hono 앱 시작점과 공통 미들웨어
│   ├── schemas/                 # HTTP 입력 schema의 단일 기준
│   ├── controllers/             # 얇은 HTTP route 모듈
│   ├── services/                # HTTP를 모르는 업무 규칙
│   ├── middlewares/             # 인증·로그·공통 오류 처리
│   ├── models/                  # DB row, DTO, 외부 데이터 변환
│   ├── core/                    # logger, mailer, auth 같은 공통 도구
│   ├── exceptions/              # 의미 있는 애플리케이션 오류
│   ├── crons/                   # 재시도 가능한 백그라운드 작업
│   └── db/                      # 이 앱이 DB를 조립할 때만 사용
└── tests/                       # src/와 같은 상대 경로의 테스트
    ├── controllers/
    ├── services/
    └── core/
```

현재 구조와 연결할 때는 `packages/auth`의 Better Auth, `packages/db`의 Drizzle schema·DB 생성기, `packages/resume`의 공유 도메인 schema를 먼저 재사용합니다. 서버에 같은 타입이나 검증을 다시 만들지 않습니다.

## 요청 흐름

```text
Request
  → index.ts 공통 middleware
  → controller route
  → schema 검증 / middleware 권한 확인
  → service 업무 규칙
  → model 또는 db 접근
  → DTO 변환
  → HTTP Response
```

### `src/index.ts` — 앱 조립

라우트, CORS, 로그, 오류 응답을 조립합니다. 업무 규칙을 넣지 않습니다.

```ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createFactory } from "hono/factory";
import { timing } from "hono/timing";
import { userController } from "./controllers/user.controller";
import type { AppEnv } from "./types";

const factory = createFactory<AppEnv>();

const app = factory
  .createApp()
  .use("/*", timing())
  .use("/*", cors({ origin: "https://example.com", credentials: true }))
  .route("/users", userController)
  .notFound((c) => c.json({ message: "Not Found" }, 404))
  .onError((error, c) => {
    console.error(error);
    return c.json({ message: "Internal Server Error" }, 500);
  });

export type AppType = typeof app;
export default app;
```

### `src/schemas/` — 입력 검증

JSON·query·param의 외부 입력을 검증합니다. 저장용 DB schema와 섞지 않습니다. 현재 저장소는 Valibot을 많이 사용하므로 기존 모듈은 Valibot을 유지하고, 새 모듈에서 Zod로 바꾸려면 한 파일 안에서 두 라이브러리를 섞지 않습니다.

```ts
import * as v from "valibot";

export const createUserSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(80)),
  email: v.pipe(v.string(), v.email()),
});

export type CreateUserInput = v.InferOutput<typeof createUserSchema>;
```

### `src/controllers/` — 얇은 HTTP 계층

상태 코드·헤더·입력 파싱·service 호출만 담당합니다. Hono route는 타입 추론을 위해 체인하거나 feature 단위 Hono 앱으로 묶습니다.

```ts
import { Hono } from "hono";
import * as v from "valibot";
import { sessionMiddleware } from "../middlewares/session.middleware";
import { createUserSchema } from "../schemas/user.schema";
import { createUser } from "../services/user.service";
import type { AppEnv } from "../types";

export const userController = new Hono<AppEnv>().post(
  "/",
  sessionMiddleware,
  async (c) => {
    const parsed = v.safeParse(createUserSchema, await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ message: "Invalid user" }, 400);

    const user = await createUser(c.var.user.id, parsed.output);
    return c.json({ user }, 201);
  },
);
```

### `src/services/` — 업무 규칙

HTTP `Context`를 받지 않고, 사용자 ID·검증된 입력·의존성만 받습니다. 권한과 중복·상태 전이는 service에서 다시 확인합니다.

```ts
import { userModel } from "../models/user.model";
import type { CreateUserInput } from "../schemas/user.schema";

export async function createUser(ownerId: string, input: CreateUserInput) {
  const existing = await userModel.findByEmail(input.email);
  if (existing) throw new Error("USER_EMAIL_ALREADY_EXISTS");
  return userModel.insert({ ownerId, ...input, id: crypto.randomUUID() });
}
```

### `src/middlewares/` — 요청 전후 공통 동작

인증·권한·로그처럼 여러 route가 공유하는 요청 단위 동작을 둡니다. 미들웨어는 `c.set()`으로 넣고 controller는 `c.var`로 읽습니다.

```ts
import { createMiddleware } from "hono/factory";
import { createAuth } from "@between-cv/auth";
import type { AppEnv } from "../types";

export const sessionMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const session = await createAuth().api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ message: "Unauthorized" }, 401);
  c.set("session", session);
  c.set("user", session.user);
  await next();
});
```

### `src/models/` — DB row·DTO·변환

DB schema 자체는 `packages/db`에 두고, 이 폴더에는 해당 기능에서 필요한 조회·저장 함수와 외부에 내보낼 DTO 변환을 둡니다. 비밀번호·내부 ID·소유자 ID를 공개 DTO에 넣지 않습니다.

```ts
import { eq } from "drizzle-orm";
import { createDb } from "@between-cv/db";
import { user } from "@between-cv/db/schema/auth";

const db = () => createDb({ session: true });

export const userModel = {
  findByEmail: (email: string) =>
    db().query.user.findFirst({ where: eq(user.email, email) }),
  insert: async (values: typeof user.$inferInsert) => {
    const [row] = await db().insert(user).values(values).returning();
    return row;
  },
};
```

### `src/core/` — 공통 도구

여러 기능에서 같은 방식으로 쓰는 logger·mailer·auth 조립 코드만 둡니다. 기능의 업무 규칙이나 route 응답은 넣지 않습니다. 작은 함수 하나를 위해 core 파일을 만들지 않습니다.

```ts
export const logger = {
  info(message: string, data?: Record<string, unknown>) {
    console.info(JSON.stringify({ level: "info", message, ...data }));
  },
};
```

### `src/exceptions/` — 오류 종류

호출자가 처리할 수 있는 오류와 서버 오류를 구분합니다. 원본 비밀값을 메시지에 넣지 않습니다.

```ts
export class AppException extends Error {
  constructor(
    public readonly code: string,
    public readonly status: 400 | 401 | 403 | 404 | 409,
    message: string,
  ) {
    super(message);
  }
}

export class NotFoundException extends AppException {
  constructor(message = "Resource not found") {
    super("NOT_FOUND", 404, message);
  }
}
```

### `src/crons/` — 예약 작업

반복 실행·재시도가 가능한 작업만 둡니다. 한 번 실행해도 안전하도록 idempotency key, 처리 시각, 실패 로그를 남깁니다. 요청 흐름에서 직접 긴 작업을 기다리게 하지 말고 플랫폼의 스케줄러와 연결합니다.

```ts
export async function cleanupExpiredSessions(now = new Date()) {
  const expired = await findExpiredSessions(now);
  for (const session of expired) {
    await deleteSession(session.id);
  }
  return expired.length;
}
```

### `src/db/` — DB 조립

환경별 연결·transaction·migration 경계가 이 앱에 필요한 경우에만 둡니다. 이미 `packages/db`가 제공하는 `createDb`와 schema를 먼저 사용합니다.

```ts
import { createDb } from "@between-cv/db";

export function withDatabase() {
  return createDb({ session: true, readFromPrimary: true });
}
```

### `tests/` — 구조를 닮은 테스트

새 테스트는 `tests/controllers/user.controller.test.ts`, `tests/services/user.service.test.ts`처럼 `src/`의 상대 경로를 따라갑니다. 현재 인접한 `src/**/*.test.ts`는 기존 변경 범위를 존중하되, 새 파일은 이 규칙을 따릅니다. 구체적인 케이스 ID·증거·정리 규칙은 `testing.md`를 읽습니다.
