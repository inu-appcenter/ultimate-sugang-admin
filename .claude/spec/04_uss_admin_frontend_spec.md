# USS 백오피스 프론트엔드 통합 명세서

> 프론트엔드를 **AI(Claude Code 등)가 단독으로 구현 가능한 수준**으로 통합 정리한 문서.
> `01`(화면·동작)·`03`(API 계약)·`DS-00`(시각 방향)·`DS-01`(토큰)의 결정을 프론트 구현 관점에서 통합하고, 아키텍처·Step 절차·횡단 정책을 추가한다.

---

## 1. 개요

### 1-1. 프로젝트

| 항목 | 내용 |
|---|---|
| 서비스 | USS(모의 수강신청 서비스) 학사과용 백오피스 |
| 사용자 | 학사과 담당자 수 명 |
| 화면 수 | **2개** (`ADMIN_LOGIN`, `SYNC_MAIN`) + 모달 5종 |
| 타겟 | 데스크톱 전용, 최소 1280px, 반응형 미지원 |
| 컬러 모드 | 라이트 전용 |
| 언어 | 한국어 |

### 1-2. 문서 위치

```
01_uss_admin_wireframe_spec.md   화면·동작·상태전이 (v1.2)
03_uss_admin_api_spec.md         API 계약 (v1.1)
DS-00_uss_overview.md            시각 방향
DS-01_uss_design_system.md       토큰·컴포넌트
                  ↓
04_uss_admin_frontend_spec.md    ← 본 문서
                  ↓
            Claude Code (구현)
```

### 1-3. 구현 AI 작업 원칙

1. **사실 기반.** 첨부 문서를 정확히 따르고 임의 해석·추측하지 않는다.
2. **명세 부재 시 코드를 쓰지 말고 질문한다**(🙋🏻). 환각 금지.
3. `DS-01` 의 토큰·컴포넌트 **이름을 그대로** 쓴다.
4. **shadcn/ui 우선.** 커스텀은 토큰 경유 확장만.
5. 데스크톱 1280px+ 단일 폭. 반응형·다크 코드 금지.
6. `any` 금지. 모든 API 응답은 **Zod 파싱 후** 사용.
7. **명세에 없는 엔드포인트·필드를 만들지 않는다.** 엔드포인트는 9개가 전부다.
8. **한 번에 하나**(체크리스트 1항목). 게이트 green 전에 "완료" 선언 금지.

---

## 2. 문서 정합성 노트

작성 시점에 식별된 문서 간 관계를 다음과 같이 처리한다.

### 2-1. 판단 근거로 쓰지 않는 문서

| 문서 | 처리 |
|---|---|
| `DS-00_overview.md` | **폐기** — `DS-00_uss_overview.md` 가 대체 |
| `DS-01_design_system.md` | **폐기** — `DS-01_uss_design_system.md` 로 병합 완료 |
| `DS-02_screens.md` | **USS 화면을 여기서 판단하지 않는다.** 다른 제품의 16화면 문서다. 테이블·폼·모달 구성만 참고한다 |
| `DS-03_interactions.md` | 유지. 단 §5(스테이징)·사이드바 항목은 USS 무관 |

### 2-2. 어조 혼재 (의도적)

`03 §9-1` 의 재사용 에러 코드(`1000`~`1004`·`7777`·`8888`·`9999`)는 **학생 API 와 공용**(`ExceptionCode`)이라 격식체다. 백오피스 5000번대만 구어체다.

**처리**: 프론트가 재사용 코드에 대해 **자체 구어체 문구를 매핑**한다(§9-2). 서버 `message` 를 그대로 노출하지 않는다.

### 2-3. 실측 미검증 항목

`03 §11-1` 의 학교 API 실측 8항목은 미검증이다. **결과에 의존하는 값(페이지당 건수·예상 소요시간)을 하드코딩하지 않는다.** 진행률은 서버가 주는 `phase` 만 표시하므로 실측 결과에 의존하지 않는다.

---

## 3. 기술 스택

| 영역 | 라이브러리 | 비고 |
|---|---|---|
| 빌드 | **Vite** | |
| 프레임워크 | **React 19 + TypeScript** | |
| 스타일 | **Tailwind CSS** + **shadcn/ui** (Radix) | |
| 라우팅 | **react-router** (v7, `loader` 기반 가드) | |
| 서버 상태 | **TanStack Query** | 폴링·무한스크롤 포함 |
| 클라이언트 상태 | **Zustand** | auth store 전용 |
| HTTP | **axios** | 인스턴스 **1개** |
| 스키마·검증 | **Zod** | 응답 파싱 + 폼 검증 |
| 폼 | **React Hook Form** + `zodResolver` | |
| 토스트 | **sonner** | |
| 아이콘 | **lucide-react** | |
| Mock | **MSW** | §11 |

### 3-1. 도입 금지

| 금지 | 대체 |
|---|---|
| CSS-in-JS (emotion / styled-components) | Tailwind |
| Formik | React Hook Form |
| Redux Toolkit | Zustand |
| SWR | TanStack Query |
| moment | — |
| **date-fns / dayjs** | **불필요.** 시각이 KST 로컬 문자열(`"2026-08-05T14:22:00"`)이라 문자열 조작으로 충분 (§9-3) |

---

## 4. 디렉토리 구조·컨벤션

