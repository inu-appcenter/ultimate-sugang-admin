# USS 백오피스 — 디자인 시스템 (DS-01)

> **이 문서가 토큰 값과 컴포넌트 이름을 정한다.** 시각 *방향*은 `DS-00_uss_overview.md`, 화면별 시각은 `01 §4~§7`, 강제되는 규칙은 `.claude/rules/ui-conventions.md` 를 본다.

---

## 1. 컬러 토큰

### 1-1. Brand 컬러

| 토큰명 | 값 | 용도 | 사용 원칙 |
|---|---|---|---|
| `primary` | **`#0064FF`** | CTA 버튼, 활성 탭, 링크 | **화면의 5~10%만.** 큰 면적·본문 텍스트 금지 |
| `primary-hover` | `#0052D1` | Primary hover | |
| `primary-subtle` | `#0064FF` 8% opacity | 포커스 링, 활성 탭 배경 | |
| `primary-foreground` | `#FFFFFF` | Primary 위 텍스트 | |

> **화면당 채워진 Primary 버튼은 1개.** `ADMIN_LOGIN` = [로그인], `SYNC_MAIN` = [데이터 업데이트]. 나머지는 Outline·Ghost.
> `primary-bg-badge` 는 USS 에 사용처가 없어 **정의하지 않는다.**

### 1-2. Neutral (Grayscale) 컬러 — Blue Tint

`#202632` 기준의 푸른 기 스케일. 순수 무채색을 쓰지 않는다.

| 토큰명 | 값 | 용도 |
|---|---|---|
| `text-primary` | **`#202632`** | 본문·제목·수치 |
| `text-secondary` | `#5A6072` | 보조 텍스트, 라벨, 카드 보조 문구 |
| `text-muted` | `#8B91A1` | 메타 정보, 비활성 탭 |
| `text-disabled` | `#B4B9C5` | 비활성 텍스트 |
| `border` | `#E5E8EF` | **헤더 하단 1px · 테이블 divider 전용** |
| `bg-surface` | `#FFFFFF` | 카드·헤더 배경 |
| `bg-page` | `#F5F7FA` | 페이지 전체 배경, 로그인 배경 |
| `bg-hover` | `#F0F2F7` | 테이블 행 hover, 입력창 기본 배경 |

> ⚠️ **`border` 의 용도가 줄었다.** 카드에는 보더를 쓰지 않는다(§4-2). 남은 사용처는 헤더 하단과 테이블 내부 divider 뿐이다.

### 1-3. Semantic 컬러 (의미별)

| 의미 | 토큰명 | 텍스트 | 배경 | USS 사용 케이스 |
|---|---|---|---|---|
| Success | `success-text` / `success-bg` | `#0F7B3F` | `#E6F6ED` | Job `SUCCESS` = **성공** |
| Warning | `warning-text` / `warning-bg` | `#A15C00` | `#FFF4E0` | Job `RUNNING` = **진행 중** |
| Danger | `danger-text` / `danger-bg` | `#C4281C` | `#FDECEA` | Job `FAILED` = **실패**, M4 destructive, 검증 에러 |
| Muted | `muted-text` / `muted-bg` | `#5A6072` | `#EEF0F5` | strategy `UPSERT` = **갱신**, 비활성 탭, `-` 표기 |
| Neutral Strong | `neutral-strong-text` / `-bg` | `#FFFFFF` | `#202632` | strategy `REPLACE` = **교체** |

#### ⚠️ Info / Accent 제거

`info`·`accent` 계열은 **USS 에서 정의하지 않는다.**

| 제거 | 사유 |
|---|---|
| `info` | Primary 가 파랑(`#0064FF`)이라 **충돌**한다. 화면에 파랑이 두 종류로 등장하면 의미가 흐려진다 |
| `accent` | 도메인(주관식)이 USS 에 없다. 교체 배지는 색 대신 **명도**로 강조한다 |

> **교체 배지가 `neutral-strong` 인 이유**: `DS-00 §4-1` 원칙 4 — 색을 늘리지 않고 명도만으로 강조한다. 진한 배경 + 흰 글자는 회색 배지(갱신) 옆에서 충분히 도드라진다.

---

## 2. 타이포그래피 토큰

| 토큰명 | 크기 / 굵기 | 용도 |
|---|---|---|
| `metric` | **32px / bold** | **카드 핵심 수치** (강의 건수·시간표 건수) |
| `h1` | 24px / bold | 페이지 타이틀 ("강의 데이터 관리") |
| `h2` | 18px / semibold | 카드 타이틀 ("표시 학기"·"적재 데이터"·"업데이트 이력") |
| `h3` | 16px / semibold | 모달 타이틀 |
| `body` | 15px / regular | 본문, 테이블 셀, 폼 라벨 |
| `caption` | 13px / regular | 메타 정보, 보조 문구, 에러 메시지 |

