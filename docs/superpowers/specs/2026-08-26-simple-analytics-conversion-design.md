# Simple Analytics 전환 지표 설계

## 목표

공개 화면을 방문한 사용자가 신규 계정을 만들고 첫 페이지를 생성하는 흐름을 Simple Analytics에서 집계한다. 유입 경로별 가입·활성화 기여도도 확인하되, 사용자 ID를 저장하지 않는 집계형 분석으로 범위를 제한한다.

## 확정 범위

- 기존 Simple Analytics pageview 수집을 유지한다.
- 가입 완료는 Better Auth에서 신규 사용자 레코드가 생성된 뒤 기록한다.
- 첫 페이지 생성은 첫 페이지 생성 요청이 성공한 뒤 기록한다.
- 이벤트는 Simple Analytics 대시보드와 Goals에서 확인한다.
- 첫 방문 경로를 세션 쿠키로 보관하고 이벤트 metadata의 `entry_route`로 전달한다.
- 이메일, 사용자 ID, 페이지 ID, 원문 URL query를 분석 데이터에 넣지 않는다.
- 분석 전송 실패가 인증·페이지 생성 결과에 영향을 주지 않게 한다.

## 제외 범위

- 분석 전용 DB, outbox, 재처리 큐
- Grabbin 내부 관리자 분석 화면
- 사용자별 정확한 퍼널 연결
- 기능 사용률 이벤트의 일괄 추가
- Simple Analytics 원본 데이터 복제

기능 사용률은 이번 전환 지표를 먼저 운영한 뒤, 같은 함수 계약으로 실제 제품 질문이 정해진 기능부터 추가한다.

## 현재 상태

`apps/web`은 `data-auto-collect="false"`로 Simple Analytics를 로드하고 `sa_pageview`를 수동 호출한다. 공개 핸들 페이지는 `page.id` 기반의 안정 경로도 별도로 기록하며, 공개 views 숫자는 서버에서 Stats API로 조회한다. 현재 가입·첫 페이지 생성 이벤트를 공통 함수로 보내는 구조는 없다.

## 지표 정의

### 전체 지표

| 지표 | 계산 | 의미 |
| --- | --- | --- |
| 가입 전환율 | `signup_completed / 전체 사이트 고유 방문자` | 실제 화면 방문 대비 신규 계정 생성 비율 |
| 활성화율 | `first_page_created / signup_completed` | 신규 계정이 첫 페이지까지 만든 비율 |
| 전체 활성화율 | `first_page_created / 전체 사이트 고유 방문자` | 방문 대비 첫 페이지 생성 비율 |

전체 사이트 고유 방문자는 같은 기간의 production pageview 집계에서 읽는다. 이는 같은 사용자를 이벤트와 연결한 값이 아니므로 정확한 개인별 퍼널이 아니라 기간 집계 전환율이다.

### 경로별 기여도

`entry_route`별 이벤트 수와 전체 이벤트 중 비율을 확인한다.

- 경로별 가입 기여도 = 해당 `entry_route`의 `signup_completed` 수 / 전체 `signup_completed` 수
- 경로별 활성화 기여도 = 해당 `entry_route`의 `first_page_created` 수 / 전체 `first_page_created` 수

경로별 고유 방문자와 동일 사용자를 연결하지 않으므로 경로별 정확한 전환율은 제공하지 않는다.

## 이벤트 계약

이벤트 이름은 소문자와 밑줄만 사용한다.

| 이벤트 | 발생 조건 | 중복 기준 | metadata |
| --- | --- | --- | --- |
| `signup_completed` | Better Auth 신규 사용자 생성 후 훅 실행 | 사용자 레코드 생성 1회 | `entry_route` |
| `first_page_created` | 첫 페이지 생성 트랜잭션 성공 후 응답 준비 | 사용자의 첫 페이지 1회 | `entry_route` |

이벤트 전송 자체는 best effort다. 이벤트가 Simple Analytics에 도착하지 않아도 원래 작업은 성공 상태를 유지한다.

