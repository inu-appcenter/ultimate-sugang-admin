---
name: build-orchestrator
description: USS 백오피스 빌드의 전체 흐름을 소유한다. "빌드 시작/이어서/계속" 또는 다음에 무엇을 구현할지 정해야 할 때 사용. Phase 0 복구로 재개 지점을 판단하고, 체크리스트 항목을 하나씩 게이트·리뷰 패킷·정지 순으로 진행한다.
---

# 빌드 오케스트레이터

전체 흐름을 여기서 관리한다. **지금 할 일은 `.claude/build-state.json` 의 `checklist` 가 정한다** — 가장 위에 있는 미완료 항목 하나다.

> **USS 범위**: 화면은 `ADMIN_LOGIN`·`SYNC_MAIN` **2개**뿐이고 나머지는 모달 M1~M5 다. 세 번째 화면을 만들지 않는다. → [[decisions]] D8

## 0. 항상 먼저 — Phase 0 복구
`.claude/resource/phases/phase-0-recovery.md` 를 Read 하고 그대로 따른다. (SessionStart 훅이 재개 항목을 미리 띄워준다.)
- 재개 지점 = checklist 의 가장 이른 `TODO`/`IN_PROGRESS`.
- 불변식: `IN_PROGRESS` 는 동시에 정확히 1개. 2개 이상이면 상태 손상 → 멈추고 보고(🙋🏻).
- `node_modules` 처럼 다시 만들 수 있는 것은 없으면 다시 만든다. 이미 완성한 컴포넌트는 그대로 쓴다.

## 1. 항목 1개 처리 루프 (한 번에 하나)
1. 재개 항목을 `IN_PROGRESS` 로 표시(state 갱신).
2. 항목이 속한 `.claude/resource/phases/` 문서의 절차·참조파일을 따른다.
   `step-1-setup` · `step-2-infra` · `step-3-login` · `step-4-sync-shell` · `step-5-job-flow`(4 하위단계) · `step-6-expand` · `step-7-qa`.
3. 화면/모달 구현 항목이면  **`implement-one-screen`** 스킬 절차를 사용 (0단계 = **Figma URL 확인(선택)**, 없으면 `01 §4~§7` 로 진행·중단 없음).
4. 결정 **D1~D12** 적용 → [[decisions]]. 특히 D4(전략은 서버 판정) · D8(화면 2개) · D10(표시 학기 ↔ 적재 독립) · D12(enum 미매핑은 경고).
5. 게이트 실행(커밋 직전): `bash .claude/hooks/checks/gate-runner.sh --full`(QA 는 `--with-smoke`). 매 턴 Stop 훅은 fast 게이트를 자동 실행한다.
   - `OK` → green 커밋(메시지에 항목 ID).
   - `FAIL` → 사유 보고 부분만 자가수정 후 재실행. **한도 3회**(`build-state.json.retry[항목ID]`). 초과 → 더 고치지 말고 `manual_review` 에 기록하고 멈춰 보고.
