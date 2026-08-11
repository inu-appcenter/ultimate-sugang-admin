---

name: commit-push
description: |
변경 사항을 git diff 로 직접 확인해 작업 성격별로 묶고, 컨벤션에 맞는 커밋 메시지를 만들어 사용자 확인 후 커밋, 푸시한다.
Trigger: "커밋해줘", "커밋하고 푸시해줘", "커밋 푸시해줘", "푸시해줘", "커밋 올려줘"
Do NOT use for: 코드 구현(→ implement-one-screen), 리뷰 패킷(→ build-review-packet), PR 생성, 머지
Boundary: 커밋 생성과 현재 작업 브랜치 push 까지만. PR 생성, 머지, 리뷰는 범위 밖이다.
allowed-tools: Bash(git *), Read
--------------------------------

# 커밋, 푸시

변경 사항을 커밋하고 현재 작업 브랜치에 push 한다. 산출물(리뷰 패킷, build-state)은 참고용으로만 보고
**실제 변경은 `git diff` 로 직접 확인한다.**

## Phase 0: 게이트 (이 저장소에만 있는 단계 - 건너뛰지 않는다)

```bash
bash .claude/hooks/checks/gate-runner.sh --full
```

* `OK` 가 아니면 **커밋하지 않는다.** 사유를 보고하고 멈춘다.
* `--full` 은 fast + `npm run verify`(약 100초) + `vite build` 다. 이게 green 이 아닌 상태로 커밋하면
  다음 세션이 깨진 지점을 모른 채 이어받는다. → [[hooks]]
* QA(Step 7)면 `--with-smoke` 로 돌린다.

> 다음 Phase 조건: 게이트가 `OK` 일 때
> Skip 조건: 없음

## Phase 1: 변경 사항 파악

1. `git status --short` 로 스테이징, 미스테이징, untracked 를 파악하라.
2. `git diff` 와 `git diff --staged` 로 **실제 변경 내용을 직접 확인하라.**
3. 커밋할 변경이 없으면 알리고 중단하라.

> 다음 Phase 조건: 변경 내용을 파악했을 때
> Skip 조건: 없음

## Phase 2: 커밋 그룹핑, 메시지 초안

1. `.claude/rules/git-convention.md` 를 Read 하라.
2. 변경 파일을 **작업 성격별로** 묶어라. 성격이 하나면 단일 커밋, 여러 갈래면 타입별로 분리하고
   어느 파일이 어느 커밋에 들어가는지 스테이징 계획을 정하라.
3. 그룹마다 `{type}: 내용` 초안을 작성하라.

   * **`feat: 작업 내용` 형식으로 작성한다.**
   * 범위 표기(`feat(step-5):`)와 괄호를 쓰지 않는다.
   * 커밋 메시지는 **40자 이내 명사형**으로 작성한다.
   * 본문은 짧게 또는 생략. 넣는다면 왜 필요했나 / `게이트 --full OK` 두 줄까지
   * 가운데점 대신 콤마, 긴 대시 대신 짧은 대시
4. **이 저장소에서만 확인할 것:**

   * `.claude/spec/` 이 diff 에 있으면 `spec_edit` 창을 열고 한 작업인지 확인하고, `spec-map.json` 이
     같이 갱신됐는지 본다. 안 됐으면 `node .claude/hooks/checks/spec-map.mjs` 를 먼저 돌린다

> 다음 Phase 조건: 커밋 그룹과 메시지 초안이 준비되었을 때
> Skip 조건: 없음

## Phase 3: 사용자 확인

1. 커밋 그룹, 메시지 초안, 푸시 대상(현재 브랜치, 첫 푸시 여부)을 제시하고 "이렇게 커밋, 푸시할까요?"로 확인받아라.
2. 수정 요청이 있으면 반영 후 다시 확인하라. **승인 전에 커밋, 푸시하지 마라.**

> 다음 Phase 조건: 사용자가 승인했을 때
> Skip 조건: 사용자가 "확인 없이 바로" 라고 명시했을 때만

## Phase 4: 커밋, 푸시

1. 그룹별로 해당 파일만 스테이징(`git add {파일들}`)한 뒤 `git commit -m "{메시지}"`. 그룹이 여러 개면 반복한다.
2. upstream 상태를 판별해 push 하라.

   ```bash
   git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null
   ```

   * 출력이 없거나 `origin/{현재브랜치}` 와 다르면 → `git push -u origin HEAD`
   * 일치하면 → `git push`
3. **force push 를 쓰지 않는다.** 훅이 막고, 막지 않더라도 쓰지 않는다.
   push 가 거절되면 `git pull --rebase` 로 풀고 다시 올린다.

> 다음 Phase 조건: 커밋, 푸시가 완료되었을 때
> Skip 조건: 없음

## Phase 5: 결과 보고

1. `.claude/skills/commit-push/template/output.md` 를 Read 하라.
2. 템플릿 상단 작성 가이드에 따라 항목을 채워 보고하라. (가이드 주석은 출력에 포함하지 않는다.)

참조: [[git-convention]] · [[hooks]]
