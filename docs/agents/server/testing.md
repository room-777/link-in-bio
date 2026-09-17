# Server testing reference

서버 테스트는 기능이 실제로 지켜야 하는 계약을 확인합니다. 단순히 실행 줄 수를 늘리지 말고, 입력 경계·권한·상태 변화·외부 provider 결과를 확인합니다. Hono endpoint는 서버를 띄우지 않고 `app.request()`로 요청합니다.

## 테스트 위치와 범위

- 새 테스트: `apps/server/tests/` 아래에서 `src/` 상대 경로를 미러링합니다.
- controller: HTTP 상태·응답 body·header·인증 경계를 확인합니다.
- service: 업무 규칙·소유권·transaction·외부 호출을 확인합니다.
- model/core: 저장·변환·입력 경계처럼 실패 비용이 큰 순수 동작을 확인합니다.
- 테스트에서 실제 결제·실제 메일·실제 운영 DB를 호출하지 않습니다. test double 또는 provider의 test mode를 사용합니다.

## 모든 케이스에 넣을 기록

각 테스트 케이스에는 고유한 ID와 다음 다섯 항목을 남깁니다. 결과는 테스트 리포트나 PR 검증 기록에 `Pass`, `Fail`, `Blocked`, `Not Run` 중 하나로 기록합니다.

```ts
/**
 * Case ID: USER-API-001
 * Given: 로그인한 사용자와 유효한 이름이 있다.
 * When: PUT /users/me 로 이름을 보낸다.
 * Then: 204이고 DB 이름이 새 값이며 다른 사용자는 바뀌지 않는다.
 * Evidence: HTTP status/body, DB query 결과, request log의 case ID.
 * Result: Pass | Fail | Blocked | Not Run
 */
it("USER-API-001 updates only the signed-in user", async () => {
  const response = await app.request("/users/me", {
    method: "PUT",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Updated User" }),
  });

  expect(response.status).toBe(204);
  expect(await findUser(userId)).toMatchObject({ name: "Updated User" });
  expect(await findUser(otherUserId)).toMatchObject({ name: "Other User" });
});
```

`Evidence`는 “assertion이 있다”가 아니라 판정에 사용한 실제 증거를 적습니다. 예: `response.status=204`, `GET /me response`, `SELECT ... WHERE id=?`, 구조화된 로그의 `requestId`, Stripe/Creem test-mode 객체 상태.

## Hono endpoint 예시

```ts
import { describe, expect, it } from "vitest";
import { app } from "../../src/app";

describe("POST /users", () => {
  /**
   * Case ID: USER-API-002
   * Given: body의 email이 비어 있다.
   * When: 인증된 요청을 보낸다.
   * Then: 400이며 service와 DB는 호출되지 않는다.
   * Evidence: HTTP 400 JSON, mock 호출 횟수, DB query log.
   * Result: Pass | Fail | Blocked | Not Run
   */
  it("USER-API-002 rejects invalid input at the boundary", async () => {
    const response = await app.request("/users", {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ email: "" }),
    });

    expect(response.status).toBe(400);
    expect(createUser).not.toHaveBeenCalled();
  });
});
```

Hono의 최신 API나 테스트 방법이 필요한 경우 [`hono/SKILL.md`](/Users/kinmongsang/.agents/skills/hono/SKILL.md)와 Hono 공식 문서를 먼저 읽습니다. `npx hono request`는 간단한 route 확인에 사용하고, Cloudflare binding이 필요하면 `workers-fetch` 또는 `app.request()`에 mock binding을 전달합니다.

## Better Auth 인증 테스트

