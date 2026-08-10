# USS 백오피스 API 명세서

> USS(모의 수강신청 서비스) 학사과용 백오피스가 호출하는 모든 백엔드 API의 계약이다.
> 이 문서가 **API 계약**을 정한다. 화면·동작은 `01_uss_admin_wireframe_spec.md`, 프론트 통합은 `04`, 시각 토큰은 `DS-01` 을 따른다.

---

## 1. 개요

### 1-1. 사용 클라이언트

USS 백오피스. 학사과 담당자(수 명)용 관리 도구. 데스크톱 전용.

### 1-2. 범위

| 포함 | 제외 |
|---|---|
| 백오피스가 호출하는 모든 엔드포인트 | 학생 앱이 호출하는 기존 엔드포인트 |
| 요청·응답 필드와 타입 | 학교 API(INTIP) 연동 상세 |
| HTTP 상태 코드·에러 코드 | DB 스키마 전체 설계 |
| 인증·권한 정책 | 배포·인프라 구성 |
| 응답 필드에 직접 관여하는 스키마 변경 (10장) | 프론트엔드 구현 방식 |

### 1-3. 설계 전제 (D1~D12, 재논의 대상 아님)

| # | 결정 | 본 문서에서의 발현 |
|---|---|---|
| D1 | 항상 전량 수집 | 요청 파라미터에 증분 커서 없음. 대상 학기만 지정 |
| D4 | 적재 전략은 **서버가 판정** | 클라이언트는 전략을 결정하지 않는다. `expectedStrategy`는 **검증용**이며 판정 근거가 아니다 |
| D6 | 관리자 계정·토큰 분리 | 학생용 `/api/v1/auth/*`와 별개의 `/api/v1/admin/auth/*` |
| D10 | 표시 학기와 데이터 적재는 독립 | 4장과 6장은 서로를 트리거하지 않는다 |
| D11 | 미리보기 미채택 | Job 상태는 RUNNING → SUCCESS 또는 FAILED |
| D12 | enum 미매핑은 경고 | Job을 실패시키지 않고 `changeType = WARNING`으로 수집 |

---

## 2. 공통 사양

### 2-1. Base URL

```
{API_HOST}/api/v1/admin
```

### 2-2. 인증

| 항목 | 값 |
|---|---|
| 방식 | JWT |
| 헤더 | **`access-token: {accessToken}`** (기존 `JwtAuthenticationFilter`와 동일. `Authorization: Bearer` 아님) |
| accessToken 만료 | **2시간** |
| refreshToken | **없음.** 단일 토큰 구조 |
| 토큰 무효화 | **불가.** 발급된 토큰은 만료 전까지 유효하다 (3-3 참조) |

#### 관리자 토큰 식별

관리자 토큰은 학생 토큰과 **같은 서명 키를 쓰되 claim으로 구분**한다.

```json
{
  "sub": "3",
  "role": "ADMIN",
  "iat": 1786100000,
  "exp": 1786107200
}
```

`/api/v1/admin/**`는 전용 필터에서 `role = ADMIN`을 검증한다. `role` claim이 없거나 `ADMIN`이 아니면 **403 / `5002`**.

#### 인증 미통과 응답

| 상황 | HTTP | code |
|---|---|---|
| `access-token` 헤더 누락 | 401 | `1000` |
| 토큰 만료 | 401 | `1004` |
| 형식 오류 | 401 | `1002` |
| 서명 오류 | 401 | `1003` |
| 그 외 무효 | 401 | `1001` |
| 토큰은 유효하나 관리자 토큰이 아님 | 403 | `5002` |

> 1000번대는 기존 `ExceptionCode`를 그대로 재사용한다. 관리자 전용 토큰 코드를 별도로 만들지 않는다.

### 2-3. Content Type

요청 body가 있으면 `Content-Type: application/json`. 응답 body는 항상 `application/json`.

### 2-4. 페이지네이션