> **`metric` 이 USS 의 핵심 토큰**이다. `DS-00 §4-1` 원칙 1(크기로 계층)의 구현체 — 라벨보다 숫자가 먼저 읽혀야 한다.
> `display` 토큰은 없다 — 핵심 수치는 `metric`(32) 이다. 본문을 한 단계 키워(`body` 15 / `caption` 13) 가독성을 확보했다.

### 위계 적용 예 (카드 2)

```
적재 데이터              ← h2 (18/SemiBold)
2026학년도 1학기          ← body (15/Regular), text-secondary
강의 1,203건             ← metric (32/Bold)
시간표 2,847건            ← metric (32/Bold)
마지막 업데이트 08-05     ← caption (13/Regular), text-muted
```

### 폰트 패밀리

```
font-sans:  Pretendard + 시스템 폰트 fallback
font-mono:  Tailwind 기본 monospace  (학수번호 표시 — 0000018001)
```

---

## 3. 간격 / 레이아웃 토큰

| 토큰명 | 값 | 용도 |
|---|---|---|
| `header-height` | 56px | 헤더 높이 (고정) |
| `content-max-width` | **1024px** | 콘텐츠 영역 최대 폭 |
| `content-padding-x` | 32px | 콘텐츠 좌우 패딩 |
| `content-padding-y` | 32px | 콘텐츠 상단 패딩 |
| `card-padding` | **24px** | 카드 내부 패딩 |
| `card-gap` | **24px** | 카드 사이 간격 |
| `card-title-gap` | 12~16px | 카드 제목 ↔ 내용 |
| `modal-padding` | 24px | 모달 내부 패딩 |
| `modal-width-default` | 400px | M1·M2·M3·M5 |
| `modal-width-wide` | 480px | **M4 (Strict Match) 전용** |
| `login-card-width` | 400px | 로그인 카드 폭 |
| `viewport-min-width` | 1280px | 전체 최소 폭 |

### ⚠️ 제거된 토큰

| 제거된 토큰 | 사유 |
|---|---|
| `sidebar-width` (240px) | **사이드바 없음** — `01 §4` |
| `menu-gap` (4px) | 메뉴 없음 |

### 1024px 근거

| 콘텐츠 폭 | + padding 32×2 | 1280px 화면 좌우 여백 |
|---|---|---|
| **1024** | 1088 | **96px씩** — 적정 |
| 1200 | 1264 | 8px씩 — 화면 끝에 붙음 |

사이드바가 있는 레이아웃이라면 1200 도 성립하지만 USS 는 사이드바가 없어 그대로 쓰면 최소 해상도에서 여백이 붕괴한다. 이력 테이블 7컬럼 합계도 640px 이라 1024 로 충분하다.

---

## 4. 모서리 / 표면 / 모션 토큰

### 4-1. 모서리

| 토큰명 | 값 | 용도 |
|---|---|---|
| `radius-card` | **14px** | 카드·테이블 컨테이너 |
| `radius-button` | **10px** | 버튼·배지 |
| `radius-input` | **10px** | 입력 필드 |
| `radius-modal` | **16px** | 모달 |
| `border-width` | 1px | 헤더 하단·테이블 divider |

> ⚠️ **shadcn 기본 radius(6px)를 따르지 않는다.** `globals.css` 의 `--radius` 를 재정의한다. `DS-00 §8`.

### 4-2. 표면 (Elevation)

| 토큰명 | 값 | 용도 |
|---|---|---|
| `shadow-card` | `0 2px 10px rgba(32, 38, 50, 0.05)` | 카드 3장 |
| `shadow-modal` | `0 8px 32px rgba(32, 38, 50, 0.12)` | 모달 5종 |

- **카드에 `border` 를 쓰지 않는다.** `bg-surface`(흰색) + `shadow-card` + `bg-page`(연회색) 대비로 층을 만든다.
- 그림자는 **거의 보이지 않을 정도**여야 한다. 진하면 토스가 아니라 머티리얼 톤이 된다.
- Info Card(`1px 보더 + 8px radius`) 패턴은 **쓰지 않는다.**

### 4-3. 모션

| 항목 | 값 |
|---|---|
| 기본 duration | **200ms** |
| easing | `cubic-bezier(0.4, 0, 0.2, 1)` |
| 적용 | 모달 open/close, 토스트 in/out, 인라인 확장 |
| **미적용** | **폴링 갱신** — 2초마다 값만 교체. 트랜지션을 걸면 화면이 계속 움직여 산만해진다 |

