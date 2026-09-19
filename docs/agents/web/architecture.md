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
├── src/components/             # 화면 책임을 가진 기능별 UI
│   ├── auth/                   # 로그인·프로필·인증 UI
│   ├── layout/                 # header·loader·theme
│   ├── landing/                # 홈 섹션
│   ├── resume/                 # resume 표시·편집, 섹션별 하위 폴더
│   ├── writing/                # 글 목록·에디터·발행
│   ├── settings/               # 계정·결제·프로필 설정
│   └── provider/               # React Query 등 전역 provider
├── src/hooks/                  # client 상태와 반복되는 상호작용
├── src/lib/                    # 순수 함수·API client·query·서버 전용 helper
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

URL과 route-level composition만 둡니다. 데이터 조회가 필요한 Server Component는 여기서 query를 호출하고, 복잡한 화면은 `components/<feature>`로 위임합니다. `loading.tsx`, `error.tsx`, `not-found.tsx`, metadata는 route의 실제 상태를 표현할 때 함께 둡니다.

```tsx
import { ResumePage } from "@/components/resume/resume-page";
import { getPublicResume } from "@/lib/queries/resume";

export default async function Page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <ResumePage resume={await getPublicResume(username)} />;
}
```

### `src/components/<feature>`

한 기능의 화면·폼·상태 표시를 함께 둡니다. 큰 중앙 component에 모든 분기를 넣지 말고 `resume/profile`, `resume/contact`처럼 함께 바뀌는 파일을 가까이 둡니다. 기존 `@between-cv/ui` primitive를 먼저 확인합니다.

### `src/hooks`

브라우저 이벤트·mutation·로컬 상태처럼 client에서만 필요한 반복 로직을 둡니다. 단 한 component에서만 쓰는 짧은 로직은 hook으로 포장하지 않습니다. 서버 데이터의 기준값은 React Query와 query 함수의 계약을 따릅니다.

### `src/lib`

순수 함수, API client, query 함수, 도메인 변환을 둡니다. `src/lib/server`는 서버 전용으로 유지하고 client component에서 import하지 않습니다. fetch 오류를 삼키지 말고 호출자가 loading/error 상태를 표현할 수 있게 합니다.

### `packages/*`

두 앱이 실제로 공유하는 타입·schema·UI·환경 검증만 이동합니다. 한 곳에서만 쓰는 코드를 성급히 shared package로 만들지 않습니다. API 계약이 바뀌면 server와 web의 호출부를 함께 확인합니다.

## 기본 데이터 흐름

```text
Vinext route (Server Component)
  → src/lib/queries 또는 server API client
  → Hono server
  → shared package 타입·schema
  → UI component
  → client hook (입력·mutation·optimistic state가 필요할 때만)
```

`use client` 경계에서는 serializable props만 전달합니다. auth·DB·secret·서버 전용 환경 변수는 브라우저에 보내지 않습니다. 새 기능은 loading, error, empty, success 상태와 키보드·작은 화면 동작을 함께 확인합니다.

## 웹 테스트 정책

`apps/web` 테스트 파일은 모두 제거했으며, 앞으로도 테스트 파일을 작성하거나 수정하지 않습니다. 검증은 `check-types`, build, 필요한 route 실행, 브라우저 확인으로 합니다. 테스트가 필요한 순수 도메인 로직은 먼저 `packages/*` 또는 서버 책임인지 판단하고, 범위를 바꾸기 전에 사용자에게 확인합니다.
