---
name: build-review-packet
description: Step(또는 Step 5 하위단계) 종료 시 사용자 승인을 받기 위한 리뷰 패킷(§A~F)을 작성하고 정지한다. build-orchestrator 가 사람 게이트에서 사용.
---

# 리뷰 패킷 (§A~F) 양식

Step 종료마다, 그리고 **Step 5 는 4 하위단계 각각마다**(`step-5-1` ~ `step-5-4`) 아래 형식으로 제출하고 **정지**. 사용자 승인 후에만 다음 단계.

## §A. 범위
- 이번 항목 ID(들) / 화면·모달 / Step. build-state 체크리스트상 위치.

## §B. 변경 사항
- 추가·수정 파일 목록(간결히) + 커밋 해시/메시지.

## §C. 명세 준수 (인용)
- 충족한 spec 섹션을 인용으로: "`01 §6-3` preflight 결과 대조 → `SyncExecuteModal` 에서 구현".
- 적용한 결정 **D1~D12**. 명세에 없어 **만들지 않은 것**과 그 이유(엔드포인트 9개 밖의 호출을 만들지 않았다는 확인 포함).
- **Figma 사용 여부**: 화면별 Figma URL/프레임 사용 또는 "Figma 부재 → `01 §4~§7` 기반" + 자체 보완 항목(시각). 값은 DS-01 토큰 매핑(raw 값/새 토큰 없음). → [[ui-conventions]] Figma 사용 정책.

## §D. 게이트 결과
- `gate-runner.sh --full` 출력: validate-state / typecheck / token-lint / build (QA 는 `--with-smoke` 로 + smoke) 각각 green 증빙.
- 자가수정 횟수(`retry[항목ID]`), 발생한 경우 사유.

## §E. 동작 확인
- 4상태(Empty/Loading/Error/Data) + 상호작용(모달/토스트/검증) 확인 결과. 스크린샷 또는 수동 확인 체크.
- 해당되면: 폴링 재개(`runningJobId`) · 진행률 `total` null 분기 · 409 2종 분기 · 페이지 10행.

## §F. 미해결 / 다음
- `manual_review` 항목, 비가역으로 **사람에게 위임한 것**(실제 REPLACE Job 실행 등).
- 이번 단계에서 **넘긴 지적**(`deferred`) — 각각 어느 항목을 겨냥하는지와 함께. `build-state.json.deferred` 에 이미 옮겨져 있어야 한다.
- 명세 불명확으로 막힌 질문(🙋🏻). `03 §11-1` 실측 8항목에 의존하는 미확정 값이 있으면 여기 적는다(하드코딩 금지).
- 다음 체크리스트 항목.

> ⚠️ **여기 처음 나오는 질문이 있으면 절차 위반이다.** 명세가 안 정하는 것은 SoT 를 읽은 직후, **코드를 쓰기 전에** 한 번에 묻는다(`implement-one-screen` §1-b). 끝에 몰아 물으면 답을 기다리는 동안 추측으로 채우게 되고, 그 추측이 다음 단계까지 굳는다.

---
제출 후: 상태를 갱신하지 말고 **정지**. 승인 시그널을 받으면 `build-orchestrator` 가 다음 항목으로.

참조: [[hooks]] · [[decisions]] · [[antipatterns]]
