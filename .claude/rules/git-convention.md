---
paths:
  - ".claude/skills/commit-push/**"
  - ".claude/rules/git-convention.md"
---
# 규칙 - 커밋, 브랜치, PR

> 커밋, 브랜치, PR 작업에 적용된다. `commit-push` 스킬이 이 파일을 Read 해서 쓴다.
> ⚠️ 아래 **표기 규칙**은 **커밋 메시지, 이슈, PR 에만** 적용된다. `.claude/` 문서에는 적용하지 않는다.

## 커밋 메시지

형식: `{type}: 내용`

| type | 용도 | 우리 저장소에서의 예 |
|---|---|---|
| feat | 새로운 기능 | 화면, 모달, 훅, 하네스 장치 추가 |
| fix | 버그 수정 | 리뷰 지적 반영, 회귀 수정 |
| hotfix | 긴급 수정 | 게이트를 막고 있는 것 |
| docs | 문서 변경 | rules, spec, phase 문서 |
| test | 테스트 추가/수정 | harness/verify, smoke |
| cicd | CI/CD 설정 | - |
| refactor | 리팩토링 | 동작이 안 바뀌는 정리 |
| chore | 빌드, 설정 등 기타 | 의존성, tailwind, 하네스 배선 |
| analysis | 코드 동작 분석, 조사 | 원인 추적 기록 |

`type` 은 커밋 접두사(`{type}:`)와 브랜치 접두사(`{type}/`)에 공통으로 쓴다.

**이 저장소는 GitHub 이슈를 쓰지 않는다.** 그래서 `(#번호)` 를 붙이지 않는다.
나중에 이슈를 쓰게 되면 `{type}: 내용(#번호)` 로 바꾸고 이 줄을 고친다.

예시: `feat: 인라인 확장 영역 구현`

## 제목 규칙

커밋, 이슈, PR 제목에 공통으로 적용한다.

- **40자 이내로, 명사형으로 끊어 쓴다**
- 대상을 나열하지 말고 "무엇을 해결했는지"를 남긴다
- 클래스명 나열과 괄호 중첩을 쓰지 않는다. **범위 표기(`feat(step-5):`)도 쓰지 않는다**
- 한국 개발자가 읽어 바로 이해되는 어휘를 쓴다 (번역투, 불필요한 영어 혼용 금지)

| 지양 | 지향 |
|---|---|
| `feat(harness P3): deferred 파이프 - 넘긴 지적을 읽는 사람을 만든다` | `feat: 넘긴 지적 추적 경로 추가` |
| `fix(step-5-4:polling): 리뷰 지적 - 끝난 Job 이 되살아나는 경로를 없앰` | `fix: 끝난 Job 이 폴링 대상으로 되살아나는 문제` |

## 본문 규칙

**본문은 짧게, 없어도 된다.** 제목으로 충분하면 제목만 쓴다.

쓸 때는 이 셋만 넣는다. 각 한 줄.

1. 왜 필요했나 (제목만으로 안 보일 때)
2. 게이트 결과 - `게이트 --full OK`
3. 회귀 검사를 넣었으면 **red 확인 결과** - `red 확인: queries.ts:93 [d4-strategy]` → [[verification]] §2

**상세한 근거를 커밋 메시지에 쓰지 않는다.** 갈 곳이 따로 있다.

| 남길 것 | 자리 |
|---|---|
| 다시 밟으면 안 되는 함정, 사용자 확정 사항 | `build-state.json` 의 `notes` |
| 리뷰 지적과 처리 | `harness/review/<항목ID>.json` |
| 다음 단계로 넘긴 것 | `build-state.json` 의 `deferred` |

## 표기 규칙 (커밋, 이슈, PR 에만)

- 가운데점(`·`) 대신 콤마(`,`)를 쓴다
- 긴 대시(`—`) 대신 짧은 대시(`-`)를 쓴다
- 이유: 가운데점은 나열인지 수식인지 모호하고, 긴 대시는 키보드로 바로 입력할 수 없어 손으로 고칠 때 표기가 어긋난다
- ⚠️ **`.claude/` 문서는 이 규칙 밖이다.** 문서는 기존 표기를 유지한다

## 브랜치 전략

원격에는 `main` 하나뿐이다. `dev` 는 없다.

- **`main` 에 직접 커밋하지 않는다.** 작업 브랜치를 먼저 만든다
- 네이밍: `{type}/{체크리스트 항목}` - 이 저장소의 작업 단위는 `build-state.json` 의 checklist 항목이다
  - `feat/step-6-expand` · `fix/step-5-4-polling` · `chore/harness-rework`
  - 항목 ID 의 콜론은 하이픈으로 바꾼다 (`step-5-4:polling` → `step-5-4-polling`)
- 한 브랜치 = 한 체크리스트 항목. 리뷰 게이트를 통과하고 `COMPLETED` 가 되면 `main` 으로 합친다

## 푸시에서 막히는 것

`pretool-guard` 훅이 결정적으로 막는다. 우회하지 않는다.

- ❌ **`main` 브랜치에서의 push** - 작업 브랜치에서만 올린다
- ❌ **force push** (`--force`, `-f`, `+refspec`) - 남의 커밋을 지운다
- ❌ `gh pr merge`, `gh release`, `gh repo delete` - 사람이 한다
- ✅ 작업 브랜치 push 는 허용된다. 첫 푸시는 `git push -u origin HEAD`

관련: [[hooks]] · [[verification]] · [[antipatterns]]
