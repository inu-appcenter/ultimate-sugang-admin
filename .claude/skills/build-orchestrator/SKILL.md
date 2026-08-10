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
   - `OK` → green 커밋. 커밋과 push 는 **`commit-push` 스킬**로 한다(브랜치·메시지 형식은 [[git-convention]]).
   - `FAIL` → 사유 보고 부분만 자가수정 후 재실행. **한도 3회**(`build-state.json.retry[항목ID]`). 초과 → 더 고치지 말고 `manual_review` 에 기록하고 멈춰 보고.
6. **리뷰 (화면 항목 `step-3` ~ `step-6` — 미종결 방지, `checks/validate-state.mjs` 가 강제).**
   게이트 green·커밋 후 **`spec-conformance-reviewer` + `ds-conformance-reviewer` 를 각 1회 호출한다.**
   리뷰어는 판정하지 않고 **지적만 모은다.** 받은 지적을 그대로 `harness/review/<항목ID>.json` 에 옮긴다:
   ```jsonc
   {
     "id": "step-5-4:polling",
     "reviewed": { "spec": "2026-08-10", "ds": "2026-08-10" },  // 각 1회 호출한 날짜
     "findings": [
       { "id": "S1", "reviewer": "spec", "ref": "01 §8-1", "text": "", "resolution": "fixed", "note": "커밋 fc17b29" }
     ],
     "plan_reported_at": "2026-08-10",     // 계획을 사용자에게 보고한 날
     "verify": "harness/verify/step-5-4.mjs 29건 (전체 312건). red 확인: …",
     "commit": "fc17b29", "ts": "2026-08-10"
   }
   ```
   순서는 **리스트업 → 계획 → 보고 → 실행** 이다:
   - **리스트업** — 두 리뷰어의 지적을 `findings` 에 전부 적는다. 이 시점에 고치지 않는다.
   - **계획** — 지적마다 처리 방침을 정한다. `resolution` 은 4개뿐: `fixed`(이번에 고침) · `deferred`(다음 단계로) · `dropped`(버림) · `question`(사용자 결정 필요).
   - **보고** — §2 사람 게이트에서 `build-review-packet` §E-2 로 지적과 방침을 함께 낸다. **여기서 멈춘다.**
   - **실행** — 승인 후 `fixed` 만 고친다. 고쳤으면 `--full` 재게이트 후 커밋. **재리뷰는 하지 않는다.**
   - `deferred` 는 **같은 턴에** `build-state.json.deferred` 로 옮긴다(`from` 에 항목 ID). validate-state 가 개수를 대조한다.
   - **재리뷰는 사용자가 요청할 때만 한다.** PASS 를 받으러 다시 부르지 않는다.
   - validate-state 가 COMPLETED 인 `/^step-[3-6](-\d+)?:/` 항목에 **종결된 리뷰 JSON** 을 요구한다 — **Step 5 하위단계 4개도 각각 필요**. 없거나 미종결이면 fast 게이트가 FAIL(Stop 차단)된다.
7. 항목 `COMPLETED`(또는 사유와 함께 `SKIPPED`/`manual-review`) 로 갱신, `log` 추가.

## 2. 사람 게이트 (정지 지점)
- **Step 종료마다**, 그리고 **Step 5 는 4 하위단계 각각마다**(`step-5-1` ~ `step-5-4`) → `build-review-packet` 스킬로 패킷 제출 후 **정지**. 사용자 승인 전 다음 단계로 넘어가지 않는다.

## 3. 비가역/외부 작업
**실제 REPLACE Job 실행**(`POST /sync/jobs` — 학교 데이터 실적재), 배포/publish, force push, `main` 으로의 push, `.env` 비밀값 → **코드 구조만 생성**, 실행은 사람에게 위임. (PreToolUse 훅도 차단) → [[hooks]] · [[antipatterns]]
작업 브랜치 push 는 비가역이 아니다 — `commit-push` 스킬이 처리한다. → [[git-convention]]

## 4. 상태 파일 갱신 규칙
- 한 번에 `IN_PROGRESS` 1개. 끝나면 즉시 다음으로 넘기지 말고 정지 규칙(§2) 확인.
- `retry`·`probes` 는 **항목 ID 로 키잉된 객체**, `manual_review`·`deferred` 는 배열. `log` 와 함께 사실대로 기록한다. 게이트 red 를 green 으로 보고하지 않는다. → [[antipatterns]]
- **`retry` 는 손대지 않는다** — `stop-gate` 훅이 red 마다 자동으로 올린다.
- **원인을 못 밝힌 채 3회 시도했으면 멈춘다**: `probes[항목ID]` 를 올리고 `notes` 에 `unresolved` 태그로 *미규명 사실 + 배제한 가설 + 좁혀진 조건*을 적은 뒤 넘어간다. → [[verification]] §5

## 5. 가장 흔한 오답
**`Authorization: Bearer`·refresh 토큰 저장·`/auth/logout`·`/admin/me`·문자열 에러코드·페이지 크기 20·UTC 변환·16화면·STAGING/promote 는 전부 틀렸다.**
대부분은 `uss-contract-lint` 가 잡지만, 애초에 손이 그리로 가지 않는 편이 빠르다. → [[antipatterns]] · [[api-contract]]

참조 규칙: [[source-of-truth]] · [[decisions]] · [[architecture]] · [[api-contract]] · [[ui-conventions]] · [[good-patterns]] · [[antipatterns]] · [[hooks]]
