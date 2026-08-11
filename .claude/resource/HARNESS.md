# USS 백오피스 빌드 하네스 — 설치/사용

> 이 하네스를 다른 repo 나 계정에서 돌릴 때 보는 설치·사용 안내다. **훅과 검사에 관한 사실은 `.claude/rules/hooks.md` 에만 적는다** — 여기서 다시 쓰지 않는다.

## 설치
1. 이 `.claude/` 트리를 빌드용 빈 repo 루트에 복사(하네스 전체가 `.claude/` 아래에 통합).
2. `.claude/spec/` 에 SoT 문서를 **아래 정확한 파일명 그대로** 투입(읽기전용). 에이전트가 이 이름으로 Read 하므로 **이름이 다르면 경로가 깨진다.**
   - `01_uss_admin_wireframe_spec.md` · `03_uss_admin_api_spec.md` · `04_uss_admin_frontend_spec.md`
   - `DS-00_uss_overview.md` · `DS-01_uss_design_system.md` · `DS-03_interactions.md`(승계 문서 — 절별 적용 범위는 `00_INDEX`)
   - `00_INDEX.md` 는 하네스 트리에 동봉(인덱스·약어 매핑). **02 번호는 백엔드 몫이라 부재(누락 아님).**
   - ⚠️ **원본이 버전 접미사를 달고 있으면(예: `03_uss_admin_api_spec_v1_1.md`) 반드시 접미사 없는 이름으로 리네임**해서 넣는다.
   - ⚠️ **위 7개 밖의 `.md` 를 `spec/` 에 두지 않는다.** 허용 목록 방식이라 남아 있으면 `spec-presence` 가 **FAIL** 한다.
   - 점검: `node .claude/hooks/checks/spec-presence.mjs` → `OK` 또는 `FAIL\n{사유}`. SessionStart 훅도 세션 시작 시 비차단 경고로 알린다.
3. Node 18+ 설치 확인(게이트/훅이 node 사용).
4. Claude Code 에서 repo 를 열면 `.claude/CLAUDE.md`·`.claude/rules/` 자동 로드, `.claude/settings.json` 훅 활성, `.claude/skills`·`.claude/agents` 인식. **SessionStart 훅이 재개 항목을 띄운다.**
5. Figma Dev Mode MCP 연결은 직접 수행(프레임/링크 준비 — Step 3 전까지). **없어도 진행에 지장 없다** — 시각 근거는 `01 §4~§7`.

## 사용
- "빌드 시작" 또는 "이어서" → `build-orchestrator` 스킬이 Phase 0 복구로 재개 지점 판단 후 진행.
- 매 Step 종료 시(**Step 5 는 4 하위단계 각각마다**) 리뷰 패킷 제출 후 정지 → 사용자 승인 후 다음.

## 게이트 강도 (상세는 rules/hooks.md)
- **fast**(Stop 훅·매 턴): validate-state · typecheck · token-lint · uss-contract-lint.
- **`--full`**(커밋/리뷰패킷 전): + `npm run verify`(동작 검증) + vite build. **`--with-smoke`**(QA): + Playwright.
- `harness/verify` 는 눈으로 확인할 수 없는 것만 본다(폴링·인증·쿼리 무효화·409·계약). 상세는 `rules/hooks.md`.
- lint 는 PostToolUse 에서 자동수정(소프트, 비차단).
- 자가수정 3회 초과 → `manual_review` + 정지(사람 검수). 데드락 없음.
- 안전 차단(PreToolUse): rm -rf · force push · `main` push · 배포/publish · `.claude/spec/` 쓰기(`spec_edit` 창 제외) · `.env` 비밀값. 비가역(**실제 REPLACE Job 실행**·배포·비밀값)은 코드 구조만, 실행은 사람.
- 커밋·푸시는 `commit-push` 스킬로 한다(게이트 `--full` green 이 선행 조건). 형식은 `rules/git-convention.md`.

## 구조 한눈에 (모두 `.claude/` 아래)
| 버킷 | 경로 | 내용 |
|---|---|---|
| **skill** | `skills/` | 흐름·절차(build-orchestrator·implement-one-screen·build-review-packet) |
| **agent** | `agents/` | 코드를 고치지 않고 지적만 모으는 리뷰어 2종(spec-conformance·ds-conformance). 구조 리뷰는 `uss-contract-lint` 로 내렸다 |
| **hook** | `hooks/` | 진입점(session-start·pretool-guard·posttool-lint·stop-gate) + `checks/`(gate-runner·validate-state·spec-presence·typecheck·token-lint·build·smoke·lint) |
| **spec** | `spec/` | SoT 지식 6문서(읽기전용). 인덱스 = `00_INDEX.md` |
| **기타** | `resource/` | `phases/`(재개 단위 phase-0·step-1~7) · `smoke/`(Playwright, **Step 7 전까지 비어 있음**) · `HARNESS.md`(이 파일) |
| (이름 고정) | `CLAUDE.md`·`settings.json`·`build-state.json`·`rules/` | 세션마다 읽히는 목차 · 훅 연결 · 진행 상태 · 규칙(일부는 조건부 로드 → [[hooks]]) |

> `skills/`·`agents/`·`rules/`·`settings.json`·`CLAUDE.md` 는 Claude Code 예약 이름이라 이름 변경/이동 불가 — top-level 고정.

## USS 범위 요약 (상세는 spec/ 과 rules/ 가 정한다)
- 화면 **2개**: `ADMIN_LOGIN`(`/login`) · `SYNC_MAIN`(`/`) + 모달 M1~M5. 세 번째 화면 금지.
- 엔드포인트 **9개**. access 단일 토큰(2h, 헤더 `access-token`), refresh 토큰 없음.
- 에러코드 **정수 5000번대**, 페이지 **10행**, KST 로컬(오프셋 변환 금지), 목은 **MSW**.
- 도메인 3개: `features/auth` · `features/semester` · `features/sync`.
