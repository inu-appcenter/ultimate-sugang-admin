# Step 3 — ADMIN_LOGIN + 라우트 가드

## 참조
> 괄호 안은 **행 범위**다. `Read` 의 `offset`/`limit` 으로 그 부분만 읽는다.

`01 §5`(101-147) · `03 §3`(186-285) · `04 §7`(425-502) · `04 §12`(934-1047, Step 3) · `DS-01 §6`(273-310, 입력창)

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