```
src/
├─ app/
│  ├─ router.tsx                    라우터 + protectedLoader
│  ├─ providers.tsx                 QueryClient · Toaster
│  └─ main.tsx
├─ pages/
│  ├─ AdminLoginPage.tsx
│  └─ SyncMainPage.tsx
├─ features/
│  ├─ auth/
│  │  ├─ api.ts  schemas.ts  queries.ts  store.ts  types.ts
│  ├─ semester/
│  │  ├─ api.ts  schemas.ts  queries.ts
│  │  └─ components/SemesterSettingModal.tsx        (M1)
│  └─ sync/
│     ├─ api.ts  schemas.ts  queries.ts
│     └─ components/
│        ├─ CourseSummaryCard.tsx                   (카드 2)
│        ├─ SyncTargetModal.tsx                     (M2)
│        ├─ SyncConfirmModal.tsx                    (M3 · 최초 적재 변형)
│        ├─ SyncReplaceModal.tsx                    (M4)
│        ├─ SyncJobTable.tsx                        (이력 테이블)
│        ├─ SyncJobRow.tsx                          (Expandable Row)
│        ├─ SyncJobDetailPanel.tsx                  (확장 영역)
│        ├─ SyncDetailTabs.tsx                      (Tab Group)
│        └─ SyncProgressText.tsx                    (진행률)
├─ shared/
│  ├─ api/
│  │  ├─ client.ts        apiClient (인스턴스 1개)
│  │  ├─ tokenManager.ts  access 토큰 + name
│  │  ├─ refreshQueue.ts  401 재발급 동시 1건
│  │  ├─ errorHandler.ts  { code:number, message } → 토스트
│  │  └─ types.ts         PaginatedResponse · ErrorResponse
│  ├─ components/
│  │  ├─ ui/              shadcn/ui CLI 생성
│  │  ├─ layout/          MainLayout · LoginLayout · Header
│  │  ├─ data-table/      DataTable · PaginationControl
│  │  ├─ badge/           StatusBadge
│  │  ├─ modals/          ConfirmModal · StrictMatchModal
│  │  ├─ states/          EmptyState · ErrorState · LoadingSkeleton
│  │  └─ form/            FormField · FieldError
│  ├─ hooks/              (필요 시)
│  ├─ lib/
│  │  ├─ cn.ts
│  │  ├─ formatDateTime.ts    KST 로컬 문자열 슬라이스
│  │  ├─ formatNumber.ts      천단위 콤마
│  │  └─ formatDuration.ts    초 → HH:mm:ss
│  ├─ constants/
│  │  ├─ routes.ts        ROUTES
│  │  ├─ labels.ts        enum 한글 매핑
│  │  ├─ errorCodes.ts    정수 코드 상수
│  │  ├─ badgeVariants.ts
│  │  └─ fieldLimits.ts
│  └─ styles/globals.css
├─ mocks/                 MSW (§11)
│  ├─ browser.ts  handlers.ts  db.ts
├─ env.ts
└─ vite-env.d.ts
```

### 4-1. 폴더 책임·의존 방향 (단방향)

| 폴더 | 책임 | 의존 |
|---|---|---|
| `app/` | 부트스트랩·라우터·프로바이더 | `pages`, `shared` |
| `pages/` | 라우트별 얇은 페이지 | `features`, `shared` |
| `features/{domain}/` | 도메인 로직 | **`shared` 만.** 다른 features 참조 금지 |
| `shared/` | 도메인 무관 공용 | 외부 라이브러리만 |

### 4-2. 파일 명명

| 종류 | 규칙 |
|---|---|
| 컴포넌트 | `PascalCase.tsx` |
| 훅 | `useXxx.ts` |
| 유틸 | `camelCase.ts` |
| 타입 | `types.ts` |
| Zod 스키마 | `schemas.ts` |
| API 호출 | `api.ts` |
| 쿼리 훅·키 | `queries.ts` |
| 상수(값) | `UPPER_SNAKE_CASE` |
| 상수(객체) | `camelCase` |

### 4-3. import

**절대 경로 alias `@/` 만.** 상대경로(`../../`) 금지.

---

## 5. 환경 변수

```
VITE_API_HOST=http://localhost:8080
VITE_USE_MSW=true
```

```typescript
// src/env.ts
import { z } from 'zod';

const schema = z.object({
  VITE_API_HOST: z.string().url(),
  VITE_USE_MSW: z.enum(['true', 'false']).default('false'),
});

const parsed = schema.safeParse(import.meta.env);
if (!parsed.success) {
  throw new Error('환경 변수 설정이 올바르지 않습니다. .env 파일을 확인해주세요.');
}
export const env = parsed.data;
```

코드에서 `import.meta.env` 직접 접근 금지. 항상 `import { env } from '@/env'`.

---
## 6. API 클라이언트 레이어

### 6-1. 기본 사양

| 항목 | 값 |
|---|---|
| 라이브러리 | axios |
| 인스턴스 | **1개** (`apiClient`) |
| Base URL | `${env.VITE_API_HOST}/api/v1/admin` |
| 인증 헤더 | **`access-token: {accessToken}`** |
| Content-Type | `application/json` |
| 타임아웃 | 30,000ms |

> ⚠️ **`authApiClient` 를 분리하지 않는다.** `/auth/refresh` 도 같은 base 를 쓰고 헤더만 다르다.

```typescript
// shared/api/client.ts
import axios from 'axios';
import { env } from '@/env';

export const apiClient = axios.create({
  baseURL: `${env.VITE_API_HOST}/api/v1/admin`,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});
```

### 6-2. Request 인터셉터

```typescript
apiClient.interceptors.request.use((config) => {
  const token = tokenManager.getAccessToken();
  if (token) config.headers['access-token'] = token;
  return config;
});
```

### 6-3. tokenManager

