# Phase 0 — 복구 (항상 먼저)

## 목적
세션 시작·재개 시 **현재 위치**를 확정한다. 이 절차 없이 코드를 건드리지 않는다.

## 읽기 규약 (모든 phase 문서에 적용된다 — 각 문서에서 반복하지 않는다)

**1. 읽을 곳은 절 번호로만 적혀 있다. 행은 spec-map 이 준다.**
```bash
node .claude/hooks/checks/spec-map.mjs "03 §6-1"
#   → Read 의 offset / limit 을 그대로 출력한다
```
숫자를 여기에 옮겨 적지 않는다.
**spec 파일을 통째로 읽지 않는다** — `04` 한 번 통독이 29,000자다.
행 범위를 문서에 손으로 박지 않는다. 예전에 박아둔 숫자가 실제로 4줄씩 어긋나 헤딩을 건너뛰고 읽고 있었다.

**2. phase 문서의 "읽을 것" 목록이 그 단계의 전부다.**
- 목록 밖의 **동작·데이터·계약**을 알아야 하면 → **추측하지 말고 멈춰서 묻는다**(🙋🏻).
- 목록 밖의 **시각**(간격·정렬·문구 톤)이 비어 있으면 → DS-01 토큰과 `01 §4~§7` 로 채우고 **진행한다**. 이건 묻지 않는다.
- 그 단계에서 명세가 안 정하는 것들은 **코드를 쓰기 전에 한 번에** 묻는다 → `implement-one-screen` §1-b.

**3. ⚠️ 압축(compact) 직후에는** `rules/` 중 조건부 로드분이 빠져 있다. 이어서 작업하기 전에 그 Step 에 필요한 규칙을 직접 Read 한다. → `CLAUDE.md §0-1`

## 절차
1. `.claude/build-state.json` Read.
2. `checklist` 에서 **가장 이른 비완료(TODO/IN_PROGRESS) 항목** = 현재 작업.
3. `IN_PROGRESS` 가 **2개 이상이면 상태 손상** → 즉시 멈추고 보고(🙋🏻).
4. `retry >= 3` 이면 `manual_review` 기록 후 멈추고 보고. `probes >= 3` 인 항목이 있으면 `notes` 의 `unresolved` 를 먼저 읽는다 — 같은 가설을 다시 밟지 않는다.
5. `deferred` 에서 **현재 항목을 `target_item` 으로 가진 것**을 뽑는다. 이번 단계에서 처리할 목록이다. `needs: "user"` 인 것은 §7 전에 묻는다.
6. `node .claude/hooks/checks/spec-presence.mjs` 실행 → `FAIL` 이면 멈추고 보고.
7. 게이트 fast 실행 → red 면 그 수정이 최우선.
8. 현재 항목의 phase 파일을 Read 하고 그대로 따른다.

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
