---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---
# 규칙 — 권장 방식 (이렇게 한다)

> 근거는 `04_uss_admin_frontend_spec.md`(§6 클라이언트 · §9 공통 정책 · §10 SYNC_MAIN 동작)와 `01`·`03` 이다.
> 하지 말 것은 [[antipatterns]] 에 있다.

## 데이터·타입
- 응답마다 Zod 스키마를 만들고 `z.infer` 로 타입을 얻는다(타입을 손으로 또 쓰지 않는다). 위치는 `features/{domain}/schemas.ts`.
- nullable 은 `.nullable()` 로 **명시한다.** `?? 0` 으로 덮지 않는다 — `null`(아직 정해지지 않음)과 `0`(없음)은 화면에서 다르게 보여야 한다. → [[api-contract]]
- TanStack Query: 도메인마다 **queryKey 팩토리**를 두고, 변경 후에는 관련 키를 invalidate 한다. **창 포커스 refetch 는 끈다.** 파일은 `queries.ts`.

## 인증·에러
- axios 인스턴스는 **1개**(`apiClient`). 요청 인터셉터가 `access-token` 헤더를 넣는다.
- 401 이 오면 **재발급을 동시에 1건만** 보낸다: 만료된 토큰을 `access-token` 헤더에 그대로 실어 `POST /auth/refresh` 를 **한 번** 부르고, 새 토큰으로 원래 요청을 다시 보낸다. 실패하면 토큰을 버리고 `/login` 으로 보낸 뒤 "다시 로그인해주세요." 토스트를 띄운다.
- 에러 문구는 ① 응답 `message` → ② HTTP 상태별 기본 문구 → ③ 네트워크 문구 순서로 고른다. (401 은 토스트 없이 인터셉터가 처리한다)
- 로그아웃(M5 [확인])은 **서버를 부르지 않는다.** `tokenManager.clear()` + `queryClient.clear()` 후 `/login` 으로 이동한다.

## 폼·검증
- React Hook Form + `zodResolver`. onChange 로는 검증하지 않고, onBlur 에서 그 필드만, **제출할 때 전체**를 검증한다.
- 로그인 입력 길이 제한은 `shared/constants/fieldLimits.ts`(loginId 50 / password 100). 빈 값이면 인라인 문구를 띄우고 **요청을 보내지 않는다.**
- M4 는 입력값이 `` `${연도}-${학기명}` `` 과 정확히 같을 때만 실행 버튼이 켜진다. 모달을 닫으면 입력값을 지운다.

## Job 흐름 (핵심 — 01 §8, 03 §6~7)
```
M2 [다음]  → POST /sync/preflight        → strategy 로 M3/M4 분기
M3/M4 실행 → POST /sync/jobs             → 202 { jobId }
           → GET /sync/jobs/{jobId} 2초 폴링
SUCCESS/FAILED → 폴링 중단 + summary·이력 invalidate + 토스트
```
- **들어올 때 이어받기**: `GET /courses/summary` 의 `runningJobId` 가 null 이 아니면 **바로 폴링을 시작한다.** 새로고침하거나 다시 들어와도 진행률이 사라지지 않게 하는 건 이 장치뿐이다.
- 폴링은 TanStack Query 의 `refetchInterval` 로 만들고, 끝난 상태에서 `false` 를 돌려줘 스스로 멈추게 한다.
- `preflight` 가 준 `strategy` 는 **그대로 들고 있다가** `POST /sync/jobs` 의 `expectedStrategy` 로 되돌려 보낸다. 클라이언트가 다시 계산하지 않는다. → [[decisions]] D4
- 409/`5201` 이 오면 모달을 닫고 토스트를 띄운 뒤 `summary` 를 다시 부른다. **자동으로 재시도하지 않는다.**
- `RUNNING` 인 동안에는 [데이터 업데이트] 버튼을 끄고 툴팁을 붙인다.

## 진행률 표시 (03 §7)
- `phase` 의 한글 이름은 **클라이언트가 매핑한다**(`shared/constants/labels.ts`).
- `total === null` 이면 분모 없이 `{단계} 중…`. `total` 이 있으면 `{단계} {current}/{total} 페이지`.
- `phase === 'PERSIST'` 면 단위가 **건수**다. `{적재} {current}/{total}건`.

## 이력·상세
- 확장은 **한 번에 한 행만.** 펼친 행의 `jobId` 하나만 state 로 들고 있는다.
- 탭은 `changeType` 이다. 건수가 0 인 탭은 끄고, 처음 선택은 0 이 아닌 가장 왼쪽 탭이다.
- [더 보기]는 `useInfiniteQuery`(page 를 1씩 올려 10건씩 쌓는다). Job 이 끝난 뒤에는 데이터가 변하지 않으므로 오프셋이 밀릴 걱정을 하지 않아도 된다.

## 진행
- 한 화면이 체크리스트 한 항목이다. 검사 통과 → 커밋 → (Step 이 끝났으면) 리뷰 패킷 → 멈춤. → `.claude/skills/build-orchestrator/SKILL.md`
- **REPLACE Job 을 실제로 돌리면 되돌릴 수 없다.** 코드 구조만 만들고 실행은 사람에게 맡긴다. → [[hooks]]

관련: [[architecture]] · [[api-contract]] · [[ui-conventions]] · [[decisions]]
