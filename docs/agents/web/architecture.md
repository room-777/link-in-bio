# Web architecture reference

`apps/web`은 Vinext 기반의 Next 호환 `src/app` 구조입니다. 프레임워크 동작은 현재 `vinext` 버전과 `apps/web/vite.config.ts`를 기준으로 판단합니다. 폴더는 실제 책임이 생길 때만 추가합니다.

## 전체 구조

```text
apps/web/
├── src/app/                    # URL, layout, metadata, route-level 상태
│   ├── layout.tsx              # 전역 HTML·provider·공통 layout
│   ├── page.tsx                # 홈 route
│   ├── [username]/              # 공개 resume·writing route
│   ├── write/                   # 작성 route
│   └── setting/                 # 설정 route
├── src/features/               # 새 기능의 UI·상태·요청을 함께 관리
│   └── <domain>/<feature>/
│       ├── components/
│       ├── hooks/
│       ├── state/
│       ├── queries/            # query key와 apiClient 호출
│       └── mutations/          # mutation별 apiClient 호출
├── src/components/             # 아직 이전하지 않은 기능 UI와 공용 UI
├── src/hooks/                  # 아직 이전하지 않은 client 상태와 상호작용
├── src/query/                  # 아직 이전하지 않은 query
├── src/lib/                    # 공용 함수·API client·서버 전용 helper
│   └── server/                 # client import 금지, 서버에서만 import
└── public/                     # 정적 파일

packages/
├── ui/                         # 앱 간 공유 UI와 스타일
├── resume/                     # resume 도메인 타입·schema·변환
├── auth/                       # Better Auth 조립과 공유 타입
└── env/                        # 환경 변수 검증
```

## 폴더별 기준

### `src/app`

URL, route-level composition, metadata를 둡니다. 데이터 조회가 필요한 Server Component는 feature의 query를 호출하고, 화면은 `features/<domain>/<feature>`로 위임합니다. `loading.tsx`, `error.tsx`, `not-found.tsx`는 route 상태를 표현할 때 함께 둡니다.

```tsx
import { ResumePage } from "@/features/resume/public/components/resume-page";
import { getPublicResume } from "@/features/resume/public/queries/public-resume";

export default async function Page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <ResumePage resume={await getPublicResume(username)} />;
}
```

### `src/features/<domain>/<feature>`

새 기능에서 함께 바뀌는 화면·상태·요청 코드를 가까이 둡니다. query와 mutation은 기능 파일로 나누고, 서버 요청은 해당 파일 안에서 `apiClient`로 보냅니다. query key도 query 파일에서 정의합니다. 폴더를 기술 종류별로 앱 전체에 흩뜨리지 않습니다.

### 기존 `src/components`, `src/hooks`, `src/query`

기존 기능은 한 번에 옮기지 않습니다. 선택한 기능을 수정할 때 해당 범위 안에서 `src/features`로 옮기고, 남은 기존 폴더는 점진적으로 정리합니다. 공용 UI와 도메인에 속하지 않는 helper는 기존 공유 위치에 둡니다.

### `src/hooks`

기존 client 상태와 상호작용 로직을 둡니다. 새 기능의 전용 상태와 hook은 해당 feature 안에 둡니다. 단 한 component에서만 쓰는 짧은 로직은 hook으로 포장하지 않습니다.

### `src/lib`

공용 순수 함수, API client, 서버 전용 helper를 둡니다. `src/lib/server`는 서버 전용으로 유지하고 client component에서 import하지 않습니다. 기능별 API 요청과 query 정의는 feature의 `queries` 또는 `mutations`에 둡니다. fetch 오류를 삼키지 말고 호출자가 loading/error 상태를 표현할 수 있게 합니다.

### `packages/*`

두 앱이 실제로 공유하는 타입·schema·UI·환경 검증만 이동합니다. 한 곳에서만 쓰는 코드를 성급히 shared package로 만들지 않습니다. API 계약이 바뀌면 server와 web의 호출부를 함께 확인합니다.

## 기본 데이터 흐름

```text
Vinext route (Server Component)
  → feature query 또는 server API client
  → Hono server
  → shared package 타입·schema
  → UI component
  → client hook (입력·mutation·optimistic state가 필요할 때만)
```

`use client` 경계에서는 serializable props만 전달합니다. auth·DB·secret·서버 전용 환경 변수는 브라우저에 보내지 않습니다. 새 기능은 loading, error, empty, success 상태와 키보드·작은 화면 동작을 함께 확인합니다.

## 웹 테스트 정책

`apps/web` 테스트 파일은 모두 제거했으며, 앞으로도 테스트 파일을 작성하거나 수정하지 않습니다. 검증은 `check-types`, build, 필요한 route 실행, 브라우저 확인으로 합니다. 테스트가 필요한 순수 도메인 로직은 먼저 `packages/*` 또는 서버 책임인지 판단하고, 범위를 바꾸기 전에 사용자에게 확인합니다.
