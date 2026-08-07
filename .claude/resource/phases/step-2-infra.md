# Step 2 — 인프라

## 목적
API 클라이언트 레이어, 인증 배선, 공용 상수·유틸, MSW 셋업.

## 참조
> 괄호 안은 **행 범위**다. `Read` 의 `offset`/`limit` 으로 그 부분만 읽는다.

`04 §6`(240-424, 클라이언트) · `§9`(530-729, 공통 정책) · `§11`(877-933, MSW) · `03 §2`(56-185, 공통 사양)

## 절차
1. `shared/api/client.ts` — **axios 인스턴스 1개**. base `/api/v1/admin`, timeout 30s.
2. Request 인터셉터 — `access-token` 헤더 주입.
3. `tokenManager.ts` — access + name, **localStorage**.
4. `refreshQueue.ts` — 401 이 여러 번 겹쳐도 재발급은 **동시에 1건만** 보낸다. 만료 토큰을 헤더에 실어 `/auth/refresh` 를 1회 부르고, 실패하면 `forceLogout()`.
5. `errorHandler.ts` — `{code:number, message}` → 토스트. 우선순위 `04 §9-2`.
6. `types.ts` — `PaginatedResponse<T>`, `ErrorResponse`.
7. `shared/constants/` — `routes`·`labels`·`errorCodes`·`badgeVariants`·`fieldLimits`.
8. `shared/lib/` — `formatDateTime`·`formatDuration`·`formatNumber`·`cn`.
9. QueryClient + sonner Toaster (`04 §6-6`).
10. **MSW** — `mocks/browser.ts`·`handlers.ts`·`db.ts` 골격 + `main.tsx` 조건부 start.

## ⚠️ 주의
- `authApiClient` 를 만들지 않는다.
- `/auth/login`·`/auth/refresh` 는 **401 인터셉터 예외**.
- `formatDateTime` 은 **문자열 슬라이스**. `new Date()` 파싱 금지.
- `fieldLabels` 에 `maxCapacity`·`currentEnrollment` 를 넣지 않는다.

## 출력
401 → refresh 1회 → retry 성공. refresh 실패 시 `/login` + 토스트. MSW 기동 확인.

## 다음
`step-3-login.md`
