# Web Agent Rules

루트 [`/AGENTS.md`](../../AGENTS.md)의 공통 규칙을 따릅니다. 이 앱은 Vinext 기반이며 Next 호환 `src/app` 구조를 사용합니다. 프레임워크 동작은 현재 `vinext` 버전과 `vite.config.ts`를 기준으로 판단합니다.

## 필수 규칙

- 서버 컴포넌트와 클라이언트 컴포넌트의 경계를 먼저 정하고, 필요한 파일에만 `use client`를 붙입니다.
- `apps/web`에는 테스트 코드를 새로 작성하거나 기존 테스트를 수정하지 않습니다. 동작 확인은 타입 검사·빌드·브라우저 또는 실행 확인으로 남깁니다.
- 코드 품질 판단이 필요한 웹 작업은 저장소의 Codex plugin [`plugins/frontend-fundamentals`](../../plugins/frontend-fundamentals)를 사용합니다. 먼저 [`skills/frontend-fundamentals/SKILL.md`](../../plugins/frontend-fundamentals/skills/frontend-fundamentals/SKILL.md)를 router로 읽고, 변경과 관련된 category skill과 하위 reference만 선택해서 읽습니다. 단순한 문구·오타 수정에는 관련 없는 기준을 억지로 읽지 않습니다.
- route는 `src/app`, 화면 조각은 기능별 `src/components`, 재사용 상태는 `src/hooks`, 순수 함수와 API 조회는 `src/lib`에 둡니다.
- 도메인 타입·검증은 공유 패키지를 먼저 확인하고, 서버 전용 코드가 브라우저 번들로 들어가지 않게 합니다.
- 접근성, 로딩·오류·빈 상태, 모바일·키보드 동작을 기본 완료 조건으로 봅니다.

구조 예시는 [`docs/agents/web/architecture.md`](../../docs/agents/web/architecture.md)를 필요할 때 읽습니다. 새 라이브러리를 추가하기 전에 기존 의존성과 브라우저 기본 기능을 먼저 확인합니다.