6. **리뷰 게이트 (화면 항목 `step-3` ~ `step-6` — 미실행 방지, `checks/validate-state.mjs` 가 강제).** 게이트 green·커밋 후 **`spec-conformance-reviewer` + `ds-conformance-reviewer` 를 호출**하고 결과를 `harness/review/<항목ID>.json` 에 기록한다:
   ```jsonc
   {
     "id": "step-5-4:polling",
     "spec": "PASS", "ds": "PASS",          // 둘 다 PASS 여야 COMPLETED 로 갈 수 있다
     "rounds": { "spec": 2, "ds": 2 },      // 리뷰어별 라운드 수. 2 초과면 아래 둘 중 하나가 비어 있으면 안 된다
     "diffs": [ { "round": 1, "reviewer": "spec|ds|both", "verdict": "PASS|FAIL", "finding": "", "fix": "" } ],
     "self_judgements_accepted": [],        // 명세 빈칸을 스스로 채운 판단 중 리뷰어가 인정한 것
     "open_questions": [],                  // 사용자 결정이 필요해 멈춘 것
     "deferred": [],                        // 다음 단계로 넘긴 것 — 같은 턴에 build-state.deferred 로 옮긴다
     "verify": "harness/verify/step-5-4.mjs 29건 (전체 312건). red 확인: …",
     "commit": "349840b", "ts": "2026-08-10"
   }
   ```
   - **`spec`·`ds` 모두 `PASS` 인 증거가 있을 때만** 항목을 `COMPLETED` 로 전환한다(7).
   - 하나라도 `FAIL`/DIFF → 수정 → 재게이트(`--full`) → 재리뷰. **자가수정 한도 3회**(`retry` — `stop-gate` 가 자동으로 센다).
   - **재리뷰는 범위를 좁혀 부른다**: 1라운드 지적 항목 + 그 수정이 닿은 파일만. 전체 재검토를 반복하면 새 라운드가 새 지적을 부른다.
   - **리뷰어 1종당 라운드 상한 2.** 3라운드째로 가려면 남은 지적을 그 항목 review json 의 `deferred`(다음 단계로) 또는 `open_questions`(사용자 결정 대기)로 **넘긴 기록을 먼저 쓴다.** 안 쓰면 validate-state 가 FAIL 한다.
   - `deferred` 에 쓴 항목은 **같은 턴에** `build-state.json.deferred` 로 옮긴다. 리뷰 파일에만 두면 아무도 안 읽는다.
   - validate-state 가 COMPLETED 인 `/^step-[3-6](-\d+)?:/` 항목에 **통과 리뷰 JSON** 을 요구한다 — **Step 5 하위단계 4개도 각각 필요**. 없거나 미통과면 fast 게이트가 FAIL(Stop 차단)된다.
7. 항목 `COMPLETED`(또는 사유와 함께 `SKIPPED`/`manual-review`) 로 갱신, `log` 추가.

## 2. 사람 게이트 (정지 지점)
- **Step 종료마다**, 그리고 **Step 5 는 4 하위단계 각각마다**(`step-5-1` ~ `step-5-4`) → `build-review-packet` 스킬로 패킷 제출 후 **정지**. 사용자 승인 전 다음 단계로 넘어가지 않는다.

## 3. 비가역/외부 작업
**실제 REPLACE Job 실행**(`POST /sync/jobs` — 학교 데이터 실적재), 배포/publish, `git push`, `.env` 비밀값 → **코드 구조만 생성**, 실행은 사람에게 위임. (PreToolUse 훅도 차단) → [[hooks]] · [[antipatterns]]

## 4. 상태 파일 갱신 규칙
- 한 번에 `IN_PROGRESS` 1개. 끝나면 즉시 다음으로 넘기지 말고 정지 규칙(§2) 확인.
- `retry`·`probes` 는 **항목 ID 로 키잉된 객체**, `manual_review`·`deferred` 는 배열. `log` 와 함께 사실대로 기록한다. 게이트 red 를 green 으로 보고하지 않는다. → [[antipatterns]]
- **`retry` 는 손대지 않는다** — `stop-gate` 훅이 red 마다 자동으로 올린다.
- **원인을 못 밝힌 채 3회 시도했으면 멈춘다**: `probes[항목ID]` 를 올리고 `notes` 에 `unresolved` 태그로 *미규명 사실 + 배제한 가설 + 좁혀진 조건*을 적은 뒤 넘어간다. → [[verification]] §5

## 5. Gravit 에서 넘어오기 쉬운 것
이 하네스는 Gravit 백오피스에서 가져왔다. **`Authorization: Bearer`·refresh 토큰 저장·`/auth/logout`·`/admin/me`·문자열 에러코드·페이지 크기 20·UTC 변환·16화면·STAGING/promote 는 전부 오답이다.**
대부분은 `uss-contract-lint` 가 잡지만, 애초에 손이 그리로 가지 않는 편이 빠르다. → [[antipatterns]] · [[api-contract]]

참조 규칙: [[source-of-truth]] · [[decisions]] · [[architecture]] · [[api-contract]] · [[ui-conventions]] · [[good-patterns]] · [[antipatterns]] · [[hooks]]
