---
paths:
  - ".claude/**/*.mjs"
  - ".claude/**/*.sh"
  - ".claude/settings.json"
  - ".claude/build-state.json"
---
# 규칙 — 훅과 검사 (여기가 유일한 출처)

> 훅과 검사에 관한 사실은 **이 파일에만 적는다.** CLAUDE.md 와 resource/HARNESS.md 는 여기를 가리키기만 하고 내용을 다시 쓰지 않는다.
> 연결은 `.claude/settings.json`, 스크립트는 `.claude/hooks/`(진입점)와 `.claude/hooks/checks/`(검사)에 있다.

## rules/ 로딩 방식 (컨텍스트 비용과 직결)
- `paths:` frontmatter가 **없는** 규칙은 매 세션 전량 로드된다: `decisions` · `antipatterns` · `source-of-truth`.
- `paths:` 가 **있는** 규칙은 매칭 파일을 읽거나 쓸 때만 붙는다: `ui-conventions` · `architecture` · `good-patterns` · `api-contract` · `verification` · `hooks`(이 파일).
- ⚠️ 조건부 규칙은 **`/compact` 이후 자동으로 돌아오지 않는다.** 압축 뒤에는 필요한 규칙을 직접 Read 한다. → `CLAUDE.md §0-1`

## hooks/ 구조
- `hooks/` — settings.json 이 직접 부르는 **진입점**: `session-start.mjs` · `pretool-guard.mjs` · `posttool-lint.mjs` · `stop-gate.mjs`
- `hooks/checks/` — 진입점이 부르는 **검사**: `gate-runner.sh`(묶음) · `validate-state.mjs` · `spec-presence.mjs` · `typecheck.sh` · `token-lint.mjs` · `uss-contract-lint.mjs` · `build.sh` · `smoke.sh` · `lint.sh` · `doc-lint.mjs`
- `harness/verify/` — **동작 검증**(jsdom). `--full` 에서 돈다. 검사를 추가·수정하는 규칙은 [[verification]] 하나만 본다.
- `hooks/checks/d4-strategy.mjs` — D4 정규식. `uss-contract-lint`(검사)와 `harness/verify/step-5-2.mjs`(그 규칙이 진짜 잡는지 증명)가 **같은 파일을 공유**한다. 규칙을 고치면 양쪽에 동시 반영된다.

## 연결된 훅 (settings.json)
| 이벤트 | 대상 | 스크립트 | 하는 일 |
|---|---|---|---|
| **SessionStart** | (전체) | `hooks/session-start.mjs` | 이어서 할 항목과 상태 이상, spec/ 파일명 문제를 컨텍스트에 띄운다. **막지 않는다**(exit 0). |
| **PreToolUse** | `Bash`·`Write`·`Edit`·`MultiEdit` | `hooks/pretool-guard.mjs` | 위험하거나 되돌릴 수 없는 작업을 막는다(exit 2). |
| **PostToolUse** | `Write`·`Edit`·`MultiEdit` | `hooks/posttool-lint.mjs` | 방금 고친 `src/**.{ts,tsx}` 만 `eslint --fix`. **막지 않는다**(exit 0). |
| **Stop** | (전체) | `hooks/stop-gate.mjs` | 완료라고 말하기 전에 **fast 검사**를 강제한다. 실패하면 멈춤을 막아(exit 2) 고치게 한다. |

## 검사 묶음 (`hooks/checks/gate-runner.sh`)
`OK` 또는 `FAIL\n{사유}` 를 출력한다.
- **fast**(인자 없음) = `validate-state` + `typecheck` + `token-lint` + `uss-contract-lint`. **Stop 훅이 매 턴 돌린다.**
- **`--full`** = fast + **`verify`**(`npm run verify` — jsdom 동작 검증, 약 100초) + `build`(vite). **커밋과 리뷰 패킷 직전**에 오케스트레이터가 돌린다.
- **`--with-smoke`** = full + Playwright 스모크. **QA(Step 7)**.
- 매 턴 풀빌드를 돌리지 않는 이유가 이 구분이다. Stop 은 가볍게, 의미 있는 지점에서만 무겁게.
- 작업 중 특정 Step 만 보려면 `npm run verify -- step-5`. **커밋 전에는 반드시 `--full` 로 전량**을 돌린다 — 한 Step 수정이 다른 Step 검사를 깨뜨리는 게 이 프로젝트에서 실제로 일어난다.

> `spec-presence` 와 `doc-lint` 는 묶음에 **없다.** 설치 실수와 문서 표기는 빌드를 막을 일이 아니라 알려주면 되는 일이다.
> 수동 실행: `node .claude/hooks/checks/spec-presence.mjs` · `node .claude/hooks/checks/doc-lint.mjs`

## PreToolUse 가 막는 것 (pretool-guard.mjs)
- Bash: `rm -rf /|~|..`, `git push`(`--force` 포함), `gh release|pr merge|repo delete`, npm/yarn/pnpm `publish`, vercel/netlify/firebase/gh-pages 배포·`--prod`, `curl | sh`, `> .claude/spec/` 리다이렉트
- Write/Edit: `.claude/spec/`(**`00_INDEX.md` 만 예외**)와 `.env*` 파일 → spec 은 읽기 전용이고 비밀값은 사람이 넣는다. [[antipatterns]]

## Stop 검사 (stop-gate.mjs → checks/gate-runner.sh fast)
- `package.json` 이 없으면(= Step 1 이전) 검사할 게 없으므로 **통과**시킨다. Step 1 이후 자동으로 켜진다.
- 실패하면 멈춤을 막아 고치게 한다. **스스로 고쳐보는 건 3회까지**(`build-state.json.retry`). 넘거나 `manual_review` 에 올라 있으면 무한 반복을 피하려고 멈춤을 허용하고 사람이 본다.