**access 토큰 하나만** 관리한다. refresh 토큰이 없다.

```typescript
// shared/api/tokenManager.ts
const TOKEN_KEY = 'uss_admin_access_token';
const NAME_KEY  = 'uss_admin_name';

export const tokenManager = {
  getAccessToken: () => localStorage.getItem(TOKEN_KEY),
  getName:        () => localStorage.getItem(NAME_KEY),
  set: (token: string, name: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(NAME_KEY, name);
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(NAME_KEY);
  },
};
```

> ⚠️ **access 토큰을 localStorage 에 둔다.** refresh 토큰이 없어서 메모리에 두면 새로고침마다 로그아웃된다.
> XSS 노출 위험은 있으나 ① 내부 담당자 수 명 ② 학내망 도구 ③ 토큰 유효기간 2시간이라는 조건에서의 절충이다. 향후 httpOnly 쿠키 전환은 백엔드와 함께 재설계한다.

### 6-4. Response 인터셉터 — 401 재발급 큐(동시에 1건만)

401 발생 시 refresh 를 **1번만** 호출하고, 그동안 도착하는 다른 401 은 큐에서 대기한다.

```typescript
// shared/api/refreshQueue.ts (의사 코드)
let isRefreshing = false;
let waiters: Array<(t: string | null) => void> = [];

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }
    // refresh 요청 자체가 401 → 재로그인
    if (original.url?.includes('/auth/refresh')) {
      forceLogout();
      return Promise.reject(error);
    }
    original._retry = true;

    if (isRefreshing) {
      const t = await new Promise<string | null>((r) => waiters.push(r));
      if (!t) return Promise.reject(error);
      original.headers['access-token'] = t;
      return apiClient.request(original);
    }

    isRefreshing = true;
    try {
      const expired = tokenManager.getAccessToken();
      // 만료된 토큰을 그대로 헤더에 실어 보낸다 (03 §3-2)
      const { data } = await apiClient.post('/auth/refresh', null, {
        headers: { 'access-token': expired ?? '' },
      });
      const parsed = authTokenSchema.parse(data);
      tokenManager.set(parsed.accessToken, parsed.name);
      waiters.forEach((r) => r(parsed.accessToken)); waiters = [];
      original.headers['access-token'] = parsed.accessToken;
      return apiClient.request(original);
    } catch (e) {
      waiters.forEach((r) => r(null)); waiters = [];
      forceLogout();
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  }
);

function forceLogout() {
  tokenManager.clear();
  useAuthStore.getState().reset();
  toast.error('다시 로그인해주세요.');
  window.location.href = ROUTES.LOGIN;
}
```

### 6-5. 공통 응답 타입

```typescript
// shared/api/types.ts
export interface PaginatedResponse<T> {
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  content: T[];
}

export interface ErrorResponse {
  code: number;      // ⚠️ 정수. 문자열 아님
  message: string;
}
```

### 6-6. TanStack Query 설정

```typescript
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 401) return; // 인터셉터 처리
      showErrorToast(error);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 401) return;
      showErrorToast(error);
    },
  }),
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
});
```

### 6-7. queryKey 팩토리

```typescript
// features/sync/queries.ts
export const syncKeys = {
  all:      ['sync'] as const,
  summary:  () => [...syncKeys.all, 'summary'] as const,
  jobs:     (page: number) => [...syncKeys.all, 'jobs', page] as const,
  job:      (id: number) => [...syncKeys.all, 'job', id] as const,
  details:  (id: number, changeType: SyncChangeType) =>
              [...syncKeys.all, 'job', id, 'details', changeType] as const,
};

// features/semester/queries.ts
export const semesterKeys = {
  all: ['semester'] as const,
  display: () => [...semesterKeys.all, 'display'] as const,
};
```

---

## 7. 인증 흐름

### 7-1. 로그인

```
1. /login 진입 → 아이디·비밀번호 입력
2. POST /auth/login { loginId, password }
3. 분기
   ├─ 200 → { accessToken, name } 저장 → store.setAdmin(name) → / 이동
   └─ 401(code 5000) → 카드 하단 에러 "아이디나 비밀번호가 맞지 않아요."
                       (토스트 아님. 인라인 표시)
```

> **401 은 인터셉터가 refresh 를 시도한다.** `/auth/login` 은 예외 처리해야 한다 — `original.url` 이 `/auth/login` 이면 그대로 reject 한다.

### 7-2. auth store

```typescript
// features/auth/store.ts
interface AuthState {
  name: string | null;
  isAuthenticated: boolean;
  setAdmin: (name: string) => void;
  reset: () => void;
}
export const useAuthStore = create<AuthState>((set) => ({
  name: null,
  isAuthenticated: false,
  setAdmin: (name) => set({ name, isAuthenticated: true }),
  reset: () => set({ name: null, isAuthenticated: false }),
}));
```

### 7-3. protectedLoader

```typescript
const protectedLoader: LoaderFunction = async () => {
  const token = tokenManager.getAccessToken();
  if (!token) throw redirect(ROUTES.LOGIN);

  const { name, setAdmin } = useAuthStore.getState();
  if (!name) {
    const stored = tokenManager.getName();
    if (stored) setAdmin(stored);
    else {
      // 토큰만 있고 이름이 없는 예외 상황 → refresh 로 복원
      try {
        const res = await refreshToken();
        tokenManager.set(res.accessToken, res.name);
        setAdmin(res.name);
      } catch {
        tokenManager.clear();
        throw redirect(ROUTES.LOGIN);
      }
    }
  }
  return null;
};
```

