---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---
# 규칙 — 폴더 구조와 의존 방향

> 구조를 정하는 문서는 **`04_uss_admin_frontend_spec.md §4`** 다. 전체 트리와 파일 목록은 거기서 Read 한다.
> 이 파일에는 **넘으면 안 되는 경계**만 적는다. 04 와 어긋나 보이면 04 가 맞다.

## 폴더 책임과 의존 방향 (한 방향으로만 흐른다)
```
app/      부트스트랩·라우터·프로바이더   → pages, shared 참조
pages/    라우트별 얇은 페이지          → features, shared 참조
features/{domain}/  도메인 로직(api·schemas·queries·components)  → shared 만 참조
shared/   도메인과 무관한 공용          → 외부 라이브러리만 참조
```

## 넘으면 안 되는 경계 (uss-contract-lint 가 잡는다)
- `features/{a}` 가 `features/{b}` 를 **직접 import 하지 않는다.** 둘 다 필요하면 `shared/` 로 올린다.
- 아래 레이어가 위 레이어를 import 하지 않는다(`shared` → `features` 금지).
- import 는 **`@/` 절대경로만.** 상대경로(`../../`)를 쓰지 않는다.

## 파일 이름 (04 §4-2)
- 컴포넌트 `PascalCase.tsx` · 훅 `useXxx.ts` · 유틸 `camelCase.ts`
- 타입 `types.ts` · Zod 스키마 `schemas.ts` · API 호출 `api.ts` · **쿼리 훅과 키 `queries.ts`**
- 상수는 값이면 `UPPER_SNAKE_CASE`, 객체면 `camelCase`

> ⚠️ 쿼리 훅 파일은 `queries.ts` 다. `hooks.ts` 가 아니다(`04 §4`).

## 도메인은 3개뿐이다
```
features/auth/       로그인·토큰·관리자 이름
features/semester/   표시 학기 조회·변경 (M1)
features/sync/       적재 현황·preflight·Job 생성·이력·상세·진행률 폴링
```
> Gravit 의 `users`·`reports`·`chapters`·`staging`·`notices`·`inquiries` 는 **USS 에 없다.** 만들지 않는다.

## 공통 인프라 위치 (04 §4, §6)
- `shared/api/`
  - `client.ts` — **axios 인스턴스 1개**(`apiClient`). ⚠️ Gravit 처럼 `authApiClient` 를 따로 두지 않는다. `/auth/refresh` 도 base(`/api/v1/admin`)가 같고 헤더만 다르다.
  - `tokenManager.ts` — **access 토큰과 `name` 만** 보관한다. refresh 토큰 저장소가 없다.
  - `refreshQueue.ts` — 401 이 나면 재발급을 **동시에 1건만** 보낸다(만료된 토큰을 `access-token` 헤더에 실어 `/auth/refresh` 1회).
  - `errorHandler.ts` — `{ code: number, message }` 를 토스트 문구로 옮긴다.
  - `types.ts` — `PaginatedResponse<T>`, `ErrorResponse`.
- `features/auth/` — `api.ts` · `schemas.ts` · `queries.ts` · `store.ts`(Zustand) · `types.ts`
- `shared/constants/` — `routes.ts` · `labels.ts`(enum 한글 매핑: `CourseTerm`·`SyncPhase`·`SyncStrategy`·`SyncJobStatus`·`changedFields.field`) · `errorCodes.ts`(정수 코드 상수) · `badgeVariants.ts` · `fieldLimits.ts`(loginId 50 / password 100)
- `shared/lib/` — `cn.ts` · `formatDateTime.ts`(**KST 문자열을 잘라 쓴다. `new Date()` 로 파싱하지 않는다**) · `formatNumber.ts`(천단위 콤마) · `formatDuration.ts`(초 → `HH:mm:ss`)

## 관리자 이름은 어디서 오나
- `POST /auth/login` 과 `POST /auth/refresh` 응답이 **`{ accessToken, name }`** 을 같이 준다(`03 §3-1, §3-2`). `/admin/me` 는 **없다.**
- `features/auth/store.ts` 가 `name` 을 들고 있고 헤더 오른쪽에 표시한다. 새로고침한 뒤에는 `/auth/refresh` 를 한 번 불러 되살린다.

관련: [[good-patterns]] · [[antipatterns]] · [[api-contract]]