### 4-4. 제거된 토큰

| 제거된 토큰 | 사유 |
|---|---|
| `border-active-menu` (3px) | 사이드바 메뉴 없음 |
| `border-changed-input` (4px) | 인라인 편집(스테이징) 없음 |

---
## 5. 컴포넌트 명명 규칙

> 이 이름을 코드·대화·리뷰에서 **그대로** 사용한다. 일관된 어휘가 리뷰 정확도를 높인다.
>
> 예: "**Confirm Modal**(destructive variant)로 M4 를 구성해줘" / "이 영역에 **Status Badge**(success)를 붙여줘"

### 5-1. 레이아웃 컴포넌트

| 컴포넌트명 | 설명 |
|---|---|
| **Main Layout** | 헤더 + 콘텐츠의 전체 레이아웃 (`SYNC_MAIN`). **사이드바 없음** |
| **Login Layout** | 헤더 없는 독립 레이아웃 (`ADMIN_LOGIN` 전용) |
| **Header** | 상단 56px. 좌 "USS 관리자"(→`/`) / 우 관리자 이름 + Ghost "로그아웃". 하단 1px `border` |
| **Content Area** | max-width 1024px, 중앙 정렬, 좌우 32px padding |

> **Sidebar**·**Breadcrumb** 는 USS 에 **존재하지 않는다.**

### 5-2. 페이지 패턴

| 패턴명 | 설명 |
|---|---|
| **Page Header** | 페이지 타이틀(`h1`) 단독. USS 는 설명 텍스트·우측 액션 버튼을 두지 않는다 |
| **Card Stack** | 카드를 세로로 24px 간격 배치 (`SYNC_MAIN` 의 표시 학기 → 적재 데이터 → 이력) |

> **List Page**·**Detail Page**·**Form Page** 패턴은 USS 화면 구조와 대응하지 않는다.

### 5-3. 데이터 표시 컴포넌트

| 컴포넌트명 | 설명 |
|---|---|
| **Info Card** | 흰 배경(`bg-surface`), **보더 없음**, `radius-card`(14), `card-padding`(24), `shadow-card` |
| **Metric Row** | 라벨(`caption`) + 큰 수치(`metric`) 조합. 카드 2의 강의·시간표 건수 |
| **Data Table** | 헤더 + 행. **페이지당 10행 고정.** 행 hover 시 `bg-hover` + cursor pointer. 행 구분은 얇은 divider(`border`)만 |
| **Table Card** | Data Table 을 감싸는 Info Card. **바깥은 카드 언어, 내부 행 높이는 표준 유지** — `DS-00 §5-3` |
| **Pagination** | shadcn/ui Pagination. 숫자 + 이전/다음 |
| **Status Badge** | 상태 표시 뱃지. variant = success / warning / danger / muted / neutral-strong |
| **Expandable Row** | 클릭 시 인라인 확장되는 테이블 행. **동시에 1행만** 열린다 |
| **Tab Group** | 확장 영역의 신규/수정/폐강/경고 탭. 건수 0 이면 비활성 |
| **Progress Text** | `{단계} {current}/{total}` 또는 `{단계} 중…`. 스피너 아이콘 동반 |

> **Filter Bar**·**Stat Card** 는 USS 에 사용처가 없다(검색·필터 UI 없음).

### 5-4. 입력 컴포넌트

| 컴포넌트명 | 설명 |
|---|---|
| **Text Input** | shadcn/ui Input. ⚠️ **Fill 방식** — `bg-hover` 배경 + **보더 없음** (§6-1) |
| **Select Dropdown** | shadcn/ui Select. M1·M2 의 연도·학기 선택. shadcn 기본 스타일을 따른다 |
| **Strict Match Input** | M4 전용. `font-mono`, placeholder 없음, 정확 일치 시에만 실행 버튼 활성 |

> **Textarea**·**Radio Group**·**Checkbox**·**Search Input** 은 USS 에 사용처가 없다.

### 5-5. 액션 컴포넌트

| 컴포넌트명 | Variant | USS 사용 케이스 |
|---|---|---|
| **Primary Button** | default (`primary`) | [로그인], [데이터 업데이트], [저장], [갱신], [적재], [다음] |
| **Outline Button** | outline | [취소], [학기 설정] |
| **Ghost Button** | ghost | 헤더 [로그아웃], [더 보기] |
| **Destructive Button** | destructive (`danger`) | **M4 [삭제 후 적재] 전용** |

> **화면당 채워진 Primary 버튼 1개** 원칙(§1-1). 모달 안에서는 실행 버튼 1개 + [취소](Outline).

### 5-6. 피드백 컴포넌트

