# Step 1 — 프로젝트 셋업

## 목적
Vite+React+TS 스캐폴드, **DS-01 토큰 배선**, shadcn/ui, 라이브러리, alias, env, 폴더, 빈 라우터 2개.

## 선행조건
phase-0 통과. `spec/` 6문서 존재.

## 읽을 것 (이 목록이 전부다 — 규약은 `phase-0-recovery.md` §읽기 규약)

| 절 | 여기서 얻는 것 |
|---|---|
| `04 §3` | 기술 스택 |
| `04 §4` | 폴더 구조·컨벤션 |
| `04 §5` | 환경 변수 |
| `04 §12` | Step 1 절차 |
| `DS-01 §1`~`§4` | 토큰 전체 — 색·타이포·간격·모서리/표면/모션 |

> 행은 `node .claude/hooks/checks/spec-map.mjs "03 §6"` 이 준다. 목록 밖의 동작·데이터·계약이 필요해지면 멈추고 묻는다(🙋🏻).

⚠️ **Step 1 은 `src/` 가 아직 없어서 `rules/ui-conventions.md` 가 자동으로 붙지 않는다.** 토큰을 배선하기 전에 직접 Read 한다. → `CLAUDE.md §0-1`

## 절차
1. Vite + React + TS 스캐폴드, alias `@/` → `src`.
2. Tailwind + shadcn/ui init.
3. **`globals.css`(CSS 변수) + `tailwind.config.ts` 에 `DS-01` 토큰 전체 정의.**
4. `src/env.ts`(Zod 검증), `.env.development`.
5. `04 §4` 폴더 구조 생성. 페이지는 `<div>{화면ID}</div>` placeholder.
6. 라우터 2개(`/login`, `/`) 배선.

## ⚠️ 주의
- **shadcn 기본 `--radius`(6px) 재정의** → card 14 / button 10 / modal 16.
- **제거 토큰을 정의하지 않는다**: `sidebar-width`·`menu-gap`·`border-active-menu`·`border-changed-input`·`primary-bg-badge`·`info-*`·`accent-*`·`display`.
- `date-fns`·`dayjs` 를 설치하지 않는다.
- Primary `#0064FF` / foreground `#202632` (`DS-01 §1`).

## 출력
`/`·`/login` 404 없이 매칭. `npm run dev` 1280px+ 동작. `npm run build` 성공. token-lint 통과.

## 실패처리
게이트 red → 자가수정(한도 3) → 초과 시 manual-review + 보고.

## 다음
`step-2-infra.md`
