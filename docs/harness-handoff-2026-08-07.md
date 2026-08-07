# 저장 가이드 — USS 백오피스 하네스 산출물

> 2026-08-07 세션 산출물 **27개 파일**. 아래 경로에 그대로 배치하면 된다.
>
> ⚠️ **이 문서는 배치 시점의 기록이다.** 배치는 끝났고 이후 하네스가 더 붙었다
> (Gravit 훅·skills 승계, `uss-contract-lint.mjs`·`doc-lint.mjs` 추가, 문장 정리).
> 현재 구조는 `resource/HARNESS.md`, 검사 동작은 `rules/hooks.md` 를 본다.

## 1. 배치 위치

```
uss-admin-frontend/
└─ .claude/
   ├─ CLAUDE.md                              ✏️ 교체
   ├─ build-state.json                       ✏️ 교체
   ├─ settings.json                          (Gravit 그대로)
   ├─ spec/                                  ← 읽기전용 SoT
   │  ├─ 00_INDEX.md                         🆕
   │  ├─ 01_uss_admin_wireframe_spec.md      🆕 v1.2
   │  ├─ 03_uss_admin_api_spec.md            🆕 v1.1
   │  ├─ 04_uss_admin_frontend_spec.md       🆕 v1.0
   │  ├─ DS-00_uss_overview.md               🆕
   │  ├─ DS-01_uss_design_system.md          🆕
   │  └─ DS-03_interactions.md               (Gravit 승계 — §5·사이드바 항목 무시)
   ├─ rules/
   │  ├─ decisions.md                        🆕
   │  ├─ api-contract.md                     ✏️ 교체
   │  ├─ source-of-truth.md                  ✏️ 교체
   │  ├─ ui-conventions.md                   ✏️ 교체
   │  ├─ antipatterns.md                     ✏️ 교체
   │  ├─ architecture.md                     ✏️ 교체
   │  ├─ good-patterns.md                    ✏️ 교체
   │  └─ hooks.md                            (Gravit 그대로)
   ├─ agents/
   │  ├─ spec-conformance-reviewer.md        ✏️ 교체
   │  ├─ architecture-reviewer.md            ✏️ 교체
   │  └─ ds-conformance-reviewer.md          ✏️ 교체
   ├─ hooks/
   │  ├─ checks/spec-presence.mjs            ✏️ 교체
   │  └─ (나머지 훅 진입점·checks)            (Gravit 그대로)
   ├─ skills/                                (Gravit 그대로 — §4 참조)
   └─ resource/
      ├─ phases/                             ✏️ 전체 교체 (8개)
      │  ├─ phase-0-recovery.md
      │  ├─ step-1-setup.md
      │  ├─ step-2-infra.md
      │  ├─ step-3-login.md
      │  ├─ step-4-sync-shell.md
      │  ├─ step-5-job-flow.md
      │  ├─ step-6-expand.md
      │  └─ step-7-qa.md
      └─ smoke/                              ❌ 미작성 (Step 7 전까지 불필요)
```

## 2. 파일별 요약

### spec/ (SoT)

| 파일 | 내용 |
|---|---|
| `00_INDEX.md` | 약어 매핑·관할·충돌 우선순위 |
| `01` v1.2 | 화면 2개 + 모달 5종. 10행, 구어체(M4 제외), 카드 표면 |
| `03` v1.1 | 엔드포인트 9개, `{accessToken, name}`, 5000번대 에러, 진행률 |
| `04` v1.0 | 스택·구조·인증·횡단정책·SYNC_MAIN 상세·MSW·Step 1~7 |
| `DS-00` | 시각 방향(토스 계열), 25축 채택/미채택, 문장 어조 |
| `DS-01` | 토큰 값·컴포넌트 명명. Gravit DS-01 병합 완료 |

### rules/

| 파일 | 핵심 |
|---|---|
| `decisions.md` | D1~D12 + 기타 확정값. Gravit D1~D6 폐기 |
| `api-contract.md` | Gravit 습관 금지 대조표, nullable 규칙 |
| `source-of-truth.md` | 문서별 담당 범위, DS-02 를 쓰지 않는 이유 |
| `ui-conventions.md` | 토큰 매핑, 레이아웃, 공통 패턴 |
| `antipatterns.md` | Gravit 잔재 + 도메인 규칙 위반 |
| `architecture.md` | 도메인 3개, axios 1개 |
| `good-patterns.md` | Job 흐름·폴링 재개 |

### 하네스

| 파일 | 핵심 |
|---|---|
| `CLAUDE.md` | 세션마다 읽히는 목차. USS 문서명·화면 2개·Gravit 습관 경고 |
| `build-state.json` | checklist 10항목(Step 5 는 4 하위단계) |
| `spec-presence.mjs` | 필수 6문서 확인 + **Gravit 잔재 문서 탐지 시 FAIL** |
| `agents/` 3종 | 리뷰 기준을 USS 로 교체 |
| `phases/` 8종 | Step 절차 + 단계별 ⚠️ 주의 |

## 3. ⚠️ 배치 시 주의

### 3-1. Gravit 문서 삭제 필수

`spec-presence.mjs` 가 아래 파일을 발견하면 **FAIL** 을 반환한다. 반드시 삭제한다.

```
spec/01_gravit_admin_wireframe_spec.md
spec/03_gravit_admin_api_spec.md
spec/04_gravit_admin_frontend_spec.md
spec/DS-00_overview.md
spec/DS-01_design_system.md
spec/DS-02_screens.md
```

`spec/DS-04_prompt_templates.md` 는 Gravit 전용이나 검증 대상이 아니다. 삭제 권장.

### 3-2. 코드에서 참조 금지 — 제거 토큰

`tailwind.config.ts`·`globals.css` 에 정의하지 않는다.

```
sidebar-width · menu-gap · border-active-menu · border-changed-input
primary-bg-badge · info-text/bg · accent-text/bg · display
```

### 3-3. 그대로 쓰는 Gravit 파일

`settings.json` · `hooks/`(진입점 4 + checks 나머지) · `rules/hooks.md` · `skills/` 3종.

> ⚠️ `skills/build-orchestrator/SKILL.md` 등에 **Gravit 문구(16화면·STAGING_DETAIL)가 남아 있을 수 있다.** 검토 후 필요 시 문구만 수정한다. 흐름 구조 자체는 재사용 가능하다.

## 4. 미해결 항목

| # | 항목 | 위치 |
|---|---|---|
| 1 | 학교 API 실측 8항목 | `03 §11-1` |
| 2 | DS-01 중립색·시맨틱 제안값 확정 | `DS-01 §9` |
| 3 | `RUNNING` Job 유일성 DB 제약 | `04 §13-2` |
| 4 | CORS 화이트리스트·관리자 시드 | `04 §13-2` |
| 5 | `resource/smoke/` Playwright | Step 7 전까지 불필요 |
| 6 | `skills/` 3종 Gravit 문구 검토 | §3-3 |

## 5. 다음 작업

`.claude/` 배치 → `phase-0-recovery.md` 실행 → `step-1-setup.md` 부터 구현 시작.