```json
{
  "page": 1,
  "totalPages": 8,
  "hasNextPage": true,
  "content": []
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `page` | number | 현재 페이지 (1부터 시작) |
| `totalPages` | number | 전체 페이지 수 |
| `hasNextPage` | boolean | 다음 페이지 존재 여부 |
| `content` | array | 리소스 배열 |

| 파라미터 | 타입 | 필수 | 기본값 |
|---|---|---|---|
| `page` | number | N | 1 |

> **페이지 크기는 모든 목록 API에서 10 고정**이다. 서버 측 고정값이며 클라이언트가 변경할 수 없다. `size` 파라미터를 제공하지 않는다.

### 2-5. 에러 응답

기존 USS 포맷을 그대로 승계한다. `ErrorResponse` 레코드와 `GlobalExceptionHandler`를 변경하지 않는다.

```json
{
  "code": 5200,
  "message": "이미 진행 중인 업데이트가 있습니다."
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `code` | **number** | `ExceptionCode`에 정의된 정수 코드 |
| `message` | string | 사용자에게 표시 가능한 메시지 |

- 백오피스 전용 코드는 **5000번대**를 신설한다 (9장).
- `status`·`timestamp`·`path`는 본문에 포함하지 않는다. 서버 로그에만 기록한다.
- 요청 검증 실패 시 `MethodArgumentNotValidException` 핸들러가 `code = 400` + 필드별 메시지를 반환하는 **기존 동작을 그대로 따른다.**

#### 공통 HTTP 상태 코드

| 상태 | 의미 |
|---|---|
| `200 OK` | 조회·수정 성공 |
| `202 Accepted` | 비동기 작업 접수 (6-2) |
| `400 Bad Request` | 요청 검증 실패 |
| `401 Unauthorized` | 인증 실패 |
| `403 Forbidden` | 관리자 권한 없음 |
| `404 Not Found` | 리소스 없음 |
| `409 Conflict` | 동시 실행·전략 불일치 |
| `500 Internal Server Error` | 서버 내부 오류 |

> `204 No Content`를 사용하는 엔드포인트는 없다.

### 2-6. 시각 필드 포맷

| 항목 | 확정 내용 |
|---|---|
| 타입 | `LocalDateTime` (기존 엔티티와 동일) |
| 전송 형태 | **`"2026-08-05T14:22:00"`** — ISO 8601 로컬 표기. **오프셋·Z 접미사 없음** |
| 타임존 | **KST(Asia/Seoul)**. 앱 컨테이너·MySQL 모두 `TZ=Asia/Seoul`로 고정돼 있다 |
| 클라이언트 | 별도 변환 없이 그대로 표시한다 |

> UTC 변환을 도입하지 않는다. 운영 타임존이 단일이고, 기존 학생 API 응답과의 불일치를 만들지 않기 위함이다.

### 2-7. 권한

| 엔드포인트 | 요구 |
|---|---|
| `POST /auth/login` | 인증 불필요 |
| `POST /auth/refresh` | 만료된 토큰 허용 (3-2) |
| 그 외 전부 | `role = ADMIN` 토큰 |

---

## 3. 인증 (Auth)

### 3-1. POST `/auth/login` — 관리자 로그인

#### 요청

```http
POST /api/v1/admin/auth/login
Content-Type: application/json
```

```json
{
  "loginId": "haksa01",
  "password": "..."
}
```

| 필드 | 타입 | 필수 | 검증 |
|---|---|---|---|
| `loginId` | string | Y | 최대 50자 |
| `password` | string | Y | 최대 100자 |

#### 응답 — 200 OK

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "name": "김학사"
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `accessToken` | string | 백오피스 API 호출용 JWT |
| `name` | string | `admins.name`. **헤더 우측 표시용** |

> `name` 을 응답에 포함하는 이유: `01 §4` 가 헤더에 관리자 이름 표시를 요구하는데 별도 조회 엔드포인트(`/admin/me`)를 두지 않기 때문이다. 로그인·재발급 양쪽에서 동일하게 내려주므로 클라이언트는 새로고침 후에도 refresh 1회로 복원할 수 있다.

#### 실패

| 상황 | HTTP | code | message |
|---|---|---|---|
| 아이디 없음 **또는** 비밀번호 불일치 | 401 | `5000` | 아이디나 비밀번호가 맞지 않아요. |

> **두 경우를 구분하지 않는다.** 계정 존재 여부가 드러나지 않도록 단일 코드·단일 메시지를 반환한다. 와이어프레임 §5-2의 에러 문구와 일치한다.

> 비밀번호는 BCrypt로 검증한다. 기존 의존성 `org.mindrot:jbcrypt:0.4`를 사용한다.

> 관리자 계정은 API로 생성하지 않는다. Flyway 시드 또는 DB 직접 등록으로 처리한다.

### 3-2. POST `/auth/refresh` — 토큰 재발급

기존 학생용 `POST /api/v1/auth/re-issue`와 **동일한 방식**이다. 만료된 accessToken을 헤더로 받아, 서명이 유효하면 새 토큰을 발급한다.

#### 요청

```http
POST /api/v1/admin/auth/refresh
access-token: {만료되었을 수 있는 accessToken}
```

body 없음.

#### 응답 — 200 OK

```json
{
  "accessToken": "...",
  "name": "김학사"
}
```

3-1 과 **동일한 구조**다. 클라이언트는 재진입 시 이 응답으로 관리자 이름을 복원한다.

#### 실패

| 상황 | HTTP | code |
|---|---|---|
| 헤더 누락 | 401 | `1000` |
| 형식 오류 | 401 | `1002` |
| 서명 오류 | 401 | `1003` |
| 그 외 무효 | 401 | `1001` |
| 토큰의 관리자가 존재하지 않음 | 404 | `5001` |
| `role` claim이 `ADMIN`이 아님 | 403 | `5002` |

> ⚠️ **성질 명시**: 만료 여부를 검사하지 않으므로, 서명이 유효한 토큰을 보유한 클라이언트는 무기한 재발급이 가능하다. 기존 서버가 이미 동일하게 동작하며 일관성을 위해 승계한 것이다. 재발급 상한(`iat` 기준)은 본 버전에서 적용하지 않는다.

### 3-3. 로그아웃 — 엔드포인트 미제공

**`POST /auth/logout`을 제공하지 않는다.**

refreshToken도 화이트리스트도 없으므로 서버가 수행할 무효화 작업이 존재하지 않는다. 엔드포인트를 두면 "서버가 세션을 끊어준다"는 잘못된 기대를 남긴다.

와이어프레임 M5(로그아웃 확인 모달)의 [확인]은 **클라이언트 토큰 폐기 + `/login` 이동**만 수행한다. 서버 호출이 없다.

> 발급된 토큰은 최대 2시간 동안 유효한 채로 남는다. 이는 본 구조의 알려진 한계다.

---

## 4. 표시 학기 (Semesters)

> D10에 따라 본 장의 API는 `courses` 데이터에 **어떤 영향도 주지 않는다.** 프론트 노출용 라벨만 변경한다.

### 4-1. GET `/semesters/display` — 표시 학기 조회

#### 요청

```http
GET /api/v1/admin/semesters/display
access-token: {accessToken}
```

#### 응답 — 200 OK

```json
{
  "academicYear": 2026,
  "term": "SECOND"
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `academicYear` | number | 학년도 (4자리) |
| `term` | string | `FIRST` / `SECOND` / `SUMMER` / `WINTER` |

#### 실패

| 상황 | HTTP | code |
|---|---|---|
| `semester_setting` 행이 없음 | 404 | `5100` |

> `semester_setting`은 **항상 1행만 존재**한다. Flyway 시드로 초기 1행을 보장하므로 정상 운영 중 404는 발생하지 않는다.

### 4-2. PUT `/semesters/display` — 표시 학기 변경

#### 요청

```http
PUT /api/v1/admin/semesters/display
access-token: {accessToken}
Content-Type: application/json
```

```json
{
  "academicYear": 2026,
  "term": "SECOND"
}
```

| 필드 | 타입 | 필수 | 검증 |
|---|---|---|---|
| `academicYear` | number | Y | 4자리 정수 |
| `term` | string | Y | `CourseTerm` enum 값 |

> 연도 선택 범위(현재 연도 ±2)는 **클라이언트 UI 제약**이다. 서버는 4자리 정수 여부만 검증한다.

#### 응답 — 200 OK

변경된 값을 그대로 반환한다 (4-1과 동일 구조).

```json
{
  "academicYear": 2026,
  "term": "SECOND"
}
```

#### 실패

| 상황 | HTTP | code |
|---|---|---|
| `term`이 enum에 없는 값 | 400 | `8888` |
| `academicYear` 형식 오류 | 400 | `400` (검증 핸들러) |

---

## 5. 적재 현황 (Courses)

### 5-1. GET `/courses/summary` — 적재 학기·건수·최근 Job

`SYNC_MAIN` 진입 시 카드 2를 그리기 위해 호출한다. **진행 중 Job 식별에도 이 응답을 사용한다.**

#### 요청

```http
GET /api/v1/admin/courses/summary
access-token: {accessToken}
```

#### 응답 — 200 OK

```json
{
  "semester": { "academicYear": 2026, "term": "FIRST" },
  "courseCount": 1203,
  "scheduleCount": 2847,
  "lastJob": {
    "jobId": 40,
    "status": "SUCCESS",
    "startedAt": "2026-08-05T14:22:00",
    "createdCount": 12,
    "updatedCount": 45,
    "closedCount": 3
  },
  "runningJobId": 41
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `semester` | object \| **null** | 적재 학기. `courses`가 비어 있으면 `null` |
| `courseCount` | number | `courses` 전체 행 수 (`status = CLOSED` 포함) |
| `scheduleCount` | number | `course_schedules` 전체 행 수 |
| `lastJob` | object \| **null** | 가장 최근 Job 1건. 이력이 없으면 `null` |
| `lastJob.status` | string | `RUNNING` / `SUCCESS` / `FAILED` |
| `lastJob.createdCount` 외 2종 | number \| **null** | `status`가 `SUCCESS`가 아니면 `null` |
| `runningJobId` | number \| **null** | `RUNNING` 상태 Job의 ID. 없으면 `null` |

#### 클라이언트 사용 규칙

| 응답 | 화면 동작 |
|---|---|
| `semester = null` | 카드 2에 "적재된 데이터가 없습니다." |
| `lastJob = null` | "업데이트 이력이 없습니다." + 변경 요약 행 숨김 |
| `runningJobId ≠ null` | [데이터 업데이트] 버튼 비활성 + `GET /sync/jobs/{runningJobId}` **폴링 즉시 시작** |

> `runningJobId`는 와이어프레임 §8-1의 "새로고침 / 재진입 시 폴링 자동 재개" 요구를 충족하기 위한 필드다. 진입 시 어차피 호출하는 API이므로 추가 왕복이 발생하지 않는다.

> `courseCount`는 폐강(`CLOSED`) 과목을 포함한다. 폐강은 물리 삭제하지 않으므로(D3) 학기 전체 보유량을 나타낸다.

---

## 6. 데이터 업데이트 (Sync)

### 6-1. POST `/sync/preflight` — 전략 판정

M2에서 [다음]을 눌렀을 때 호출한다. **DB를 변경하지 않는다.**

#### 요청

```http
POST /api/v1/admin/sync/preflight
access-token: {accessToken}
Content-Type: application/json
```

```json
{
  "academicYear": 2026,
  "term": "SUMMER"
}
```

#### 응답 — 200 OK

```json
{
  "strategy": "REPLACE",
  "currentSemester": { "academicYear": 2026, "term": "FIRST" },
  "targetSemester":  { "academicYear": 2026, "term": "SUMMER" },
  "deleteCounts": {
    "courses": 1203,
    "schedules": 2847,
    "carts": 87,
    "registrations": 41
  }
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `strategy` | string | `INITIAL` / `UPSERT` / `REPLACE` |
| `currentSemester` | object \| **null** | 현재 적재 학기. `INITIAL`이면 `null` |
| `targetSemester` | object | 요청한 학기 |
| `deleteCounts` | object | 삭제 예정 건수 4종 |

#### 전략 판정 규칙 (D4)

| 조건 | `strategy` | `deleteCounts` |
|---|---|---|
| `courses`가 비어 있음 | `INITIAL` | 전부 `0` |
| 적재 학기 == 대상 학기 | `UPSERT` | 전부 `0` |
| 적재 학기 != 대상 학기 | `REPLACE` | 실제 삭제 예정 건수 |

> **캐시하지 않는다.** 매 호출마다 count 4건을 계산한다. `courses`는 항상 단일 학기이므로 비교 대상이 1건뿐이며, 캐시는 정확도만 떨어뜨린다.

#### 클라이언트 분기

| `strategy` | 표시 모달 |
|---|---|
| `UPSERT` | M3 (갱신 확인) |
| `REPLACE` | M4 (destructive + Strict Match) |
| `INITIAL` | M3 변형 — 와이어프레임 §7-5 |

#### 실패

| 상황 | HTTP | code |
|---|---|---|
| `term`이 enum에 없는 값 | 400 | `8888` |

### 6-2. POST `/sync/jobs` — Job 생성 (비동기)

확인 모달에서 실행 버튼을 눌렀을 때 호출한다.

#### 요청

```http
POST /api/v1/admin/sync/jobs
access-token: {accessToken}
Content-Type: application/json
```

```json
{
  "academicYear": 2026,
  "term": "SUMMER",
  "expectedStrategy": "REPLACE"
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `academicYear` | number | Y | 대상 학년도 |
| `term` | string | Y | 대상 학기 |
| `expectedStrategy` | string | Y | **6-1 응답의 `strategy`를 그대로 되돌려 보낸다** |

> ⚠️ **`expectedStrategy`는 판정 근거가 아니다.** 전략을 결정하는 주체는 서버이며(D4), 이 필드는 "관리자가 확인 모달에서 본 것"과 "지금 실행될 것"이 같은지 대조하는 **검증용**이다.

#### 서버 처리 순서

```
1. RUNNING 상태 Job 존재 여부 확인       → 있으면 409 / 5200
2. 대상 학기로 전략 재판정 (6-1과 동일 로직)
3. 재판정 결과 != expectedStrategy       → 409 / 5201
4. course_sync_job 행 생성 (status = RUNNING)
5. 비동기 실행 시작 후 즉시 응답
```

#### 응답 — 202 Accepted

```json
{ "jobId": 41 }
```

#### 실패

| 상황 | HTTP | code | message |
|---|---|---|---|
| `RUNNING` Job이 이미 존재 | 409 | `5200` | 이미 업데이트가 진행 중이에요. |
| 재판정 결과와 `expectedStrategy` 불일치 | 409 | `5201` | 데이터가 변경됐어요. 다시 확인해주세요. |
| `term`·`expectedStrategy`가 enum에 없는 값 | 400 | `8888` | |

#### 5201 발생 시 클라이언트 동작

모달을 닫고 Error 토스트로 `message`를 표시한 뒤, `GET /courses/summary`를 재호출해 화면을 갱신한다. 관리자는 M2부터 다시 진행한다.

> 5200은 와이어프레임 §8-2·§9-1의 "이미 업데이트가 진행 중이에요." 토스트와 대응한다.

### 6-3. GET `/sync/jobs` — 이력 목록

#### 요청

```http
GET /api/v1/admin/sync/jobs?page=1
access-token: {accessToken}
```

| 파라미터 | 타입 | 필수 | 기본값 |
|---|---|---|---|
| `page` | number | N | 1 |

#### 응답 — 200 OK

```json
{
  "page": 1,
  "totalPages": 8,
  "hasNextPage": true,
  "content": [
    {
      "jobId": 41,
      "academicYear": 2026,
      "term": "FIRST",
      "strategy": "UPSERT",
      "status": "SUCCESS",
      "startedAt": "2026-08-05T14:22:00",
      "createdCount": 12,
      "updatedCount": 45,
      "closedCount": 3
    }
  ]
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `jobId` | number | Job ID |
| `academicYear` | number | 대상 학년도 |
| `term` | string | 대상 학기 |
| `strategy` | string | `INITIAL` / `UPSERT` / `REPLACE` |
| `status` | string | `RUNNING` / `SUCCESS` / `FAILED` |
| `startedAt` | string | 시작 일시 |
| `createdCount` | number \| **null** | `SUCCESS`가 아니면 `null` (화면 `-`) |
| `updatedCount` | number \| **null** | 동일 |
| `closedCount` | number \| **null** | 동일. `REPLACE`·`INITIAL`은 항상 `0` |

- 정렬: **`startedAt` 내림차순** (최신 우선)
- 페이지 크기 10 고정

### 6-4. GET `/sync/jobs/{jobId}` — Job 상세

이력 행 인라인 확장과 **진행률 폴링을 겸한다.**

#### 요청

```http
GET /api/v1/admin/sync/jobs/{jobId}
access-token: {accessToken}
```

#### 응답 — 200 OK (진행 중)

```json
{
  "jobId": 41,
  "academicYear": 2026,
  "term": "FIRST",
  "strategy": "UPSERT",
  "status": "RUNNING",
  "executedBy": "김학사",
  "startedAt": "2026-08-05T14:22:00",
  "finishedAt": null,
  "durationSeconds": null,
  "fetchedCourseCount": null,
  "fetchedScheduleCount": null,
  "createdCount": null,
  "updatedCount": null,
  "closedCount": null,
  "warningCount": null,
  "progress": {
    "phase": "COURSE_FETCH",
    "current": 3,
    "total": 12
  },
  "partiallyApplied": false,
  "failureReason": null
}
```

#### 응답 — 200 OK (성공)

```json
{
  "jobId": 41,
  "status": "SUCCESS",
  "executedBy": "김학사",
  "startedAt": "2026-08-05T14:22:00",
  "finishedAt": "2026-08-05T14:23:47",
  "durationSeconds": 107,
  "fetchedCourseCount": 1215,
  "fetchedScheduleCount": 2891,
  "createdCount": 12,
  "updatedCount": 45,
  "closedCount": 3,
  "warningCount": 2,
  "progress": null,
  "partiallyApplied": false,
  "failureReason": null
}
```

> 위 예시는 지면상 공통 필드(`academicYear`·`term`·`strategy`)를 생략했다. 실제 응답은 항상 전체 필드를 포함한다.

#### 응답 — 200 OK (실패)

```json
{
  "jobId": 39,
  "status": "FAILED",
  "executedBy": "김학사",
  "startedAt": "2026-07-28T16:40:00",
  "finishedAt": "2026-07-28T16:40:12",
  "durationSeconds": 12,
  "fetchedCourseCount": null,
  "fetchedScheduleCount": null,
  "createdCount": null,
  "updatedCount": null,
  "closedCount": null,
  "warningCount": null,
  "progress": null,
  "partiallyApplied": false,
  "failureReason": "학교 API 호출 실패 (429 Too Many Requests) — PAGE 7"
}
```

#### 필드 정의

| 필드 | 타입 | 설명 |
|---|---|---|
| `executedBy` | string | 실행한 관리자의 `admins.name` |
| `finishedAt` | string \| null | 종료 일시. `RUNNING`이면 `null` |
| `durationSeconds` | number \| null | 소요 초. 화면은 `HH:mm:ss`로 변환해 표시 |
| `fetchedCourseCount` | number \| null | 학교 API에서 수집한 강의 건수. `SUCCESS`에서만 값 존재 |
| `fetchedScheduleCount` | number \| null | 수집한 시간표 건수. 동일 |
| `createdCount` 외 3종 | number \| null | 탭 라벨용 건수. `SUCCESS`에서만 값 존재 |
| `progress` | object \| **null** | `RUNNING`일 때만 값 존재. 7장 참조 |
| `partiallyApplied` | boolean | 적재 중 실패로 일부만 커밋된 상태 (와이어프레임 §8-3) |
| `failureReason` | string \| null | 실패 사유 원문. `FAILED`에서만 값 존재 |

#### 클라이언트 사용 규칙

| 조건 | 동작 |
|---|---|
| `status = RUNNING` | 2초 후 재호출 |
| `status = SUCCESS` | 폴링 중단, `GET /courses/summary` 재호출, Success 토스트 |
| `status = FAILED` | 폴링 중단, Error 토스트, 이력 최상단 행 자동 확장 |
| `partiallyApplied = true` | 확장 영역에 "부분 적용" 표시 |
| 탭 활성 판정 | 각 카운트가 `0`이면 해당 탭 비활성 |

#### 실패

| 상황 | HTTP | code |
|---|---|---|
| 해당 `jobId` 없음 | 404 | `5202` |

### 6-5. GET `/sync/jobs/{jobId}/details` — 변경 항목 목록

인라인 확장 영역의 탭별 목록.

#### 요청

```http
GET /api/v1/admin/sync/jobs/{jobId}/details?changeType=UPDATED&page=1
access-token: {accessToken}
```

| 파라미터 | 타입 | 필수 | 값 |
|---|---|---|---|
| `changeType` | string | **Y** | `CREATED` / `UPDATED` / `CLOSED` / `WARNING` |
| `page` | number | N | 기본 1 |

> `changeType`은 필수다. 탭 UI가 항상 하나의 유형을 선택하므로 전체 조회 용도가 없다.

#### 응답 — 200 OK

```json
{
  "page": 1,
  "totalPages": 5,
  "hasNextPage": true,
  "content": [
    {
      "haksuCode": "0000018001",
      "courseName": "신소재공학실험(1)",
      "changedFields": [
        { "field": "schedule", "before": "월1,2 (4호관301)", "after": "월1,2 (4호관305)" }
      ],
      "reason": null
    }
  ]
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `haksuCode` | string | 학수번호 |
| `courseName` | string \| null | 과목명(국문). `WARNING`은 적재 실패로 확보하지 못했을 수 있어 `null` 가능 |
| `changedFields` | array \| **null** | **`changeType = UPDATED`일 때만 값 존재.** 그 외 `null` |
| `changedFields[].field` | string | 변경 필드 식별자 (8-4 참조) |
| `changedFields[].before` | string | 변경 전 값 (문자열화) |
| `changedFields[].after` | string | 변경 후 값 (문자열화) |
| `reason` | string \| null | **`changeType = WARNING`일 때만 값 존재.** 예: `"미등록 이수구분 코드: 99"` |

- 정렬: **`haksuCode` 오름차순**
- 페이지 크기 10 고정. [더 보기]는 `page`를 1씩 증가시켜 누적 표시한다
- Job 완료 후 데이터가 불변이므로 오프셋 밀림이 발생하지 않는다

#### 실패

| 상황 | HTTP | code |
|---|---|---|
| 해당 `jobId` 없음 | 404 | `5202` |
| `changeType` 누락·잘못된 값 | 400 | `7777` |

---

## 7. 진행률 표현

`GET /sync/jobs/{jobId}` 응답의 `progress` 객체를 규정한다. `status = RUNNING`일 때만 존재하며, 그 외에는 `null`이다.

```json
{
  "phase": "COURSE_FETCH",
  "current": 3,
  "total": 12
}
```

### 7-1. `phase`

| 값 | 화면 라벨 | 의미 |
|---|---|---|
| `COURSE_FETCH` | 강의 수집 | `A_MAP_COURSE_INFO` 페이지 반복 수집 |
| `TIMETABLE_FETCH` | 시간표 수집 | `A_MAP_COURSE_TIMETABLE` 페이지 반복 수집 |
| `PERSIST` | 적재 | DB 반영 |

> 한글 라벨 매핑은 **클라이언트 책임**이다. 서버는 enum만 반환한다.

### 7-2. `current` / `total`의 단위

단계마다 단위가 다르다.

| `phase` | `current` | `total` | 화면 표기 |
|---|---|---|---|
| `COURSE_FETCH` | 수집 완료 페이지 | 전체 페이지 | `강의 수집 3/12 페이지` |
| `TIMETABLE_FETCH` | 수집 완료 페이지 | 전체 페이지 | `시간표 수집 7/28 페이지` |
| `PERSIST` | 처리 완료 과목 건수 | 전체 과목 건수 | `적재 450/1,203건` |

> 와이어프레임 §8-1의 "페이지" 표기는 **수집 단계 한정**이다. 적재 단계는 페이지 개념이 없어 건수로 표시한다.

### 7-3. `total = null` 처리

학교 API는 `totalpageSize`를 **첫 페이지 응답 본문에 담아** 반환한다. 즉 1페이지를 수신하기 전까지 서버는 전체 페이지 수를 알 수 없다.

```
t=0s   { "phase": "COURSE_FETCH", "current": 0, "total": null }
t=2s   { "phase": "COURSE_FETCH", "current": 1, "total": 12   }
```

| 조건 | 화면 표기 |
|---|---|
| `total = null` | **`강의 수집 중…`** (분모 없이) |
| `total ≠ null` | `강의 수집 3/12 페이지` |

`PERSIST` 단계는 수집이 끝난 뒤 시작되므로 `total`이 항상 확정돼 있다.

### 7-4. 폴링

| 항목 | 값 |
|---|---|
| 주기 | 2초 |
| 대상 | `GET /sync/jobs/{jobId}` |
| 시작 | Job 생성 응답 직후, 또는 진입 시 `runningJobId ≠ null`인 경우 |
| 중단 | `status`가 `SUCCESS` 또는 `FAILED`로 전이 |

---

## 8. 도메인 사전

### 8-1. `CourseTerm`

기존 enum을 그대로 사용한다. 값을 추가·변경하지 않는다.

| 값 | INTIP `TERM_CODE` | 한글 |
|---|---|---|
| `FIRST` | `10` | 1학기 |
| `SECOND` | `20` | 2학기 |
| `SUMMER` | `30` | 여름계절학기 |
| `WINTER` | `40` | 겨울계절학기 |

> ⚠️ **코드 순서와 시간 순서가 어긋난다.** 여름계절(`30`)이 2학기(`20`)보다 크다. 정렬·비교에 `code`를 사용하면 안 된다. 학기 선택 UI의 표시 순서는 `1학기 → 여름계절학기 → 2학기 → 겨울계절학기`다.

### 8-2. `SyncStrategy`

| 값 | 조건 | 유저 데이터 |
|---|---|---|
| `INITIAL` | `courses`가 비어 있음 | 해당 없음 |
| `UPSERT` | 적재 학기 == 대상 학기 | 장바구니·수강신청 **보존** |
| `REPLACE` | 적재 학기 != 대상 학기 | 함께 삭제 |

### 8-3. 기타 enum

| enum | 값 |
|---|---|
| `SyncJobStatus` | `RUNNING` · `SUCCESS` · `FAILED` |
| `SyncChangeType` | `CREATED` · `UPDATED` · `CLOSED` · `WARNING` |
| `SyncPhase` | `COURSE_FETCH` · `TIMETABLE_FETCH` · `PERSIST` |
| `CourseStatus` | `ACTIVE` · `CLOSED` (신규 컬럼, 10-1) |

### 8-4. `changedFields[].field` 식별자

UPSERT 시 비교 대상이 되는 필드다. `Course` 엔티티 필드명(camelCase)을 그대로 쓴다.

| `field` | 화면 라벨 | 비고 |
|---|---|---|
| `titleKr` | 과목명(국문) | |
| `titleEn` | 과목명(영문) | |
| `courseCode` | 과목코드 | |
| `college` | 단과대학 | enum |
| `department` | 학과 | enum |
| `classification` | 이수구분 | enum |
| `area` | 이수영역 | enum |
| `type` | 수업유형 | enum |
| `grade` | 학년 | enum |
| `credits` | 학점 | |
| `isEnglishCourse` | 원어강의 | |
| `schedule` | 강의실·시간 | **시간표 전체를 하나의 필드로 취급.** `before`/`after`는 `CourseScheduleFormatter` 포맷 문자열 |

#### 동기화 대상에서 제외되는 필드 (D2)

| 필드 | 사유 |
|---|---|
| `maxCapacity` | 학교 API 28개 필드에 없음. 서비스 소유. 신규 생성 시 기본 **40** |
| `currentEnrollment` | 서비스 소유. 수강신청 결과값 |

> 이 두 필드는 `changedFields`에 **절대 나타나지 않는다.**

- `schedules`는 필드 단위로 diff하지 않고 **과목 단위 전체 교체**한다. `Course.schedules`가 `orphanRemoval = true`이고 참조 테이블이 없어 안전하다.
- 한글 라벨 매핑은 클라이언트 책임이다.

### 8-5. `SemesterRef` 공통 객체

```json
{ "academicYear": 2026, "term": "FIRST" }
```

`courses/summary`·`preflight`에서 동일 구조로 사용한다.

---

## 9. 에러 코드 목록

### 9-1. 재사용 (기존 `ExceptionCode`)

| code | HTTP | message |
|---|---|---|
| `1000` | 401 | 액세스 토큰이 누락되었습니다. |
| `1001` | 401 | 액세스 토큰이 유효하지 않습니다. |
| `1002` | 401 | 액세스 토큰 형식이 올바르지 않습니다. |
| `1003` | 401 | 액세스 토큰 서명이 유효하지 않습니다. |
| `1004` | 401 | 액세스 토큰이 만료되었습니다. |
| `7777` | 400 | 유효하지 않은 입력 파라미터입니다. |
| `8888` | 400 | 유효하지 않은 열거타입입니다. |
| `9999` | 500 | 서버 내부 오류가 발생했습니다. |

> ⚠️ **어조 예외**: 위 코드는 **학생 API 와 공용**(`ExceptionCode`)이라 문구를 바꾸면 학생 앱에 영향이 간다. 격식체 그대로 둔다. 백오피스 화면에서 이 코드가 노출될 경우 **클라이언트가 자체 구어체 문구로 매핑**한다(대부분 401 이라 인터셉터가 토스트 없이 처리한다).

### 9-2. 신설 (백오피스 5000번대)

| code | HTTP | message | 발생 지점 |
|---|---|---|---|
| `5000` | 401 | 아이디나 비밀번호가 맞지 않아요. | 3-1 |
| `5001` | 404 | 관리자를 찾을 수 없어요. | 3-2 |
| `5002` | 403 | 관리자 권한이 없어요. | 2-2 |
| `5100` | 404 | 표시 학기 설정을 찾을 수 없어요. | 4-1 |
| `5200` | 409 | 이미 업데이트가 진행 중이에요. | 6-2 |
| `5201` | 409 | 데이터가 변경됐어요. 다시 확인해주세요. | 6-2 |
| `5202` | 404 | 업데이트 작업을 찾을 수 없어요. | 6-4, 6-5 |

#### 대역 규칙

| 대역 | 도메인 |
|---|---|
| `5000~5099` | 관리자 계정·인증 |
| `5100~5199` | 표시 학기 |
| `5200~5299` | 데이터 업데이트 |

---

## 10. 백엔드 구현 요구

DB 스키마 전체 설계는 본 문서 범위 밖이다. **응답 필드·엔드포인트 동작에 직접 관여하는 항목만** 명시한다.

### 10-1. 기존 테이블 수정

```
courses
  + UNIQUE (academic_year, term, haksu_code)   -- UPSERT 기준키
  + status          ACTIVE | CLOSED            -- D3
  + last_synced_at  DATETIME
```

> 현재 `Course`의 PK는 `id` IDENTITY이고 자연키 제약이 없다. UPSERT 기준키를 확보하려면 UNIQUE 제약 추가가 선행돼야 한다.

| 영향 | 내용 |
|---|---|
| `Cart` / `Registration` | `course_id` FK 참조. **과목 물리 삭제 금지** (D3) |
| 신청 로직 | `status = ACTIVE` 검증 추가 (D5). 업데이트 중에도 서비스가 정상 운영된다 |
| `CourseService` 조회 | 학기 필터를 추가하지 않는다 (D9). `courses`는 항상 단일 학기다 |

### 10-2. 신규 테이블

| 테이블 | 본 문서와의 대응 |
|---|---|
| `admins` | `login_id`, `password`(BCrypt), `name` → 3-1의 인증, 6-4의 `executedBy` |
| `semester_setting` | `academic_year`, `term` → 4장. **항상 1행** |
| `course_sync_job` | 6-3·6-4의 모든 필드. 진행률 3종 컬럼 포함 |
| `course_sync_detail` | 6-5. `haksu_code`, `course_name`, `change_type`, `changed_fields`(JSON), `reason` |

### 10-3. 동시 실행 차단

`RUNNING` Job의 유일성은 **DB 제약으로 보장**한다. 애플리케이션 레벨 검사만으로는 동시 요청을 막을 수 없다.

> 구현 방식(부분 UNIQUE 인덱스 / 별도 락 테이블 등)은 백엔드 재량이다. 계약상 요구는 "두 번째 요청이 409 / `5200`을 받는 것"뿐이다.

### 10-4. enum 미매핑 처리 (D12)

`CourseCollege`·`CourseDepartment`·`CourseClassification`·`CourseArea`·`CourseType`·`CourseGrade`의 `fromCode()`는 미매핑 시 `RestApiException(INVALID_ENUM_TYPE)`을 던진다. 이 동작을 **동기화 경로에서만 우회**해야 한다.

| 요구 | 내용 |
|---|---|
| 동기화 중 미매핑 발생 | 예외를 전파하지 않고 해당 과목을 **건너뛴다** |
| 기록 | `course_sync_detail`에 `change_type = WARNING` + `reason` 저장 |
| Job 상태 | **`FAILED`로 만들지 않는다.** `SUCCESS`로 종료 가능 |
| 기존 학생 API | 동작 변경 없음. 기존 예외 처리를 그대로 유지 |

### 10-5. AUTH_KEY 관리

학교 API `AUTH_KEY`는 소스코드에 하드코딩하지 않고 환경변수로 분리한다. 기존 `application-prod.yml`의 시크릿 주입 방식(CD 워크플로 `variable-substitution`)을 따른다.

---

## 11. 미확정·실측 확인 항목

### 11-1. 학교 API 실측 (연동 초기 1회)

결과에 따라 본 문서가 수정될 수 있다.

| # | 항목 | 본 문서에 미치는 영향 |
|---|---|---|
| 1 | `MOD_DATE`에 과거 날짜(`{연도}0101`) 정상 동작 | 전량 수집 가능 여부 (D1의 전제) |
| 2 | `YEAR` 파라미터 필터 동작 | 수집량, `total` 페이지 수 |
| 3 | `TERM_CODE` 파라미터 필터 동작 | 미동작 시 앱에서 필터링 → `fetchedCourseCount` 의미 변화 |
| 4 | `TERM_CODE` 반환값이 `10/20/30/40`인지 | 8-1 enum 매핑 |
| 5 | 두 API의 `TERM_CODE` 체계 동일 여부 | 강의-시간표 조인 |
| 6 | HTTP 메서드 (POST / GET) | 클라이언트 구현 |
| 7 | 페이지당 최대 건수 | 7-2 진행률 분모의 체감 정확도 |
| 8 | 호출 서버 IP가 `117.16.191.59`와 일치 | 연동 가능 여부 |

### 11-2. 알려진 한계 (의도적 수용)

| 항목 | 내용 |
|---|---|
| 토큰 무효화 불가 | 3-3. refreshToken·화이트리스트 미도입에 따른 결과 |
| 무기한 재발급 | 3-2. 만료 토큰으로 재발급 가능. 기존 서버 동작 승계 |
| 감사 로그 없음 | 본 버전 범위 외. Job 이력의 `executedBy`가 유일한 추적 수단 |
| Rate limiting 없음 | 관리자 수 명 규모. 본 버전 범위 외 |

---

## 12. 문서 정정 사항

페이지 크기 10 확정에 따라 `01_uss_admin_wireframe_spec.md`를 정정해야 한다.

| 위치 | 현재 | 수정 후 |
|---|---|---|
| §6-4 이력 테이블 | 페이지 크기 **20행 고정** | 페이지 크기 **10행 고정** |
| §6-5 인라인 확장 | 최초 **20건**. [더 보기]로 **20건씩** 추가 | 최초 **10건**. [더 보기]로 **10건씩** 추가 |

추가로 `01` §11(실측 확인 항목)은 본 문서 §11-1과 동일 내용이다. 중복 관리를 피하기 위해 향후 본 문서를 SoT로 삼는다.

---

**관련 문서**: `01_uss_admin_wireframe_spec.md` v1.2 (화면·동작을 정한다) · `DS-00_uss_overview.md` (시각 방향)

## v1.1 변경 요약

| # | 위치 | 변경 |
|---|---|---|
| 1 | §3-1, §3-2 | 응답에 **`name` 추가** — `{ accessToken, name }`. `/admin/me` 미도입에 따른 결정 |
| 2 | §9-2 | 백오피스 5000번대 `message` **구어체 전환** (`DS-00 §6`) |
| 3 | §9-1 | 재사용 코드(1000·7777·8888·9999)는 학생 API 공용이라 **격식체 유지** — 어조 예외 명시 |
| 4 | §6-2 | 실패표 `message` 를 §9-2 와 동기화 |