> 관리자 이름은 `/auth/login`·`/auth/refresh` 응답의 `name` 에서만 얻는다. **`/admin/me` 는 존재하지 않는다**(`03 §2` 노트).

### 7-4. 로그아웃 (M5)

```
1. 헤더 [로그아웃] 클릭 → Confirm Modal "로그아웃할까요?"
2. [확인]
   - tokenManager.clear()
   - useAuthStore.getState().reset()
   - queryClient.clear()
   - navigate(ROUTES.LOGIN)
3. 서버 호출 없음 ← POST /auth/logout 이 존재하지 않는다 (03 §3-3)
```

> ⚠️ 발급된 토큰은 최대 2시간 유효한 채로 남는다. 구조상 한계이며 클라이언트가 보완할 수 없다.

---

## 8. 라우팅 구조

```typescript
export const ROUTES = {
  LOGIN: '/login',
  HOME:  '/',
} as const;

export const router = createBrowserRouter([
  {
    path: ROUTES.LOGIN,
    element: <LoginLayout />,
    children: [{ index: true, element: <AdminLoginPage /> }],
  },
  {
    path: ROUTES.HOME,
    element: <MainLayout />,
    loader: protectedLoader,
    children: [{ index: true, element: <SyncMainPage /> }],
  },
]);
```

- 모든 이동은 `ROUTES` 상수를 쓴다. 문자열 하드코딩 금지.
- 라우트가 2개뿐이므로 Breadcrumb·사이드바가 없다.

---
## 9. 횡단 정책

### 9-1. Zod 파싱

모든 응답은 스키마 파싱 후 사용한다. `any`·캐스팅 금지.

```typescript
// features/sync/schemas.ts
export const semesterRefSchema = z.object({
  academicYear: z.number(),
  term: z.enum(['FIRST', 'SECOND', 'SUMMER', 'WINTER']),
});

export const coursesSummarySchema = z.object({
  semester: semesterRefSchema.nullable(),
  courseCount: z.number(),
  scheduleCount: z.number(),
  lastJob: z.object({
    jobId: z.number(),
    status: z.enum(['RUNNING', 'SUCCESS', 'FAILED']),
    startedAt: z.string(),
    createdCount: z.number().nullable(),
    updatedCount: z.number().nullable(),
    closedCount: z.number().nullable(),
  }).nullable(),
  runningJobId: z.number().nullable(),
});

export const syncProgressSchema = z.object({
  phase: z.enum(['COURSE_FETCH', 'TIMETABLE_FETCH', 'PERSIST']),
});
```

#### ⚠️ nullable 취급 규칙

`null`(미확정)과 `0`(없음)은 **다른 의미**다. `?? 0` 폴백 금지.

| 필드 | `null` 의미 | 화면 |
|---|---|---|
| `semester` | 적재 데이터 없음 | "아직 적재된 데이터가 없어요." |
| `lastJob` | 이력 없음 | "업데이트 이력이 없어요." |
| `runningJobId` | 진행 중 Job 없음 | 폴링 안 함 |
| `createdCount` 외 3종 | Job 이 `SUCCESS` 가 아님 | `-` 표기 |
| `progress` | `RUNNING` 아님 | 진행률 숨김 |
| `changedFields` | `changeType ≠ UPDATED` | 변경 내용 열 비움 |
| `courseName` | 경고 항목에서 확보 실패 | `-` |

### 9-2. 에러 → 토스트 매핑

**우선순위**

```
1. 백오피스 5000번대 → 서버 message 그대로 (이미 구어체)
2. 재사용 코드(1000~1004·7777·8888·9999) → 클라이언트 자체 문구
3. HTTP 상태별 기본 문구
4. 네트워크 에러
```

```typescript
// shared/constants/errorCodes.ts
export const ERROR_CODE = {
  MISSING_ACCESS_TOKEN: 1000,
  INVALID_ACCESS_TOKEN: 1001,
  INVALID_FORM_ACCESS_TOKEN: 1002,
  INVALID_SIGNATURE_ACCESS_TOKEN: 1003,
  EXPIRED_ACCESS_TOKEN: 1004,
  INVALID_REQUEST_PARAMETER: 7777,
  INVALID_ENUM_TYPE: 8888,
  UNEXPECTED_SERVER_ERROR: 9999,

  ADMIN_LOGIN_FAILED: 5000,
  ADMIN_NOT_FOUND: 5001,
  NOT_ADMIN_TOKEN: 5002,
  SEMESTER_SETTING_NOT_FOUND: 5100,
  SYNC_JOB_ALREADY_RUNNING: 5200,
  SYNC_STRATEGY_MISMATCH: 5201,
  SYNC_JOB_NOT_FOUND: 5202,
} as const;

// 재사용 코드 자체 문구 (서버 격식체 → 구어체 재작성)
export const REUSED_CODE_MESSAGE: Record<number, string> = {
  7777: '입력값을 다시 확인해주세요.',
  8888: '처리할 수 없는 값이 있어요.',
  9999: '서버에 문제가 생겼어요. 잠시 후 다시 시도해주세요.',
};
```

**HTTP 상태별 기본 문구**

| 상태 | 문구 |
|---|---|
| 400 | 입력값을 다시 확인해주세요. |
| 401 | (토스트 없음 — 인터셉터 처리) |
| 403 | 관리자 권한이 없어요. |
| 404 | 요청한 항목을 찾을 수 없어요. |
| 409 | (서버 `message` 사용 — 5200·5201) |
| 5xx | 서버에 문제가 생겼어요. 잠시 후 다시 시도해주세요. |
| 네트워크 | 네트워크 연결을 확인해주세요. |

