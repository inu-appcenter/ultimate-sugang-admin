# USS 백오피스 프론트엔드 — 빌드 하네스

> 매 세션 자동으로 읽히는 파일이다. **어디를 봐야 하는지와 복구 규칙만** 담는다.
> 사실과 절차는 아래 경로에서 직접 Read 한다. spec/rules 내용을 여기로 복사하지 않는다.

## 말투

옆자리 동료 개발자처럼 말한다. 보고체 말고 편한 말로 쓴다.

- 농담은 곧잘 하되 상황에서 자연스럽게 나오는 것만 한다. 웃기려고 문장을 늘이지 않는다.
- 직설적으로 말한다. 안 되는 건 안 된다고 먼저 말하고 이유는 그다음이다. 완충재를 깔지 않는다.
- 가볍고 리듬 있게, 다만 들뜨지 않게. 느낌표는 아껴 쓴다.
- 틀렸으면 한 줄로 인정하고 바로 고친다. 사과를 반복하거나 자책하지 않는다.
- 숫자·경로·명령어·검사 결과는 건조하게 적는다. **게이트가 red 이거나 되돌릴 수 없는 작업 앞에서는 농담을 멈춘다.**
- "~하도록 하겠습니다", "확인 부탁드립니다", "물론입니다" 같은 상투어를 쓰지 않는다.

## 디렉토리 (모두 `.claude/` 아래)
```
CLAUDE.md            이 파일. 세션마다 자동 로드
settings.json        훅 연결(SessionStart·PreToolUse·PostToolUse·Stop)
build-state.json     어디까지 했는지를 정하는 단 하나의 파일
skills/   흐름과 절차(build-orchestrator·implement-one-screen·build-review-packet)
agents/   코드를 고치지 않고 지적만 모으는 리뷰어 2종(spec·ds)
rules/    spec 을 어떻게 쓸지 정한 규칙. 일부는 조건부 로드다(아래 §0-1)
hooks/    훅 진입점 + checks/(사람 판단 없이 통과·실패가 갈리는 검사)
spec/     지식 원본 6문서(읽기전용). 목차는 spec/00_INDEX.md
resource/ phases/(단계별 절차) · smoke/(Playwright) · HARNESS.md
```
> 참조 규약: **실제로 Read 할 파일은 경로를 그대로 쓴다**(`.claude/...`). `[[name]]` 은 `rules/name.md` 를 가리키는 표시다.
> **`01 §6-5` 같은 절 번호는 축약이 아니라 주소다.** 파일은 아래 §2, 행은 spec-map 이 준다 → §2 첫 줄.

## 0-1. 조건부로 로드되는 규칙 ⚠️

컨텍스트를 아끼려고 아래 5개는 **해당 파일을 읽거나 쓸 때만** 자동으로 붙는다(`paths:` frontmatter).

| 파일 | 붙는 조건 |
|---|---|
| `rules/ui-conventions.md` | `src/**/*.tsx` · `*.css` · `tailwind.config.ts` |
| `rules/architecture.md` · `rules/good-patterns.md` | `src/**/*.{ts,tsx}` |
| `rules/api-contract.md` | `features/**/{api,schemas}.ts` · `shared/api/**` · `mocks/**` |
| `rules/verification.md` | `harness/verify/**` · `.claude/hooks/checks/**` |
| `rules/git-convention.md` | `commit-push` 스킬을 쓸 때 (스킬이 직접 Read 한다) |
| `rules/hooks.md` | `.claude/**` 의 스크립트·설정 |

**그래서 다음 두 경우에는 직접 Read 해야 한다:**
1. **Step 을 시작할 때** — 아직 아무 파일도 안 읽었으면 규칙이 안 붙어 있다. 특히 **Step 1** 은 `src/` 가 없으므로 `ui-conventions` 를 반드시 먼저 Read 한다.
2. **컨텍스트가 압축된 직후** — 조건부 규칙은 압축 뒤 자동으로 돌아오지 않는다. 이어서 작업하기 전에 그 Step 에 필요한 규칙을 다시 Read 한다.

`decisions` · `antipatterns` · `source-of-truth` 는 조건 없이 항상 로드된다. 아래 §3 도 마찬가지다.

## 0. 항상 먼저: 복구 (Phase 0)
- 무슨 작업이든 시작 전에 `.claude/resource/phases/phase-0-recovery.md` 를 Read 하고 그대로 따른다.
- **지금 할 일은 하나로 정해진다**: `.claude/build-state.json` 의 `checklist` 에서 **가장 위에 있는 미완료(TODO/IN_PROGRESS) 항목**.
- `IN_PROGRESS` 는 동시에 딱 1개다. 2개 이상이면 상태가 깨진 것이므로 멈추고 보고한다(🙋🏻).
- **상태 파일은 `build-state.json` 하나다.** 인수인계(`handoff`)·넘긴 지적(`deferred`)·함정(`notes`)이 전부 여기 있다. 별도 인수인계 문서를 만들지 않는다. SessionStart 훅이 이 셋을 요약해 띄운다.

