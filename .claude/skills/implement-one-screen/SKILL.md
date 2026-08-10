---
name: implement-one-screen
description: 한 화면(또는 Step 5 하위단계·모달 1개)을 구현하는 표준 절차. build-orchestrator 가 화면/모달 항목을 만났을 때 사용. SoT 읽기 → 스키마→API→훅→컴포넌트→페이지→라우트 → 4상태/상호작용 → 게이트 순서를 강제한다.
---

# 한 화면 구현 표준 절차

**한 번에 한 항목.** 화면/모달 다중 동시 구현 금지. → [[antipatterns]]

> USS 는 화면 2개(`ADMIN_LOGIN`·`SYNC_MAIN`) + 모달 5종(M1~M5)이다. 이 절차의 "화면"은 **모달·Step 5 하위단계에도 그대로 적용**된다.

## 0. Figma 확인 (선택 — 코드를 쓰기 전에 가장 먼저)
- 해당 화면의 **Figma URL 이 있으면** 받아 디자인 컨텍스트 추출(Figma MCP: `get_design_context`·`get_screenshot`·`get_variable_defs`·`get_metadata`). 시각(레이아웃·구성·간격 의도)의 1차 참조.
- **URL 이 없으면 `01 §4~§7` 로 진행 — 중단·질문 안 함.**
- 지켜야 할 선(상세는 `rules/ui-conventions.md` 의 "Figma 를 쓰는 방식"):
  - 값(색·px·타이포)은 **DS-01 토큰으로 매핑**. Figma 에만 있고 토큰에 없는 값 → 가장 가까운 토큰 사용, **새 토큰·raw 값 추가 금지, 질문 금지**.
  - 동작·필드·엔드포인트·검증은 **Figma 가 정하지 않는다** → 01/03/04/[[decisions]].
  - Figma 와 명세가 다르면 **명세를 따르고**, Figma 는 시각을 채우는 데만 쓴다.
- Figma 사용 여부(URL/프레임) / "Figma 부재 → `01 §4~§7` 기반"을 패킷 §C 에 표시.

## 1. SoT 먼저 읽기 (작성 전)
- 동작/검증/상태전이/모달: `01`(해당 화면·모달 섹션) — 인덱스는 `.claude/spec/00_INDEX.md`
- 엔드포인트/필드/응답: `03`(해당 리소스) — **엔드포인트는 9개가 전부.** 명세에 없는 것은 만들지 않는다 → [[api-contract]]
- 프론트 상세 동작/의사코드: `04`(해당 Step 절)
- 시각: §0 Figma(있으면) → **`01 §4~§7`**(USS 화면과 모달의 시각을 정하는 곳) → `DS-03`(상호작용) → `DS-00`(시각 방향) + `DS-01`(토큰·컴포넌트). 값은 **DS-01 토큰만** 쓴다.
  - ⚠️ `DS-03` 은 승계 문서다 — **어느 절을 읽어도 되는지는 `spec/00_INDEX.md` 의 표가 정한다.** ✅ 아닌 절은 읽지 않는다.
- 적용할 결정: [[decisions]] D1~D12 (D4 전략은 서버 판정 · D8 화면 2개 · D10 표시학기↔적재 독립 · D11 미리보기 미채택 · D12 enum 미매핑은 경고)

## 1-b. 빈칸 먼저 뽑기 (코드를 쓰기 전에 — 끝에 몰아 묻지 않는다)

SoT 를 읽자마자 **이 단계에서 명세가 정하지 않는 것**을 목록으로 만든다. 그리고 **한 번에 묻는다**(🙋🏻).

1. phase 문서의 "읽을 것" 목록 밖에서 답을 찾아야 하는 게 있나?
2. `01`·`03`·`04` 가 **서로 다르게** 말하는 게 있나? → [[source-of-truth]] 로 풀리면 풀고, 안 풀리면 질문
3. `build-state.json.deferred` 에서 이 항목을 `target_item` 으로 가진 것 중 `needs: "user"` 인 것
4. 비가역·되돌리기 어려운 선택지가 있나?

**가른다:**
- **동작·데이터·계약**의 빈칸 → 묻는다. 추측으로 채우면 그게 다음 단계까지 굳는다
- **시각**의 빈칸(간격·정렬·문구 톤) → 묻지 않는다. DS-01 토큰과 `01 §4~§7` 로 채우고 진행한다

답을 기다리는 동안 **답과 무관한 부분은 먼저 만든다.** 멈춰서 기다리지 않는다.

> 끝에 몰아 물으면 어떻게 되는지는 이미 겪었다 — 한 단계에서 결정 대기가 4건 쌓였고, 중간에 물어본 1건(destructive 색)만 그 자리에서 끝났다.

## 2. 구현 순서 (`features/{domain}/` 안에서)
도메인은 **`auth` · `semester` · `sync` 3개뿐**이다. → [[architecture]]
1. `schemas.ts` — 응답/폼 Zod 스키마. `z.infer` 로 타입. **`any` 금지, 모든 응답은 parse 후 사용.**
2. `api.ts` — 명세 그대로의 호출. `apiClient` **1개**만 쓴다(인스턴스 분리 금지).
3. `queries.ts` — TanStack Query(queryKey 팩토리, invalidation). 폼은 RHF + zodResolver. ⚠️ 파일 이름은 `hooks.ts` 가 아니라 **`queries.ts`** 다(`04 §4`).
4. `components/` — shadcn/ui 기반, 토큰만. **카드에 보더 금지**(shadow). 
5. `pages/` 얇은 페이지 + 라우트 연결(`@/` alias). `features/{a}` → `features/{b}` 직접 import 금지. → [[architecture]]

## 3. 반드시 포함
- **4상태**: Empty / Loading(skeleton) / Error / Data.
- **상호작용**: confirm 모달(위험도별 variant), 토스트(`message` 우선), 검증(onBlur+제출 전체). → [[ui-conventions]] · [[good-patterns]]
- **문장 어조**: 짧은 구어체 15~25자. 단 **M4 는 격식체**(비가역 경고). → [[ui-conventions]]
- `null` 을 `?? 0` 으로 뭉개지 않는다(진행률 `total` null 분기). 에러코드는 **정수 5000번대**. → [[api-contract]]
- 비가역(**실제 REPLACE Job 실행**)은 **코드 구조만**.

## 4. 마무리
- 토큰 위반/타입/빌드 없는지 게이트 실행: `bash .claude/hooks/checks/gate-runner.sh --full`. green → 항목 ID 로 커밋.
- 커밋 후 **`spec-conformance-reviewer` + `ds-conformance-reviewer`** 호출 → `harness/review/<항목ID>.json` 기록. 둘 다 PASS 여야 `COMPLETED`. → `build-orchestrator` §1-6
- 못 채운 명세/추측 필요 지점은 만들지 말고 패킷에 질문(🙋🏻)으로 남긴다.

참조: [[source-of-truth]] · [[api-contract]] · [[architecture]] · [[ui-conventions]] · [[good-patterns]] · [[decisions]] · [[antipatterns]]
