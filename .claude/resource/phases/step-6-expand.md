# Step 6 — 인라인 확장

## 읽을 것 (이 목록이 전부다 — 규약은 `phase-0-recovery.md` §읽기 규약)

| 절 | 여기서 얻는 것 |
|---|---|
| `01 §6-5` | 인라인 확장 영역 |
| `03 §6-4` · `§6-5` | Job 상세 · 변경 내역 API |
| `04 §10` | SYNC_MAIN 상세 동작 |

> 행은 `node .claude/hooks/checks/spec-map.mjs "03 §6"` 이 준다. 목록 밖의 동작·데이터·계약이 필요해지면 멈추고 묻는다(🙋🏻).

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
