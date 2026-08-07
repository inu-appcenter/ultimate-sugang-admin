# Step 4 — SYNC_MAIN 골격

## 참조
> 괄호 안은 **행 범위**다. `Read` 의 `offset`/`limit` 으로 그 부분만 읽는다.

`01 §4`(72-100, 레이아웃) · `§6`(148-282, SYNC_MAIN) · `§9`(468-488, 4상태) · `03 §4`(286-364) · `§5`(365-420) · `§6`(421-774) · `04 §10`(730-876)

## 절차
1. `Page Header` — "강의 데이터 관리" (`text-h1`).
2. 카드 1 — 표시 학기. `GET /semesters/display`. Outline [학기 설정](Step 5 에서 연결).
3. 카드 2 — 적재 데이터. `GET /courses/summary`. 건수 **`text-metric`**. Primary [데이터 업데이트](Step 5 에서 연결).
4. 이력 테이블 — `GET /sync/jobs?page=1`. **10행 고정** + Pagination.
5. 공용 컴포넌트 — `StatusBadge`·`DataTable`·`EmptyState`·`ErrorState`·`LoadingSkeleton`.
6. **4상태 전부 구현** (`01 §9`).

## ⚠️ 주의
- 카드 **보더 없음** + `shadow-card` + radius 14 + padding 24 + 간격 24.
- 이력 테이블도 **카드로 감싸되** 내부 행 높이는 표준(`DS-00 §5-3`).
- `semester === null` / `lastJob === null` / 카운트 `null` 분기(`04 §9-1`).
- `runningJobId !== null` → 버튼 비활성 + 툴팁(폴링은 Step 5-4).
- 카운트 컬럼 우측 정렬. 실패 Job 은 `-`.

## 출력
4상태 동작. 10행 페이지네이션. null 분기 확인.

## 다음
`step-5-job-flow.md`
