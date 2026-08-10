# 규칙 — 하지 말 것

> 보이면 바로 고친다. 이 파일은 **조건 없이 항상 로드**된다.

## 1. 기계가 잡는 것 — 외우지 말고 검사에 맡긴다

아래는 `hooks/checks/uss-contract-lint.mjs` 와 `token-lint.mjs` 가 **fast 게이트에서 결정적으로 막는다.**
규칙 ID 와 상세는 [[hooks]] 에 있다. 여기서는 "이런 게 막힌다"만 알면 된다.

```
인증 헤더 Authorization/Bearer · refreshToken 저장 · authApiClient 분리
toISOString·new Date() 파싱 · 페이지 크기 20 · 9개 밖의 엔드포인트(/auth/logout·/admin/me 포함)
any·as any·@ts-ignore · ?? 0 / ?? '' · PREVIEW 같은 Job 중간 상태
지운 토큰(sidebar-width·menu-gap·border-active-menu·border-changed-input·primary-bg-badge·text-display·info-*·accent-*)
dark: · 반응형 breakpoint · @media · raw hex · [12px] 임의 값
상대경로 import · features 간 직접 import · auth/semester/sync 외 도메인
금지 라이브러리(emotion·styled-components·Formik·Redux·SWR·moment·dayjs·date-fns)
```

## 2. 사람이 봐야 하는 것 — 검사가 못 잡는다

### 도메인 규칙 ([[decisions]])
- ❌ 클라이언트가 적재 전략을 고르거나 계산하는 UI. 전략은 **서버가 정한다**(D4). `expectedStrategy` 는 preflight 응답을 그대로 되돌려 보내는 대조용이지 입력값이 아니다
- ❌ 표시 학기와 적재 학기가 다르다고 경고하거나 맞추라고 유도하기 (D10). **다른 게 정상이다**
- ❌ 표시 학기를 바꿨다고 데이터 적재를 실행하기 (D10)
- ❌ 미리보기나 2단계 적용 흐름 (D11)
- ❌ 증분 수집이나 마지막 실행일 커서를 요청에 넣기 (D1)
- ❌ `changedFields` 라벨 매핑에 `maxCapacity`·`currentEnrollment` 넣기 (D2)
- ❌ 세 번째 화면 만들기 (D8). 화면은 `ADMIN_LOGIN`·`SYNC_MAIN` 2개뿐이다
- ❌ `courseCount` 를 "활성 과목 수"로 읽기 (D3)
- ❌ `TERM_CODE`(10/20/30/40) 로 학기를 정렬하거나 비교하기. 여름(30)이 2학기(20)보다 크다

### 명세 밖으로 나가기
- ❌ 명세에 없는 필드·쿼리·화면·버튼을 "있으면 좋을 것 같아서" 만들기
- ❌ 불명확한 명세를 짐작으로 채우기 → 멈추고 묻는다(🙋🏻)
- ❌ 아직 확인되지 않은 값(`03 §11-1` 실측 8항목)을 코드에 박기
- ❌ 쿼리 훅 파일을 `hooks.ts` 로 만들기. `04 §4` 는 **`queries.ts`** 다

### 시각 판단
- ❌ 카드에 `border` 쓰기. 카드는 보더 없이 `bg-surface` + `shadow-card` 다
- ❌ 입력창을 Outline 으로 만들기. **Fill 방식**이다
- ❌ shadcn 기본 radius(6px)를 그대로 두기. 카드 14 / 버튼 10 / 모달 16 으로 다시 정의한다
- ❌ 폴링으로 갱신되는 부분에 트랜지션 걸기
- ❌ 사이드바·Breadcrumb·검색/필터 UI. USS 는 **헤더 하나로 끝난다**
- ❌ M4 를 구어체로 바꾸기. **M4 만 격식체**를 유지한다(`DS-00 §6`)
- ❌ shadcn/ui 를 건너뛴 임의 컴포넌트(토큰을 거친 확장만 허용)

### 진행·안전
- ❌ 화면이나 항목을 여러 개 동시에 구현하기. **한 번에 하나**(체크리스트 1항목)
- ❌ 검사가 실패한 상태로 "완료" 라고 말하기 (Stop 훅이 막는다)
- ❌ `IN_PROGRESS` 를 2개 이상 두기
- ❌ `.claude/spec/` 수정하기 (PreToolUse 훅이 막는다)
- ❌ 되돌릴 수 없는 작업을 직접 실행하기: **REPLACE Job 실제 실행**, 배포·publish, force push, `main` 으로의 push, `.env` 비밀값 입력 → **코드 구조만 만들고 사람에게 맡긴다**
- ❌ `main` 에 직접 커밋하기. 작업 브랜치(`{type}/{체크리스트항목}`)를 먼저 만든다 → [[git-convention]]
- ❌ 커밋 제목에 범위 표기(`feat(step-5):`)나 괄호 넣기. `{type}: 내용` 40자 명사형이다
- ❌ 커밋 본문에 상세 근거를 길게 쓰기. 함정은 `build-state.notes`, 리뷰 지적은 `harness/review` 로 간다
- ❌ 409/`5201` 을 자동으로 재시도하기. 사용자가 다시 확인해야 한다
