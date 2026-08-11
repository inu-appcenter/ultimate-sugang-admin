---
paths:
  - "src/features/**/api.ts"
  - "src/features/**/schemas.ts"
  - "src/shared/api/**/*.ts"
  - "src/mocks/**/*.ts"
---
# 규칙 — API 계약 지키기

> 근거는 `03_uss_admin_api_spec.md` 다. 엔드포인트·필드·응답은 **반드시 거기서 확인한다.** 여기에는 바뀌지 않는 규칙과 공통 형태만 적는다.
> ⚠️ **틀리기 쉬운 곳이 많다.** §0 을 먼저 읽는다.

## 0. 가장 흔한 오답

아래는 전부 uss-contract-lint 가 잡지만, 애초에 쓰지 않는 편이 빠르다.

| 항목 | ❌ 쓰지 말 것 | **USS (✅ 정답)** |
|---|---|---|
| 인증 헤더 | `Authorization: Bearer {t}` | **`access-token: {t}`** |
| 토큰 구조 | access + refresh, Rotation, Redis | **access 하나. refresh 없음** |
| 로그아웃 | `POST /auth/logout` (204) | **엔드포인트 없음** |
| 에러 `code` | 문자열 `USER_NOT_FOUND` | **정수 `5200`** |
| 페이지 크기 | 20 | **10** |
| datetime | ISO 8601 UTC (`...Z`) | **`"2026-08-05T14:22:00"` (KST, `Z` 없음)** |
| 로그인 | OAuth idToken | **loginId + password** |
| 로그인 응답 | `{ accessToken, refreshToken }` | **`{ accessToken, name }`** |

## 반드시 지키는 것
- 명세에 **없는 엔드포인트·필드·쿼리를 만들지 않는다.** 필요해 보이면 멈추고 묻는다(🙋🏻). → [[source-of-truth]]
- 모든 응답은 **Zod 로 파싱한 뒤** 쓴다. `any` 나 캐스팅으로 넘어가지 않는다. 스키마는 `features/{domain}/schemas.ts`.
- Base URL 은 `{API_HOST}/api/v1/admin`. `/auth/login` 과 `/auth/refresh` 를 뺀 나머지는 전부 `role=ADMIN` 토큰이 필요하다.

## 공통 응답 형태 (03 §2)
- 페이지네이션 `{ page, totalPages, hasNextPage, content: T[] }`. `page` 는 **1부터** 센다. 한 페이지는 **10건 고정**이고 서버가 정한다(`size` 파라미터가 없다).
- 에러 `{ code: number, message: string }`. 토스트에는 `message` 를 먼저 보여준다. → [[good-patterns]]
- 상태코드: 200 성공 / **202 Job 생성** / 400 검증 / 401 인증 / 403 관리자 아님 / 404 없음 / **409 이미 실행 중이거나 전략이 어긋남** / 5xx 서버. **204 를 쓰는 엔드포인트는 없다.**
- datetime 은 오프셋이 없는 KST 문자열이다. **클라이언트에서 UTC 로 바꾸지 않는다.**

## 엔드포인트 — 이 9개가 전부다
```
POST /auth/login              POST /auth/refresh
GET  /semesters/display       PUT  /semesters/display
GET  /courses/summary
POST /sync/preflight          POST /sync/jobs
GET  /sync/jobs               GET  /sync/jobs/{id}      GET /sync/jobs/{id}/details
```
> `/auth/logout` 은 **없다.** `/admin/me` 도 **없다** — 관리자 이름은 `/auth/login`·`/auth/refresh` 응답의 **`name`** 으로 받는다(`{ accessToken, name }`).
> 이 목록은 `hooks/checks/uss-contract-lint.mjs` 에도 그대로 들어 있다. 목록을 바꾸면 두 곳을 같이 고친다.

## Enum (03 §8) — 값을 더하거나 바꾸지 않는다
- `CourseTerm`: `FIRST`(10)·`SECOND`(20)·`SUMMER`(30)·`WINTER`(40). ⚠️ **코드 숫자로 정렬하면 틀린다**(여름 30 > 2학기 20). 보여주는 순서는 `1학기 → 여름계절 → 2학기 → 겨울계절`.
- `SyncStrategy`: `INITIAL`·`UPSERT`·`REPLACE`
- `SyncJobStatus`: `RUNNING`·`SUCCESS`·`FAILED` (중간 상태를 만들지 않는다 → [[decisions]] D11)
- `SyncChangeType`: `CREATED`·`UPDATED`·`CLOSED`·`WARNING`
- `SyncPhase`: `COURSE_FETCH`·`TIMETABLE_FETCH`·`PERSIST`
- `CourseStatus`: `ACTIVE`·`CLOSED`

## nullable — 스키마에 그대로 반영한다
- `courses/summary`: `semester`·`lastJob`·`runningJobId` 가 전부 **nullable**.
- Job 카운트 4종(`createdCount`/`updatedCount`/`closedCount`/`warningCount`): `SUCCESS` 가 **아니면 `null`** (화면에는 `-`).
- `progress`: `RUNNING` 일 때만 값이 있다. 필드는 **`phase` 하나뿐**이다 — `current`/`total` 은 없다.
- `changedFields`: `changeType=UPDATED` 일 때만 값이 있다. `reason` 은 `WARNING` 일 때만. `courseName` 은 `WARNING` 에서 `null` 일 수 있다.
- ❌ `nullable` 을 `optional` 로 대충 바꾸거나 `?? 0` 으로 덮지 않는다. `null` 과 `0` 은 뜻이 다르다(아직 정해지지 않음 vs 없음).

## 409 두 가지 (03 §6-2)
- `5200`(이미 실행 중) → 토스트를 띄우고 `courses/summary` 를 다시 부른다.
- `5201`(전략이 어긋남) → 모달을 닫고 토스트를 띄운 뒤 `courses/summary` 를 다시 부른다. 관리자는 M2 부터 다시 시작한다. **자동으로 재시도하지 않는다.**

## 토큰 (03 §2-2, §3)
- access 토큰은 **2시간** 유효하고 `access-token` 헤더로 보낸다. 401 이 오면 `/auth/refresh` 를 **한 번** 부르고(만료된 토큰을 헤더에 그대로 실어 보낸다), 그래도 실패하면 `/login` 으로 보낸다.
- refresh 토큰이 없으므로 **Rotation·화이트리스트·이중 저장 같은 코드가 있으면 안 된다.**

관련: [[decisions]] · [[architecture]] · [[good-patterns]]