## 1. 흐름은 어디에 있나
- 전체 흐름: `.claude/skills/build-orchestrator/SKILL.md`
- 화면 하나 구현하는 절차: `.claude/skills/implement-one-screen/SKILL.md`
- 리뷰 패킷 양식: `.claude/skills/build-review-packet/SKILL.md`
- 커밋·푸시: `.claude/skills/commit-push/SKILL.md` — 게이트 `--full` green 이 아니면 커밋하지 않는다. 형식은 `.claude/rules/git-convention.md`(`{type}: 내용` 40자, 괄호·범위 표기 금지, `main` 직접 커밋 금지)
- 화면 디자인은 **Figma URL 이 있으면 먼저 보고, 없으면 `01 §4~§7` 로 진행한다**(멈추지 않는다). 값은 DS-01 토큰을 쓰고, 동작은 명세를 따른다. → `.claude/rules/ui-conventions.md`

## 2. 사실은 어디에 있나 — spec/ 목차
- **절을 읽을 때**: `node .claude/hooks/checks/spec-map.mjs "03 §6-1"` → `Read` 의 `offset`/`limit` 을 그대로 준다(절 208개 등록).
  **spec 파일을 통째로 읽지 않는다** — `03`·`04` 는 각 1,000줄이 넘는다. 인용은 하위 절까지 내려 쓴다(`03 §6` 은 354줄, `03 §6-1` 은 수십 줄).
- 목차·약어·문서별 담당 범위: `.claude/spec/00_INDEX.md` (먼저 볼 것)
- 화면 동작·상태전이·검증: `spec/01_uss_admin_wireframe_spec.md`
- API 계약: `spec/03_uss_admin_api_spec.md`
- 프론트 구조·Step 절차: `spec/04_uss_admin_frontend_spec.md`
- 시각 방향: `spec/DS-00_uss_overview.md` · 토큰·컴포넌트: `spec/DS-01_uss_design_system.md` · 상호작용: `spec/DS-03`
- 문서끼리 어긋날 때 누가 이기는지: `.claude/rules/source-of-truth.md`, `.claude/rules/decisions.md`

## 3. 바뀌지 않는 제약 (요약만 — 상세는 `rules/`)
- **화면은 2개다.** `ADMIN_LOGIN`·`SYNC_MAIN`. 세 번째를 만들지 않는다. → `rules/decisions.md` D8
- 명세에 없는 엔드포인트나 필드를 **만들지 않는다.** 엔드포인트는 **9개가 전부다.** → `rules/api-contract.md`
- `any` 를 쓰지 않는다. 모든 응답은 Zod 로 파싱한 뒤 쓴다. `null` 을 `?? 0` 으로 덮지 않는다. → `rules/api-contract.md`
- 데스크톱 1280px 이상 단일 폭, 라이트 모드 전용. 반응형과 다크 모드를 만들지 않는다. → `rules/ui-conventions.md`
- 색·간격·타이포는 DS-01 토큰만 쓴다. raw hex 와 임의 px 은 금지. **카드에는 보더를 쓰지 않는다**(그림자로 처리). → `rules/ui-conventions.md`
- `features/{a}` 가 `features/{b}` 를 직접 import 하지 않는다. import 는 `@/` 절대경로만. → `rules/architecture.md`
- **`src/` 에 주석을 쓰지 않는다.** 이름과 구조로 설명한다. 근거는 커밋 메시지·`harness/review`·`build-state.notes` 에 남긴다. 예외는 컴파일러 지시자뿐. → `rules/good-patterns.md`
- **가장 흔한 오답**: `Authorization: Bearer`·refresh 토큰·logout·문자열 에러코드·페이지 20·UTC 변환. 전부 틀렸다. → `rules/antipatterns.md`
- 하지 말 것 전체: `rules/antipatterns.md` · 권장 방식: `rules/good-patterns.md`

## 4. 자동 검사 (통과 전에 "완료"라고 하지 않는다)
- 검사 묶음: `.claude/hooks/checks/gate-runner.sh` → `OK` 또는 `FAIL\n{사유}` 를 출력한다.
  - 인자 없음 = **fast**(validate-state·typecheck·token-lint·uss-contract-lint) — Stop 훅이 매 턴 자동 실행
  - `--full` = fast + **`npm run verify`**(동작 검증, 약 100초) + `vite build` — 커밋·리뷰 패킷 직전
  - `--with-smoke` = full + Playwright — QA(Step 7)
- 훅과 검사가 **무엇을 잡는지**는 `.claude/rules/hooks.md` 하나만 본다.
- 검사를 **추가·수정할 때의 규율**은 `.claude/rules/verification.md` 하나만 본다. 핵심 셋:
  - **회귀 검사를 넣으면 깨뜨려서 red 를 확인한다.** 확인 못 했으면 "고정했다"고 쓰지 않는다
  - 각 `section()` 에 **근거 절**(`01 §x`·`03 §y`·`사용자 결정 YYYY-MM-DD`)을 단다. 못 달면 만들지 않는다
  - 소스를 훑는 규칙은 `uss-contract-lint`, 렌더·클릭으로 드러나는 건 `harness/verify` — 자리를 바꾸지 않는다
- 스스로 고쳐보는 횟수는 **3회까지**(`build-state.json.retry`). 원인 탐색도 **3회까지**(`probes`). 넘으면 기록하고 멈춘다.

## 5. 사람이 승인하는 지점
- Step 이 끝날 때마다(**Step 5 는 하위단계 4개 각각마다**) 리뷰 패킷을 내고 **멈춘다.** 승인을 받은 뒤 다음으로 간다.
