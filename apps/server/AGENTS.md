# Server Agent Rules

먼저 루트 [`/AGENTS.md`](../../AGENTS.md)를 읽고, 아래 reference를 작업 종류에 맞게 읽습니다.

## 필수 규칙

- API는 Hono의 `app.route()`와 요청 단위 `Context`를 중심으로 작성합니다.
- 입력은 신뢰하지 말고 경계에서 검증합니다. 인증·소유권·외부 provider 응답도 같은 기준으로 확인합니다.
- controller는 HTTP 변환만 담당하고, 업무 규칙은 service로 보냅니다.
- DB 접근은 모델·DB 계층에 모으고, service에서 SQL 세부 사항을 여러 번 복사하지 않습니다.
- server 변경은 대응하는 테스트를 반드시 작성합니다. 테스트 규칙은 [`docs/agents/server/testing.md`](../../docs/agents/server/testing.md)를 따릅니다.
- 단독 유틸 함수나 순수 정책 함수는 별도 테스트 파일을 만들지 않습니다. 해당 함수를 사용하는 controller·service의 실제 호출 경로 테스트에서 검증합니다.

## 반드시 사용할 스킬

- Hono: [`/Users/kinmongsang/.agents/skills/hono/SKILL.md`](/Users/kinmongsang/.agents/skills/hono/SKILL.md)

## 선택 스킬

- Better Auth 작업 시: [`/Users/kinmongsang/.agents/skills/better-auth-best-practices/SKILL.md`](/Users/kinmongsang/.agents/skills/better-auth-best-practices/SKILL.md)
- 인증 테스트는 [Better Auth Test Utils](https://better-auth.com/docs/plugins/test-utils)를 먼저 확인합니다.

## 상세 문서

- 구조·폴더별 예시: [`docs/agents/server/architecture.md`](../../docs/agents/server/architecture.md)
- 테스트·결과 기록·되돌릴 수 없는 동작: [`docs/agents/server/testing.md`](../../docs/agents/server/testing.md)
