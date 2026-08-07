# Step 5 — Job 흐름 (4 하위단계)

> **하위단계마다 리뷰 패킷 제출 후 정지.** 한 번에 몰아 구현하지 않는다.

## 참조
> 괄호 안은 **행 범위**다. `Read` 의 `offset`/`limit` 으로 그 부분만 읽는다.

`01 §7`(283-420, 모달) · `§8`(421-467, Job 상태) · `03 §4`(286-364) · `§6`(421-774) · `§7`(775-835, 진행률) · `04 §10`(730-876) · `rules/decisions.md` D4·D10·D11

## 5-1. M1 표시 학기
- `GET`/`PUT /semesters/display`. 연도 현재±2, 학기 `TERM_ORDER` 순서.
- 초기값 = 현재 설정값. 변경 없으면 [저장] 비활성.
- 성공 → `semesterKeys.display` invalidate + 토스트 "표시 학기를 변경했어요."
- ⚠️ **카드 2 를 건드리지 않는다**(D10). 불일치 경고 UI 금지.

## 5-2. M2 + preflight
- 초기값 = 현재 적재 학기(없으면 표시 학기).
- `POST /sync/preflight` → 응답 `strategy` 를 **state 에 보관**(재계산 금지).
- 판정 중 [다음] 비활성 + spinner.
- 분기: `UPSERT`→M3 / `REPLACE`→M4 / `INITIAL`→M3 변형(`01 §7-5`).

## 5-3. M3 · M4 · 최초 적재
- M3 400px 구어체 / M3변형 400px / **M4 480px destructive + Strict Match**.
- M4 입력값 === `` `${연도}-${termLabels[term]}` `` 정확 일치 시에만 실행 활성.
- ⚠️ **M4 문구는 격식체 유지**(`DS-00 §6`). 구어체로 통일하면 위반.
- ESC/외부클릭/X → 닫힘 + M4 는 입력값 초기화.
- `POST /sync/jobs { academicYear, term, expectedStrategy }`.
- 409/5200·5201 → 모달 닫기 + 토스트 + `summary` 재조회. **자동 재시도 금지.**

## 5-4. 폴링
- `refetchInterval` 조건부(RUNNING 2000, 그 외 false).
- `SUCCESS` → invalidate + 토스트 / `FAILED` → 토스트 + 최상단 행 자동 확장.
- **진입 시 `summary.runningJobId` non-null → 자동 재개.**
- `total === null` → `{단계} 중…`. `PERSIST` 단위 **건**.
- ⚠️ 폴링 갱신에 **트랜지션 금지**.

## 출력
3전략 분기, 409 2종, 새로고침 후 재개, `total null` 표기 확인.

## 다음
`step-6-expand.md`
