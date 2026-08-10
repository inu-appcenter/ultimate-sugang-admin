# Step 3 — ADMIN_LOGIN + 라우트 가드

## 읽을 것 (이 목록이 전부다 — 규약은 `phase-0-recovery.md` §읽기 규약)

| 절 | 여기서 얻는 것 |
|---|---|
| `01 §5` | ADMIN_LOGIN 화면 동작·검증 |
| `03 §3` | 인증 API 계약 |
| `04 §7` | 인증 흐름·protectedLoader |
| `04 §12` | Step 3 절차 |
| `DS-01 §6` | 상태별 변형 — 입력창 |

> 행은 `node .claude/hooks/checks/spec-map.mjs "03 §6"` 이 준다. 목록 밖의 동작·데이터·계약이 필요해지면 멈추고 묻는다(🙋🏻).

## 절차
1. `LoginLayout` (헤더 없음, 배경 `bg-page`, 카드 400px).
2. 로그인 폼 — RHF + zodResolver. loginId 필수·50자 / password 필수·100자.
3. `POST /auth/login` → `{ accessToken, name }` 저장 → `store.setAdmin(name)` → `/` 이동.
4. 401(5000) → **카드 하단 인라인 에러** "아이디나 비밀번호가 맞지 않아요." (토스트 아님)
5. `protectedLoader` (`04 §7-3`).
6. `MainLayout` + `Header` (좌 "USS 관리자" / 우 이름 + Ghost [로그아웃]).
7. M5 로그아웃 Confirm Modal — **서버 호출 없음**.

## ⚠️ 주의
- 입력창 **Fill 방식**(`bg-hover`, 보더 없음). Outline 위반.
- 미입력은 인라인 검증 + **요청 미발송**.
- 요청 중 버튼 비활성 + spinner + 입력 비활성.

## 출력
비로그인 `/` → `/login`. 로그인 성공 → `/` + 헤더 이름. 실패 시 인라인 에러.

## 다음
`step-4-sync-shell.md`