| 컴포넌트명 | 설명 |
|---|---|
| **Confirm Modal** | shadcn/ui Dialog. 폭 400px, `radius-modal`(16), `shadow-modal`. M1·M2·M3·M5 |
| **Strict Match Modal** | 폭 480px, **destructive**. `{연도}-{학기명}` 정확 입력 시에만 실행 활성. **M4 전용** |
| **Toast (Success)** | 우상단, `success` 계열, 3초 자동 dismiss |
| **Toast (Error)** | 우상단, `danger` 계열, 3초 자동 dismiss |
| **Empty State** | 회색 아이콘(48px) + 문구. 예: "업데이트 이력이 없어요." |
| **Error State** | 경고 아이콘(48px) + 메시지 + [다시 시도] 버튼 |
| **Loading Skeleton** | 회색 placeholder bar. 이력 테이블 5행 / 인라인 확장 3행 |

> **Banner (Success)** 는 USS 에 사용처가 없다(COMPLETED 상태 개념 없음).

### 5-7. 특수 컴포넌트

| 컴포넌트명 | 설명 |
|---|---|
| **Field Diff** | 확장 영역 수정 탭의 `{필드명} {before} → {after}`. 여러 필드면 줄바꿈 |
| **Warning Row** | 확장 영역 경고 탭의 학수번호 + 사유 |

---

## 6. 상태별 변형 규칙

| 상태 | 적용 대상 | 시각 처리 |
|---|---|---|
| **Default** | 모든 컴포넌트 | 기본 스타일 |
| **Hover** | 클릭 가능한 요소 | 배경 변화(`bg-hover`) 또는 색상 강조 |
| **Active / Pressed** | 버튼 | `primary-hover` 또는 약간 어두운 배경 |
| **Focus** | 입력 필드, 버튼 | `ring-2` + `primary-subtle` |
| **Disabled** | 인터랙티브 요소 | 회색 처리, opacity 50%, `cursor: not-allowed` |
| **Loading** | 버튼, 액션 | spinner + 텍스트, disabled |
| **Error** | 입력 필드 | `ring-2` danger + 하단 `caption` 에러 메시지 |

> **Read-only** 상태는 USS 에 사용처가 없다(편집 화면 없음).

### 6-1. 입력창 — Fill 방식 (Outline 아님)

| 상태 | 처리 |
|---|---|
| 기본 | `bg-hover` 배경 + **보더 없음** |
| focus | `bg-surface` + `ring-2 ring-primary-subtle` |
| error | `ring-2` danger + 하단 `caption` |
| disabled | `bg-hover` + `text-disabled` |

적용: `ADMIN_LOGIN` 아이디·비밀번호, M4 Strict Match. **드롭다운(M1·M2)은 shadcn Select 기본**을 따른다.

### 6-2. Status Badge variant 매핑

| 대상 | 값 | variant |
|---|---|---|
| Job status | `SUCCESS` | success |
| | `FAILED` | danger |
| | `RUNNING` | warning |
| strategy | `UPSERT` (갱신) | **muted** |
| | `REPLACE` (교체) | **neutral-strong** |
| | `INITIAL` (최초) | muted |

---

## 7. 아이콘 사용 규칙

- **라이브러리**: `lucide-react` 만 사용
- **기본 크기**: 16px(인라인) / 20px(버튼·헤더) / 48px(Empty·Error 상태)
- **컬러**: 텍스트 컬러를 따름 (`currentColor`)

### 자주 사용되는 아이콘

| 용도 | 아이콘 |
|---|---|
| 로그아웃 | `LogOut` |
| 새로고침·업데이트 | `RefreshCw` |
| 진행 중 (회전) | `Loader2` |
| 설정 | `Settings2` |
| 닫기 | `X` |
| 펼침 / 접힘 | `ChevronDown` · `ChevronUp` |
| 이전 / 다음 | `ChevronLeft` · `ChevronRight` |
| 성공 | `CheckCircle2` |
| 경고·실패 | `AlertTriangle` |
| 정보 | `Info` |
| 빈 상태 | `Inbox` |

> 사이드바 메뉴 아이콘(`LayoutDashboard`·`Users` 등)은 **메뉴가 없으므로 쓰지 않는다.**

---

## 9. 미해결

| # | 항목 | 비고 |
|---|---|---|
| 1 | §1-2 중립색 6종(`text-secondary`~`bg-hover`) | `#202632` 파생 **제안값**. 실제 화면 확인 후 조정 가능 |
| 2 | §1-3 시맨틱 5종 | 색 절제 기조에 맞춰 톤을 낮게 잡음. 조정 가능 |
| 3 | `primary-hover` `#0052D1` | 명도 -15% 기계적 산출값 |

---