인증 테스트는 [Better Auth Test Utils](https://better-auth.com/docs/plugins/test-utils)를 기준으로 합니다. `testUtils()`는 운영 auth 설정에 넣지 말고 test-only auth 인스턴스 또는 factory에 둡니다. `createUser`, `saveUser`, `getAuthHeaders`, `getCookies`, `deleteUser`를 사용해 테스트 사용자를 만들고 정리합니다.

```ts
import { beforeAll, describe, expect, it } from "vitest";
import type { TestHelpers } from "better-auth/plugins";
import { auth } from "./auth.test";

describe("protected route", () => {
  let test: TestHelpers;

  beforeAll(async () => {
    test = (await auth.$context).test;
  });

  /**
   * Case ID: AUTH-001
   * Given: test-only auth에 저장된 사용자가 있다.
   * When: getAuthHeaders로 보호된 endpoint를 호출한다.
   * Then: 세션의 user ID가 요청 사용자와 같다.
   * Evidence: session.user.id, HTTP status, DB cleanup query.
   * Result: Pass | Fail | Blocked | Not Run
   */
  it("AUTH-001 accepts a valid test session", async () => {
    const user = await test.saveUser(test.createUser());
    try {
      const headers = await test.getAuthHeaders({ userId: user.id });
      const response = await app.request("/protected", { headers });
      expect(response.status).toBe(200);
    } finally {
      await test.deleteUser(user.id);
    }
  });
});
```

## 되돌릴 수 없는 동작

탈퇴·삭제·결제·환불·구독 해지처럼 되돌리기 어렵거나 외부 상태를 바꾸는 동작은 일반 테스트보다 엄격하게 작성합니다.

1. **기준선:** 실행 전 DB row 수, 대상 row의 핵심 값, session 수, 외부 provider의 test 객체 ID·상태를 조회해 기록합니다.
2. **격리:** 고유한 `caseId`를 이메일·멱등 키·provider metadata에 넣고, 운영 자격 증명과 운영 ID를 사용하지 않습니다.
3. **판정:** HTTP 응답만 보지 말고 DB cascade/soft-delete, 세션 폐기, provider 상태, webhook 처리 결과까지 확인합니다.
4. **정리:** `try/finally`에서 생성한 user·session·row·provider test 객체를 case ID로 삭제합니다. 실패해도 정리가 실행되어야 합니다.
5. **재확인:** 정리 후 기준선과 비교하고, 남은 데이터나 외부 객체가 있으면 `Fail` 또는 `Blocked`로 기록합니다. 운영 데이터에 접근했거나 정리할 수 없으면 테스트를 계속 반복하지 않습니다.

```ts
/**
 * Case ID: ACCOUNT-DELETE-001
 * Given: test user, resume, session이 있고 baseline snapshot을 저장했다.
 * When: DELETE /auth/delete-user를 한 번 호출한다.
 * Then: 204, user와 종속 데이터가 정책대로 제거/비활성화되고 session이 무효다.
 * Evidence: before/after DB query, auth session lookup, HTTP response, cleanup log.
 * Result: Pass | Fail | Blocked | Not Run
 */
it("ACCOUNT-DELETE-001 deletes only the isolated account", async () => {
  const baseline = await snapshotAccount(caseId);
  const headers = await getIsolatedAuthHeaders(caseId);

  try {
    const response = await app.request("/auth/delete-user", {
      method: "DELETE",
      headers,
    });
    expect(response.status).toBe(204);
    expect(await snapshotAccount(caseId)).toEqual(expectedDeletedState(baseline));
    expect(await getSession(headers)).toBeNull();
  } finally {
    await cleanupCaseData(caseId);
    await expectNoCaseData(caseId);
  }
});
```

결제 테스트는 provider test mode, 고정 금액, 고유 idempotency key, webhook 서명 검증을 함께 사용합니다. 실제 결제가 필요하면 별도 승인 없이는 실행하지 않습니다.

## 결과 기록 양식

```md
| Case ID | Result | Evidence | Blocked reason / cleanup note |
| --- | --- | --- | --- |
| USER-API-001 | Pass | HTTP 204; DB query shows only user-1 changed | cleaned user-1 fixture |
| PAYMENT-001 | Blocked | provider test credentials unavailable | no live call made |
```