## 유입 경로

첫 번째 실제 화면 방문 때만 세션 쿠키 `grabbin_entry_route`를 설정한다. 이미 값이 있으면 덮어쓰지 않는다. 운영 환경에서만 `Secure`, `SameSite=Lax`, `Path=/`를 사용하고, 프론트엔드와 API가 같은 상위 도메인을 사용하는 현재 인증 구조에 맞춰 전달한다.

경로는 분석용 그룹으로 정규화한다.

| 원래 경로 | `entry_route` |
| --- | --- |
| `/` | `home` |
| `/pricing` | `pricing` |
| `/blog/*` | `blog` |
| `/demo` | `demo` |
| `/log-in` | `login` |
| `/new` | `new` |
| `/{handle}` | `public_handle` |
| 그 밖의 실제 화면 | `other` |

API·정적 파일은 현재 pageview tracker의 화면 경로 수집 대상이 아니므로 제외된다. 쿠키가 없거나 값이 검증되지 않으면 `other`로 기록한다.

## 구조

### 브라우저 함수 모듈

`apps/web/lib/analytics/simple-analytics.ts`를 Simple Analytics 브라우저 경계로 둔다.

- `trackSimpleAnalyticsPageview(path)`
- `trackSimpleAnalyticsEvent(name, metadata)`
- `getEntryRoute(pathname)`
- `rememberEntryRoute(pathname)`

현재 상태를 보관할 이유가 없으므로 별도 React Hook은 만들지 않는다. `SimpleAnalyticsTracker`는 위 함수를 import해 pageview와 첫 방문 경로를 관리한다. 이후 기능 이벤트도 각 컴포넌트에서 `window.sa_event`를 직접 호출하지 않고 이 함수만 import한다.

### 서버 함수 모듈

`apps/server/src/services/simple-analytics.service.ts`를 서버 전송 경계로 둔다.

- `trackSimpleAnalyticsEvent({ event, entryRoute, request, executionCtx })`
- production hostname 확인
- `entry_route` 허용값 정규화
- Simple Analytics queue payload 구성
- 사용자 에이전트와 이벤트 metadata 전달
- 전송 오류 기록 및 무시

브라우저 모듈과 서버 모듈은 `window`와 서버 전용 요청이 섞이지 않도록 분리한다. 공통 범용 분석 클래스는 만들지 않는다.

### 호출 위치

- `apps/web/lib/simple-analytics-tracker.tsx`: 브라우저 함수 모듈을 사용해 기존 pageview와 첫 방문 경로를 처리한다.
- `apps/server/src/core/auth.options.ts`: Better Auth `databaseHooks.user.create.after`에서 `signup_completed`를 전송한다. 신규 사용자 생성이 끝난 뒤 실행되며, 기존 로그인에는 실행되지 않는다.
- `apps/server/src/controllers/pages.controller.ts`: 생성 전 사용자의 `primaryPageId`가 비어 있고 페이지 생성이 성공한 경우 `first_page_created`를 전송한다.
- `apps/web/lib/server/public-views.ts`: 기존 공개 views Stats API 동작은 변경하지 않는다.

서버 이벤트는 기존 Cloudflare `waitUntil` 백그라운드 작업으로 보낸다. 이벤트 전송을 기다리느라 인증·페이지 생성 응답이 늦어지지 않게 한다.

## 데이터 흐름

```text
실제 화면 방문
  -> browser analytics function
  -> Simple Analytics pageview
  -> grabbin_entry_route 세션 쿠키

신규 계정 생성 성공
  -> Better Auth user.create.after
  -> server analytics function
  -> Simple Analytics event: signup_completed

첫 페이지 생성 성공
  -> pages controller
  -> server analytics function
  -> Simple Analytics event: first_page_created
```

