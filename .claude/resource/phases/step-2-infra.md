# Step 2 — 인프라

## 목적
API 클라이언트 레이어, 인증 배선, 공용 상수·유틸, MSW 셋업.

## 읽을 것 (이 목록이 전부다 — 규약은 `phase-0-recovery.md` §읽기 규약)

| 절 | 여기서 얻는 것 |
|---|---|
| `04 §6` | API 클라이언트 레이어 |
| `04 §9` | 횡단 정책 — 에러·폼·null 분기 |
| `04 §11` | MSW 전략 |
| `03 §2` | 공통 사양 — 에러 포맷·페이지네이션·datetime |

> 행은 `node .claude/hooks/checks/spec-map.mjs "03 §6"` 이 준다. 목록 밖의 동작·데이터·계약이 필요해지면 멈추고 묻는다(🙋🏻).

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
