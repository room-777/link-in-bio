<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Web Agent Rules

먼저 루트 [`/AGENTS.md`](../../AGENTS.md)를 읽습니다. 위의 `This is NOT the Next.js you know` 지침과 `apps/web/node_modules/next/dist/docs/`의 관련 문서를 코드 작성 전에 반드시 선제적으로 확인합니다.

## 필수 규칙

- 이 앱은 Next.js App Router입니다. 서버 컴포넌트와 클라이언트 컴포넌트의 경계를 먼저 정하고, 필요한 파일에만 `use client`를 붙입니다.
- `apps/web`에는 테스트 코드를 새로 작성하거나 기존 테스트를 수정하지 않습니다. 동작 확인은 타입 검사·빌드·브라우저 또는 실행 확인으로 남깁니다.
- 모든 웹 작업은 저장소의 Codex plugin [`plugins/frontend-fundamentals`](../../plugins/frontend-fundamentals)를 반드시 사용합니다. 이 플러그인은 코드 리뷰에만 쓰지 않고 구현·수정·리팩터링·검증 전 과정에 적용합니다. 먼저 [`skills/frontend-fundamentals/SKILL.md`](../../plugins/frontend-fundamentals/skills/frontend-fundamentals/SKILL.md)를 읽고, 그 안에서 지정한 Toss 원본 skill 4개를 모두 읽습니다.
- route는 `src/app`, 화면 조각은 기능별 `src/components`, 재사용 상태는 `src/hooks`, 순수 함수와 API 조회는 `src/lib`에 둡니다.
- 도메인 타입·검증은 공유 패키지를 먼저 확인하고, 서버 전용 코드가 브라우저 번들로 들어가지 않게 합니다.
- 접근성, 로딩·오류·빈 상태, 모바일·키보드 동작을 기본 완료 조건으로 봅니다.

## 반드시 사용할 지침

- Next.js 최신 문서 선행 확인: 위 생성 블록과 `apps/web/node_modules/next/dist/docs/`
- 구조와 폴더 예시: [`docs/agents/web/architecture.md`](../../docs/agents/web/architecture.md)
- Toss Frontend Fundamentals Codex plugin: [`plugins/frontend-fundamentals`](../../plugins/frontend-fundamentals)

그 외 스킬은 요청 목적과 변경 범위에 맞을 때 선택합니다. 새 라이브러리를 추가하기 전에 기존 의존성과 브라우저 기본 기능을 먼저 확인합니다.