### 9-3. 날짜·숫자 포맷

시각은 **KST 로컬 문자열**(`"2026-08-05T14:22:00"`)이다. **`new Date()` 파싱·UTC 변환을 하지 않는다.**

```typescript
// shared/lib/formatDateTime.ts
/** "2026-08-05T14:22:00" → "2026-08-05 14:22" */
export const formatDateTime = (iso: string) =>
  `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;

// shared/lib/formatDuration.ts
/** 107 → "00:01:47" */
export const formatDuration = (sec: number) => {
  const h = String(Math.floor(sec / 3600)).padStart(2, '0');
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

// shared/lib/formatNumber.ts
export const formatNumber = (n: number) => n.toLocaleString('ko-KR');
```

### 9-4. enum 한글 매핑

```typescript
// shared/constants/labels.ts
export const termLabels = {
  FIRST: '1학기', SUMMER: '여름계절학기',
  SECOND: '2학기', WINTER: '겨울계절학기',
} as const;

/** ⚠️ 표시 순서. TERM_CODE(10/20/30/40)로 정렬하면 틀린다 (여름 30 > 2학기 20) */
export const TERM_ORDER = ['FIRST', 'SUMMER', 'SECOND', 'WINTER'] as const;

export const strategyLabels = {
  INITIAL: '최초', UPSERT: '갱신', REPLACE: '교체',
} as const;

export const jobStatusLabels = {
  RUNNING: '진행 중', SUCCESS: '성공', FAILED: '실패',
} as const;

export const phaseLabels = {
  COURSE_FETCH: '강의 수집',
  TIMETABLE_FETCH: '시간표 수집',
  PERSIST: '적재',
} as const;

export const changeTypeLabels = {
  CREATED: '신규', UPDATED: '수정', CLOSED: '폐강', WARNING: '경고',
} as const;

/** changedFields[].field → 한글 (03 §8-4) */
export const fieldLabels: Record<string, string> = {
  titleKr: '과목명(국문)', titleEn: '과목명(영문)', courseCode: '과목코드',
  college: '단과대학', department: '학과', classification: '이수구분',
  area: '이수영역', type: '수업유형', grade: '학년',
  credits: '학점', isEnglishCourse: '원어강의', schedule: '강의실·시간',
};
```

> `fieldLabels` 에 `maxCapacity`·`currentEnrollment` 를 넣지 않는다. **절대 오지 않는 값**이다(D2).

### 9-5. Badge variant 매핑

```typescript
// shared/constants/badgeVariants.ts
export const jobStatusVariant = {
  SUCCESS: 'success', FAILED: 'danger', RUNNING: 'warning',
} as const;

export const strategyVariant = {
  UPSERT: 'muted', REPLACE: 'neutral-strong', INITIAL: 'muted',
} as const;
```

### 9-6. 4상태 구현

모든 데이터 영역은 **Loading / Empty / Error / Data** 를 전부 구현한다(`01 §9`).

| 영역 | Loading | Empty | Error |
|---|---|---|---|
| 카드 1·2 | Skeleton | — | Error State + [다시 시도] |
| 이력 테이블 | Skeleton **5행** | "업데이트 이력이 없어요." | Error State + [다시 시도] |
| 인라인 확장 | Skeleton **3행** | 해당 탭 "항목이 없어요." | Error State |

### 9-7. 페이지 이탈 보호 — 미적용

USS 에는 장시간 편집 폼이 없다(로그인·모달 뿐). **`beforeunload`·`useBlocker` 를 구현하지 않는다.**

> Job 실행 중 이탈은 문제가 되지 않는다. 서버가 비동기로 계속 처리하고, 재진입 시 `runningJobId` 로 폴링이 재개된다(§10-4).

---
## 10. SYNC_MAIN 상세 동작

가장 복잡한 화면이다. 아래 흐름이 구현의 중심이다.

### 10-1. 진입 시퀀스

```
SyncMainPage mount
  ├─ GET /semesters/display      → 카드 1
  └─ GET /courses/summary        → 카드 2 + 이력 갱신 트리거 + runningJobId
  └─ GET /sync/jobs?page=1       → 이력 테이블

summary.runningJobId !== null
  → 즉시 GET /sync/jobs/{id} 폴링 시작 (§10-4)
  → [데이터 업데이트] 버튼 비활성 + 툴팁 "업데이트가 진행 중이에요."
```

### 10-2. 카드 2 렌더 분기

| 조건 | 표시 |
|---|---|
| `semester === null` | "아직 적재된 데이터가 없어요." + 건수 숨김 |
| `semester !== null` | `{연도}학년도 {학기}` + **강의·시간표 건수를 `text-metric`** 으로 |
| `lastJob === null` | "업데이트 이력이 없어요." + 변경 요약 행 숨김 |
| `lastJob.status !== 'SUCCESS'` | 카운트 3종이 `null` → 변경 요약 행 숨김 |
| `runningJobId !== null` | 진행률 표시 + 버튼 비활성 |

### 10-3. Job 실행 흐름 (M2 → M3/M4 → 실행)

```
[데이터 업데이트] 클릭
  ↓ M2 오픈 (초기값 = 현재 적재 학기, 없으면 표시 학기)
[다음] 클릭
  ↓ POST /sync/preflight { academicYear, term }
  ↓ 응답의 strategy 를 state 에 보관   ← 재계산 금지
  ├─ UPSERT  → M3
  ├─ REPLACE → M4 (deleteCounts 표시 + Strict Match)
  └─ INITIAL → M3 변형 (01 §7-5)
실행 버튼 클릭
  ↓ POST /sync/jobs { academicYear, term, expectedStrategy }
  ├─ 202 { jobId } → 모달 닫기 → 폴링 시작
  ├─ 409 / 5200 → 모달 닫기 + 토스트 + summary 재조회
  └─ 409 / 5201 → 모달 닫기 + 토스트 + summary 재조회 (재시도 금지)
```

> ⚠️ **`expectedStrategy` 는 preflight 응답을 그대로 되돌려 보낸다.** 클라이언트가 전략을 계산하지 않는다(D4).
> ⚠️ **409 를 자동 재시도하지 않는다.** 관리자가 M2 부터 다시 진행해야 한다.

#### M4 Strict Match

```typescript
const expected = `${academicYear}-${termLabels[term]}`;  // 예: "2026-여름계절학기"
const canSubmit = input === expected;                     // 공백·문자 정확 일치
```
- 실행 버튼은 `canSubmit` 일 때만 활성. Destructive variant.
- ESC / 외부 클릭 / X → 닫힘 + **입력값 초기화**.
- ⚠️ M4 문구는 **격식체 유지**(`DS-00 §6`). 구어체로 통일하지 않는다.

### 10-4. 폴링 (핵심)

```typescript
const { data: job } = useQuery({
  queryKey: syncKeys.job(jobId),
  queryFn: () => fetchJob(jobId),
  enabled: jobId !== null,
  refetchInterval: (query) => {
    const s = query.state.data?.status;
    return s === 'RUNNING' ? 2000 : false;   // 종료 시 자동 중단
  },
});
```

**종료 시 처리**

| status | 동작 |
|---|---|
| `SUCCESS` | 폴링 중단 · `summary`·`jobs` invalidate · Success 토스트 "업데이트를 마쳤어요." |
| `FAILED` | 폴링 중단 · invalidate · Error 토스트 · **이력 최상단 행 자동 확장** |

**재개 조건** — 새로고침·재진입 시 `summary.runningJobId` 가 non-null 이면 그 값으로 폴링을 시작한다. 이것이 진행률 유실을 막는 유일한 장치다.

### 10-5. 진행률 렌더

```typescript
function progressText(p: SyncProgress): string {
  return `업데이트 진행 중 · ${phaseLabels[p.phase]}`;   // 강의 수집 / 시간표 수집 / 적재
}
```

| phase | 표기 |
|---|---|
| `COURSE_FETCH` | `업데이트 진행 중 · 강의 수집` |
| `TIMETABLE_FETCH` | `업데이트 진행 중 · 시간표 수집` |
| `PERSIST` | `업데이트 진행 중 · 적재` |

> ⚠️ **수치를 넣지 않는다** — 페이지·건수·백분율·남은 시간 모두 (사용자 결정 2026-08-11).
> `progress` 가 `null` 인 첫 폴링 응답 전에는 `업데이트 진행 중` 만 쓴다(`01 §8-1`).

> ⚠️ **폴링 갱신에 트랜지션을 걸지 않는다**(`DS-01 §4-3`). 2초마다 화면이 움직이면 산만하다.

### 10-6. 이력 테이블 · 인라인 확장

```typescript
const [expandedJobId, setExpandedJobId] = useState<number | null>(null);
// 행 클릭 → 같은 id면 접기, 다르면 교체 (동시에 1행만)
```

**확장 시**
```
GET /sync/jobs/{id}                      → 메타(실행자·소요·수집 건수) + 탭 건수
GET /sync/jobs/{id}/details?changeType=  → 기본 탭 목록
```

**기본 탭 선택**
```typescript
const ORDER = ['CREATED', 'UPDATED', 'CLOSED', 'WARNING'] as const;
const counts = { CREATED: createdCount, UPDATED: updatedCount,
                 CLOSED: closedCount,  WARNING: warningCount };
const defaultTab = ORDER.find((t) => (counts[t] ?? 0) > 0) ?? 'CREATED';
// 건수 0 인 탭은 disabled
```

**[더 보기]** — `useInfiniteQuery`, `page` 를 1씩 증가시켜 10건씩 누적. `hasNextPage === false` 면 버튼 숨김.

**실패 Job 확장** — 탭·목록 대신 `failureReason` 을 경고 블록으로 표시하고 "변경 사항은 적용되지 않았어요." 를 덧붙인다. `partiallyApplied === true` 면 "부분 적용" 을 함께 표시한다.

**변경 내용 렌더 (수정 탭)**
```
{fieldLabels[field]}
{before}
→ {after}
```
여러 필드면 줄바꿈으로 반복한다.

### 10-7. 표시 학기 (M1)

```
[학기 설정] → M1 오픈 (초기값 = 현재 설정값)
연도: 현재 연도 ±2 (5개)  /  학기: TERM_ORDER 순서
변경 없으면 [저장] 비활성
[저장] → PUT /semesters/display → semesterKeys.display invalidate
       → Success 토스트 "표시 학기를 변경했어요."
```

> ⚠️ **카드 2(적재 학기)를 건드리지 않는다**(D10). 두 값이 달라도 경고를 띄우지 않는다.

---

## 11. MSW Mock 전략

백엔드 엔드포인트 9개가 **전부 미구현**이므로 MSW 로 프론트를 단독 완주한다.

### 11-1. 구성

```
src/mocks/
├─ browser.ts     setupWorker
├─ handlers.ts    9개 엔드포인트
└─ db.ts          in-memory 상태 (semester · courses · jobs · details)
```

```typescript
// main.tsx
if (env.VITE_USE_MSW === 'true') {
  const { worker } = await import('@/mocks/browser');
  await worker.start({ onUnhandledRequest: 'warn' });
}
```

### 11-2. Job 폴링 시뮬레이션 (가장 중요)

`POST /sync/jobs` 호출 시 in-memory job 을 만들고 타이머로 단계를 전이시킨다.

```
t=0s   RUNNING · COURSE_FETCH
t=8s   RUNNING · TIMETABLE_FETCH
t=16s  RUNNING · PERSIST
t=22s  SUCCESS  (카운트·details 채움)
```

> **세 단계를 모두 거치게 한다.** 단계가 바뀔 때 문구가 따라 바뀌는지가 이 시뮬레이션의 목적이다.

### 11-3. 재현해야 할 시나리오

| # | 시나리오 | 목적 |
|---|---|---|
| 1 | `semester === null` (최초 적재) | 카드 2 Empty + `INITIAL` 전략 |
| 2 | `lastJob === null` | 이력 Empty |
| 3 | UPSERT / REPLACE / INITIAL 3종 preflight | M3·M4·M3변형 분기 |
| 4 | Job `SUCCESS` (카운트 4종 + details 4탭) | 확장 영역 |
| 5 | Job `FAILED` (`failureReason`) | 실패 확장 |
| 6 | `partiallyApplied === true` | 부분 적용 표시 |
| 7 | `RUNNING` 중 재요청 → **409 / 5200** | 동시 실행 거부 |
| 8 | preflight 후 학기 강제 변경 → **409 / 5201** | 전략 불일치 |
| 9 | 새로고침 시 `runningJobId` non-null | 폴링 재개 |
| 10 | 401 → refresh 성공 / 실패 | 인터셉터 |
| 11 | 500 응답 | Error State |
| 12 | `warningCount > 0` 인데 `SUCCESS` | D12 검증 |

### 11-4. 실서버 전환

`VITE_USE_MSW=false` 로 끄면 그대로 실서버를 호출한다. 핸들러는 **`03` 계약과 1:1** 이어야 하며, 계약과 다른 mock 을 만들면 전환 시 전부 깨진다.

---
## 12. 단계별 구현 가이드 (Step 1~7)

각 Step 종료 시 게이트(typecheck·token-lint·build) 통과 → 리뷰 패킷 제출 → **사용자 승인 후 다음 단계.**

### Step 1 — 프로젝트 셋업

| 항목 | 내용 |
|---|---|
| 작업 | Vite + React + TS 스캐폴드, Tailwind, shadcn/ui init, alias `@/`, env(Zod), 폴더 생성, 빈 라우터 2개 |
| **토큰 배선** | `globals.css`(CSS 변수) + `tailwind.config.ts` 에 **`DS-01` 전체** 정의 |
| ⚠️ 주의 | shadcn 기본 `--radius`(6px) **재정의** → card 14 / button 10 / modal 16 |
| ⚠️ 주의 | 제거 토큰을 **정의하지 않는다**: `sidebar-width`·`menu-gap`·`border-active-menu`·`border-changed-input`·`primary-bg-badge`·`info`·`accent`·`display` |
| 완료 기준 | `/`·`/login` 이 404 없이 매칭. `npm run build` 성공. token-lint 통과 |

### Step 2 — 인프라

| 항목 | 내용 |
|---|---|
| 작업 | `apiClient`(1개), `tokenManager`, `refreshQueue`(401 재발급을 동시에 1건만), `errorHandler`, `types.ts`, QueryClient, sonner Toaster |
| | `shared/constants/` 5종, `shared/lib/` 3종 |
| | **MSW 셋업** + `db.ts` 골격 |
| 완료 기준 | 401 → refresh 1회 → retry 동작. refresh 실패 시 `/login` + 토스트 |
| ⚠️ 주의 | `authApiClient` 를 만들지 않는다. `/auth/login`·`/auth/refresh` 를 401 인터셉터 예외 처리 |

### Step 3 — ADMIN_LOGIN + 라우트 가드

| 항목 | 내용 |
|---|---|
| 참조 | `01 §5`, `03 §3-1`, `DS-01 §6-1` |
| 작업 | LoginLayout, 로그인 폼(RHF+Zod), auth store, `protectedLoader` |
| 검증 | loginId 필수·50자 / password 필수·100자. 미입력은 **요청 미발송** |
| 실패 표시 | 401(5000) → **카드 하단 인라인 에러**(토스트 아님) "아이디나 비밀번호가 맞지 않아요." |
| ⚠️ 주의 | 입력창은 **Fill 방식**(`DS-01 §6-1`). Outline 아님 |
| 완료 기준 | 비로그인 `/` 접근 → `/login` 리다이렉트. 로그인 성공 → `/` 이동 + 헤더에 이름 표시 |

### Step 4 — SYNC_MAIN 골격

| 항목 | 내용 |
|---|---|
| 참조 | `01 §4, §6-1~6-4, §9`, `03 §4-1, §5-1, §6-3` |
| 작업 | MainLayout + Header, 카드 1(표시 학기), 카드 2(적재 데이터), 이력 테이블 + Pagination |
| | `StatusBadge`, `DataTable`, `EmptyState`/`ErrorState`/`LoadingSkeleton` |
| 시각 | 카드 **보더 없음** + `shadow-card` + radius 14. 건수는 `text-metric`. 테이블도 카드로 감싼다 |
| 완료 기준 | 4상태 전부 동작. 페이지네이션 10행. `semester`·`lastJob` null 분기 확인 |
| 미구현 | 모달·Job 실행·확장 (Step 5·6) |

### Step 5 — Job 흐름 (가장 무거움 · 4 하위단계)

**5-1. M1 표시 학기**
- `GET`/`PUT /semesters/display`, 연도 ±2, `TERM_ORDER` 순서, 변경 없으면 [저장] 비활성
- ⚠️ 카드 2 를 건드리지 않는다(D10)

**5-2. M2 + preflight**
- 초기값 = 현재 적재 학기(없으면 표시 학기)
- `POST /sync/preflight` → `strategy` **보관** → M3/M4/M3변형 분기
- 판정 중 [다음] 비활성 + spinner

**5-3. M3 · M4 · 최초 적재 변형**
- M3(400px, 구어체) / M4(480px, **격식체 유지**, destructive, Strict Match) / M3변형
- `POST /sync/jobs` + `expectedStrategy` 동봉
- 409/5200·5201 → 모달 닫기 + 토스트 + summary 재조회. **재시도 금지**

**5-4. 폴링**
- `refetchInterval` 조건부, 종료 시 `false`
- `SUCCESS`/`FAILED` 분기 처리
- **진입 시 `runningJobId` 로 자동 재개**
- 진행률은 단계만 표기 — `업데이트 진행 중 · {단계}`
- ⚠️ 트랜지션 금지

| 완료 기준 |
|---|
| 3전략 분기 정확. 409 2종 처리. 새로고침 후 폴링 재개. 단계 전이 표기 |

### Step 6 — 인라인 확장

| 항목 | 내용 |
|---|---|
| 참조 | `01 §6-5`, `03 §6-4, §6-5` |
| 작업 | `Expandable Row`(동시 1행), 메타 행, `Tab Group`(0건 비활성), 목록 + [더 보기](`useInfiniteQuery`) |
| | 수정 탭 `Field Diff`, 경고 탭 `Warning Row`, 실패 Job 확장 |
| 완료 기준 | 기본 탭 = 0 아닌 최좌측. 10건씩 누적. 실패 Job 은 `failureReason` 표시 |

### Step 7 — QA & 통합 검증

**시나리오 14개**

| # | 시나리오 |
|---|---|
| 1 | 비로그인 `/` 접근 → `/login` |
| 2 | 로그인 성공 → `/` + 헤더 이름 |
| 3 | 로그인 실패(5000) → 인라인 에러 |
| 4 | 토큰 만료 → refresh 자동 → retry 성공 |
| 5 | refresh 실패 → `/login` + "다시 로그인해주세요." |
| 6 | `semester === null` → 카드 2 Empty + `INITIAL` |
| 7 | UPSERT → M3, REPLACE → M4, INITIAL → M3변형 |
| 8 | M4 Strict Match 오타 → 실행 버튼 비활성 |
| 9 | `RUNNING` 중 재요청 → 409/5200 토스트 |
| 10 | preflight 후 상태 변경 → 409/5201 → 모달 닫힘 |
| 11 | Job 실행 중 새로고침 → 폴링 재개 |
| 12 | 단계 전이(수집 → 적재) → 진행률 문구가 따라 바뀜 |
| 13 | 실패 Job 확장 → `failureReason` + 최상단 자동 확장 |
| 14 | `warningCount > 0` + `SUCCESS` → 경고 탭 활성, 배지는 성공 |

**DS 일관성 점검**

- 토큰만 사용(raw hex·arbitrary 없음) · 제거 토큰 미참조
- 카드 보더 없음 + shadow · radius 14/10/16
- 타이포 위계(`metric` 적용) · Primary 5~10%
- Badge variant(갱신 muted / 교체 neutral-strong)
- 모달 폭 400/480 · 4상태 전부
- **문구 어조**: 구어체, M4 만 격식체

---

## 13. 백엔드 추가 요청 사항

프론트 관점에서 `03` 에 이미 반영됐거나 확인이 필요한 항목이다.

### 13-1. 반영 완료

| # | 항목 | 위치 |
|---|---|---|
| 1 | `/auth/login`·`/auth/refresh` 응답에 **`name`** | `03 §3-1, §3-2` |
| 2 | `/courses/summary` 에 **`runningJobId`** | `03 §5-1` |
| 3 | `POST /sync/jobs` 의 **`expectedStrategy`** 검증 → 409/5201 | `03 §6-2` |
| 4 | `progress` 는 `{ phase }` 만 — 정량 수치 없음 | `03 §7` |

### 13-2. 확인 필요

| # | 항목 | 영향 |
|---|---|---|
| 1 | `RUNNING` Job 유일성을 **DB 제약**으로 보장 | 미보장 시 동시 요청이 둘 다 통과해 Job 중복 |
| 2 | `03 §11-1` 실측 8항목 | 수집량. 결과에 따라 `03` 수정 |
| 3 | CORS — 백오피스 도메인 화이트리스트 | 미설정 시 로컬 개발 불가 |
| 4 | 관리자 계정 시드(Flyway) | 로그인 테스트 선행 조건 |

### 13-3. 알려진 한계 (수용)

| 항목 | 내용 |
|---|---|
| 토큰 무효화 불가 | `/auth/logout` 부재. 최대 2시간 유효 |
| 무기한 재발급 | 만료 토큰으로 refresh 가능(기존 서버 동작 승계) |
| access 토큰 localStorage | refresh 부재로 인한 절충 (§6-3) |

---

**관련 문서**: `01` v1.2 · `03` v1.1 · `DS-00_uss_overview` · `DS-01_uss_design_system`