두 서버 이벤트 모두 요청의 `grabbin_entry_route`를 읽고 `entry_route` metadata로 정규화한다. 페이지 컨트롤러는 현재 요청에서 직접 쿠키를 읽고, Better Auth 신규 사용자 훅은 현재 `apps/server/src/core/auth.ts`의 `AsyncLocalStorage` 요청 경계를 통해 인증 요청 헤더를 읽는다. 서버 전송 payload에는 이벤트 이름, 사이트 hostname, 요청 user agent, 허용된 metadata만 포함한다.

## 오류와 한계

- Simple Analytics queue가 실패하거나 응답이 비정상이면 경고 로그만 남기고 원래 응답을 유지한다.
- 네트워크 실패 시 이벤트는 유실될 수 있다. 현재 목표가 집계 추세 확인이므로 durable outbox/retry는 추가하지 않는다.
- 세션 쿠키가 없는 방문자는 `other`로 기록된다.
- 사용자 ID를 저장하지 않으므로 동일 사용자의 방문·가입·페이지 생성을 정확히 연결하지 않는다.
- 경로별 이벤트 기여도는 볼 수 있지만, 경로별 고유 방문자 기반 전환율은 이번 범위에서 계산하지 않는다.
- 운영 hostname이 아닌 환경에서는 전송하지 않아 테스트 데이터가 production 대시보드에 섞이지 않게 한다.

## 대시보드 사용

Simple Analytics에서 다음을 만든다.

1. `signup_completed` 이벤트 Goal
2. `first_page_created` 이벤트 Goal
3. Events Explorer에서 `entry_route` metadata 필터
4. 같은 기간의 전체 pageview visitors와 이벤트 수 비교

기간을 바꿀 때 모든 값에 같은 날짜 범위를 사용한다. 결과를 “사용자 단위 퍼널”로 표현하지 않고 “기간 집계 전환율”로 표시한다.

## 검증 기준

### 브라우저 및 서버 검증

- **Given** production 공개 화면을 처음 방문했을 때, **When** 경로가 기록되면, **Then** pageview와 허용된 `grabbin_entry_route`가 한 번만 생성된다.
- **Given** 신규 사용자가 OTP로 인증했을 때, **When** Better Auth가 사용자를 생성하면, **Then** `signup_completed`가 한 번 전송된다.
- **Given** 신규 사용자가 소셜 로그인으로 인증했을 때, **When** Better Auth가 사용자를 생성하면, **Then** 같은 이벤트가 한 번 전송된다.
- **Given** 기존 사용자가 로그인했을 때, **When** 세션이 생성되면, **Then** `signup_completed`가 전송되지 않는다.
- **Given** 첫 페이지 생성 요청이 성공했을 때, **When** 응답이 준비되면, **Then** `first_page_created`가 한 번 전송된다.
- **Given** 두 번째 페이지 생성 또는 실패 요청일 때, **When** 요청이 처리되면, **Then** `first_page_created`가 전송되지 않는다.
- **Given** Simple Analytics 전송이 실패했을 때, **When** 인증·페이지 생성이 완료되면, **Then** 원래 기능은 성공하고 경고 로그만 남는다.
- **Given** 이벤트 payload를 확인했을 때, **Then** 이메일·사용자 ID·페이지 ID가 없고 `entry_route`가 허용값 중 하나다.

프론트엔드 자동 테스트는 추가하지 않는다. 서버의 경로 정규화와 첫 페이지 조건은 기존 서버 테스트 방식으로 좁게 검증하고, OTP·소셜·기존 로그인·페이지 생성은 실제 브라우저 QA로 확인한다.

## 공식 문서

- [Simple Analytics Events](https://docs.simpleanalytics.com/events)
- [Simple Analytics Stats API](https://docs.simpleanalytics.com/api/stats)
- [Simple Analytics Server-side Events](https://docs.simpleanalytics.com/events/server-side)
- [Better Auth Hooks](https://better-auth.com/docs/beta/concepts/hooks)
- [Better Auth Database Hooks](https://better-auth.com/docs/concepts/database)
