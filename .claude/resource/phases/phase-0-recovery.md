# Phase 0 — 복구 (항상 먼저)

## 목적
세션 시작·재개 시 **현재 위치**를 확정한다. 이 절차 없이 코드를 건드리지 않는다.

## 읽기 규약
- 각 phase 문서의 참조는 `04 §6`**(240-424)** 처럼 **행 범위**를 달고 있다. `Read` 의 `offset`/`limit` 으로 그 범위만 읽는다. **spec 파일을 통째로 읽지 않는다** — `04` 한 번 통독이 29,000자다.
- 행 범위는 현재 spec 기준이다. spec 은 읽기 전용이라 잘 안 바뀌지만, 범위가 어긋나 보이면 해당 파일에서 `## ` 헤딩을 grep 해 확인한다.
- ⚠️ **압축(compact) 직후에는** `rules/` 중 조건부 로드분이 빠져 있다. 이어서 작업하기 전에 그 Step 에 필요한 규칙을 직접 Read 한다. → `CLAUDE.md §0-1`

## 절차
1. `.claude/build-state.json` Read.
2. `checklist` 에서 **가장 이른 비완료(TODO/IN_PROGRESS) 항목** = 현재 작업.
3. `IN_PROGRESS` 가 **2개 이상이면 상태 손상** → 즉시 멈추고 보고(🙋🏻).
4. `retry >= 3` 이면 `manual_review` 기록 후 멈추고 보고.
5. `node .claude/hooks/checks/spec-presence.mjs` 실행 → `FAIL` 이면 멈추고 보고.
   - Gravit 잔재 문서(`*_gravit_*`·`DS-02_screens.md` 등)가 있으면 **삭제 후 재실행**.
6. 게이트 fast 실행 → red 면 그 수정이 최우선.
7. 현재 항목의 phase 파일을 Read 하고 그대로 따른다.

## phase 매핑
| checklist id | phase 파일 |
|---|---|
| `step-1:setup` | `step-1-setup.md` |
| `step-2:infra` | `step-2-infra.md` |
| `step-3:ADMIN_LOGIN` | `step-3-login.md` |
| `step-4:SYNC_MAIN_shell` | `step-4-sync-shell.md` |
| `step-5-*` | `step-5-job-flow.md` |
| `step-6:expand_detail` | `step-6-expand.md` |
| `step-7:qa` | `step-7-qa.md` |

## 출력
현재 작업 1건 + 게이트 상태를 한 줄로 보고한 뒤 진행한다.
