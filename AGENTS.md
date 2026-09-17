이 파일은 저장소 전체에 적용되는 기본 규칙입니다. Codex는 작업을 시작하기 전에 루트에서 현재 작업 폴더까지의 `AGENTS.md`를 읽고, 더 가까운 파일의 지시를 우선합니다. 이 방식은 공식 문서의 `AGENTS.md` 탐색·병합 규칙을 따른 것입니다.

## 작업 경로

- 서버 작업 전 [`apps/server/AGENTS.md`](apps/server/AGENTS.md)를 읽습니다.
- 웹 작업 전 [`apps/web/AGENTS.md`](apps/web/AGENTS.md)를 읽습니다.
- 상세 구조와 예시는 `docs/agents/server/`, `docs/agents/web/`의 reference를 필요할 때 읽습니다.

## 저장소 공통 규칙

- 현재 코드와 사용 중인 패턴을 먼저 읽고, 이미 있는 타입·유틸·UI를 우선 재사용합니다.
- 요청 범위 밖의 파일과 사용자의 기존 변경을 건드리지 않습니다.
- 서비스에 노출되는 문구는 모두 영어로 작성합니다. 검증 메시지, API 오류 메시지, 로그와 UI 문구에도 같은 규칙을 적용합니다.
- 신뢰 경계의 입력 검증, 권한 확인, 오류 처리, 접근성 기본 동작은 생략하지 않습니다.
- 변경 후 영향받은 범위에 맞는 타입 검사·빌드·테스트 또는 실행 확인을 하고, 실행하지 못한 검증은 이유를 기록합니다.
- `apps/web`에는 테스트 코드를 새로 작성하지 않으며, 서버 변경에는 필요한 테스트를 작성합니다.
- 배포·마이그레이션·외부 서비스 호출은 명시적으로 요청된 경우에만 수행합니다.

## 앱별 규칙

| 영역 | 지침 | 상세 reference |
| --- | --- | --- |
| server | 테스트 필수, Hono 중심 API | [`server/architecture.md`](docs/agents/server/architecture.md), [`server/testing.md`](docs/agents/server/testing.md) |
| web | 새 테스트 금지, Next.js 최신 문서 선행 확인, Frontend Fundamentals 적용 | [`web/architecture.md`](docs/agents/web/architecture.md), [`frontend-fundamentals`](plugins/frontend-fundamentals/skills/frontend-fundamentals/SKILL.md) |

공식 참고: [Codex `AGENTS.md` 문서](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
