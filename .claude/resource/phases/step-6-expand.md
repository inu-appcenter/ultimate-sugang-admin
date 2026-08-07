# Step 6 — 인라인 확장

## 참조
> 괄호 안은 **행 범위**다. `Read` 의 `offset`/`limit` 으로 그 부분만 읽는다.

`01 §6`(148-282, 그중 §6-5 인라인 확장) · `03 §6`(421-774, 그중 §6-4·§6-5) · `04 §10`(730-876)

## 절차
1. `Expandable Row` — 행 클릭 확장. **동시에 1행만**(`expandedJobId` state).
2. 확장 시 `GET /sync/jobs/{id}` → 메타(실행자·소요·수집 건수) + 탭 건수.
3. `Tab Group` — 신규/수정/폐강/경고. **0건 탭 비활성**, 기본 = 0 아닌 최좌측.
4. `GET /sync/jobs/{id}/details?changeType=&page=` — `useInfiniteQuery`, 10건씩 누적.
5. [더 보기] — `hasNextPage === false` 면 숨김.
6. 수정 탭 `Field Diff` — `{fieldLabels[field]}` / `{before}` / `→ {after}`. 여러 필드는 줄바꿈.
7. 경고 탭 `Warning Row` — 학수번호 + 사유. `courseName` null 가능.
8. 실패 Job 확장 — 탭 대신 `failureReason` 경고 블록 + "변경 사항은 적용되지 않았어요."
9. `partiallyApplied === true` → "부분 적용" 표시.

## ⚠️ 주의
- 확장 영역 skeleton 3행.
- 빈 탭 → "항목이 없어요."
- `changeType` 은 **필수 쿼리**. 전체 조회 없음.

## 출력
탭 전환·더보기·실패 Job 표시 동작.

## 다음
`step-7-qa.md`