## 검사별로 무엇을 보나
- **token-lint** — `src/` 의 raw hex 와 arbitrary 값을 찾는다. 토큰 정의 파일은 `token-lint.allow.txt` 로, shadcn 생성물은 `src/components/ui` 경로로 뺀다. → [[ui-conventions]]
- **uss-contract-lint** — 판단이 필요 없는 계약 위반을 잡는다: Gravit 습관(인증 헤더·refresh 토큰·UTC 변환·페이지 20), 9개 밖의 엔드포인트, `any`, `?? 0`, 금지된 Job 상태, 지운 토큰, 다크·반응형, 상대경로 import, features 간 직접 import, 금지 라이브러리. 예외는 `uss-contract-lint.allow.txt` 에 `경로조각::규칙ID` 로 적는다. → [[antipatterns]]
  - ⚠️ 엔드포인트 9개 목록이 이 스크립트 안에도 있다. [[api-contract]] 의 목록을 바꾸면 스크립트도 같이 바꾼다.
  - `d4-strategy` — 클라이언트가 적재 전략 값을 생산하는 것을 막는다(D4). 대상은 `src/features`·`src/pages`·`src/shared` 이고 `src/mocks` 는 서버 역할이라 제외한다.
- **verify**(`npm run verify`) — 렌더·클릭·폴링으로만 드러나는 동작을 본다. **검사를 추가·수정할 때의 규율은 [[verification]] 이 정한다**(red 증명 의무·근거 절 의무·탐색 상한).
- **validate-state** — `IN_PROGRESS` 가 1개 이하인지, checklist `id` 가 겹치지 않는지, `status` 가 {TODO, IN_PROGRESS, COMPLETED, SKIPPED, manual-review} 안에 있는지 본다.
  - **리뷰를 건너뛰지 못하게 막는다**: `COMPLETED` 인 화면 항목은 `harness/review/<id>.json` 이 있고 `spec` 과 `ds` 가 모두 `PASS` 여야 한다. 대상은 **`/^step-[3-6](-\d+)?:/`** — Step 5 하위단계(`step-5-1:M1_semester` 등)까지 포함한다.
- **spec-presence** — `spec/` 에 USS 문서 6개가 **참조와 같은 이름으로** 있는지, **Gravit 문서가 남아 있지 않은지** 본다.
  - 두 가지로 쓰인다: `checkSpecPresence(specDir)`(SessionStart 가 import 한다. 경고 배열을 돌려주고 막지 않는다)와 직접 실행(`OK`/`FAIL`, 필수 누락이나 Gravit 문서가 있으면 exit 1).
  - ⚠️ export 이름과 형태는 `session-start.mjs` 와의 약속이다. 바꾸면 SessionStart 가 깨진다.
  - **있으면 FAIL**: `01_gravit_admin_wireframe_spec.md` · `03_gravit_admin_api_spec.md` · `04_gravit_admin_frontend_spec.md` · `DS-00_overview.md` · `DS-01_design_system.md` · `DS-02_screens.md`. `DS-04_prompt_templates.md` 는 경고만 한다.
- **doc-lint** — `.claude/**/*.md` 의 용어와 표기를 통일한다. 단어만 바꾸면 되는 건 `--fix` 가 처리하고, 문장을 다시 써야 하는 건 보고만 한다.

## 경로 약속 (바꾸면 같이 고칠 것)
- 상태 파일은 **`.claude/build-state.json`** 하나다. 스크립트는 자기 위치 기준 상대경로로 찾는다(`stop-gate.mjs`·`session-start.mjs` → `../build-state.json`, `validate-state.mjs` → `../../build-state.json`).
- `build-state.json` 의 **`retry`·`probes` 는 항목 ID 를 키로 쓰는 객체**(`{"step-3:ADMIN_LOGIN": 2}`)이고 `manual_review`·`deferred` 는 배열이다. 숫자나 문자열로 바꾸면 3회 한도가 동작하지 않는다.
  - **`retry` 는 `stop-gate.mjs` 가 자동으로 올린다.** 손으로 건드리지 않는다. 정규식으로 그 객체만 갈아끼우므로 **`"retry"` 를 여러 줄로 펼쳐 쓰면 안 된다**(한 줄 유지).
  - ⚠️ 항목 ID 에 콜론이 들어 있다(`step-5-4:polling`). 카운터를 렌더링할 때 콜론·콤마에 공백을 넣으면 **키가 망가져 매번 새 키가 생기고 한도에 영영 못 닿는다.** 실제로 한 번 겪었다.
  - **`probes` 는 원인 탐색 횟수**다. 3회를 넘기면 `notes` 에 `unresolved` 로 적고 넘어간다 → [[verification]] §5.
  - **`deferred` 는 다음 단계로 넘긴 지적**이다. `{ from, target_item, text, needs: "user"|"none", status? }`. `target_item` 이 COMPLETED 인데 `status` 가 `resolved`/`dropped` 가 아니면 validate-state 가 FAIL 한다.
- **리뷰 라운드 수(`rounds`)의 출처는 `harness/review/<id>.json` 하나다.** build-state 에 복제하지 않는다(두 곳에 두면 어긋난다). 리뷰어 1종당 **2라운드**를 넘기려면 같은 파일의 `deferred` 또는 `open_questions` 에 남은 지적을 넘긴 기록이 있어야 한다 — 없으면 validate-state 가 FAIL.
- `stop-gate.mjs` 는 같은 디렉토리의 `checks/gate-runner.sh` 를 부른다.
- 스모크 테스트는 `.claude/resource/smoke/` 에 둔다(`checks/smoke.sh` 가 실행한다). **Step 7 전까지는 비어 있는 게 정상이고**, Playwright 가 없으면 건너뛴다.
