---
paths:
  - "src/**/*.tsx"
  - "src/**/*.css"
  - "tailwind.config.ts"
  - "components.json"
---
# 규칙 — UI·디자인 토큰

> 시각 방향은 `DS-00_uss_overview.md`, 토큰 값은 `DS-01_uss_design_system.md`, 화면 시각은 `01 §4~§7`, 상호작용은 `DS-03` 이 정한다.
> ⚠️ **`DS-02` 는 Gravit 화면 문서다.** USS 화면 시각을 여기서 가져오지 않는다 → [[source-of-truth]] §1.
> ⚠️ Gravit `DS-00` 은 **버렸다.** `DS-00_uss_overview.md` 가 그 자리를 대신한다.

## 0. 톤 (DS-00 §4-1 — 값을 보기 전에 먼저 읽는다)
1. **크기로 계층을 만든다** — 색으로 구분하지 않는다. 수치는 `text-metric`(32/Bold).
2. **보더 대신 표면과 그림자** — 카드에 보더를 쓰지 않는다.
3. **여백은 24 기준** — 카드 padding 도 카드 사이 간격도 24.
4. **색은 5~10%만** — Primary 는 CTA 와 활성 탭에만.
5. **짧은 구어체** — 15~25자. 단 **M4 는 격식체**(되돌릴 수 없다는 경고라서).

## 바뀌지 않는 것 (token-lint·uss-contract-lint 가 강제한다 → [[hooks]])
- **데스크톱 1280px 이상 단일 폭.** 반응형·모바일·태블릿 코드를 만들지 않는다. breakpoint 가 없다.
- **라이트 모드 전용.** 다크 모드 코드를 만들지 않는다.
- raw hex 와 임의 값(`#fff`, `[13px]`)을 쓰지 않는다. 색·간격·타이포는 **토큰만**.
- 토큰 정의는 `globals.css`(CSS 변수)와 `tailwind.config.ts` 에만 둔다(= token-lint 예외 대상).

## 전체 레이아웃 (01 §4) — **Gravit 과 다르다**
| 항목 | Gravit (❌) | **USS (✅)** |
|---|---|---|
| 사이드바 | 240px 고정 | **없음** |
| 헤더 | 56px | 56px (같다). 왼쪽 "USS 관리자"(→`/`) / 오른쪽 관리자 이름 + Ghost "로그아웃" |
| 콘텐츠 최대폭 | 1200px | **1024px**, 가운데 정렬, padding 32px |
| 활성 메뉴 표시 | 왼쪽 3px Primary | **해당 없음**(메뉴가 없다) |
| Breadcrumb | 있음 | **없음** |

- `/login` 은 헤더가 없는 별도 레이아웃이고 카드 폭은 400px 이다.
- 사이드바가 없으니 관련 토큰도 **DS-01 에서 뺐다**: `sidebar-width`·`menu-gap`·`border-active-menu`·`border-changed-input`·`primary-bg-badge`. 코드에서 참조하면 빌드가 깨진다.

## DS-01 토큰 ↔ Tailwind 클래스 이름
> **값 자체는 `DS-01` 과 `globals.css` 가 정한다. 이 표는 이름이 어떻게 대응되는지만** 담는다(hex/HSL 을 여기로 복사하지 않는다). 표와 명세가 다르면 DS-01/globals.css 가 이긴다.
>
> ⚠️ **shadcn 과 이름이 겹친다**: Tailwind 의 `text-primary` 는 shadcn 브랜드 색이지 DS-01 토큰 `text-primary`(본문)가 **아니다**. 본문 텍스트는 **`text-foreground`** 를 쓴다.

**브랜드** — Primary 는 포인트로만 쓰고 넓은 면적에 깔지 않는다.

| DS-01 토큰명 | Tailwind 클래스 | USS 값 | 쓰는 곳 |
|---|---|---|---|
| `primary` | `bg-primary` · `text-primary-foreground` · `ring-ring` | **`#0064FF`** | CTA·활성 탭·링크 |
| `primary-hover` | `hover:bg-primary-hover` | `#0052D1` | Primary hover |
| `primary-subtle` | `bg-primary-subtle` · `ring-primary-subtle` | `rgba(0,100,255,.08)` | 포커스 영역·활성 탭 배경 |

> **Primary 는 화면의 5~10%.** 화면마다 색이 채워진 버튼은 **1개**다(`ADMIN_LOGIN`=[로그인] / `SYNC_MAIN`=[데이터 업데이트]). 나머지는 Outline 이나 Ghost.

**중립 텍스트** — DS 토큰명과 Tailwind 클래스가 어긋나는 구간이다(`fg` 네임스페이스).

| DS-01 토큰명 | Tailwind 클래스 | 쓰는 곳 |
|---|---|---|
| `text-primary` | `text-foreground` (≡ `text-fg`) | **`#202632`** — 본문·제목·수치 |
| `text-secondary` | `text-fg-secondary` | 보조 텍스트·라벨 (카드1 보조 문구 13px) |
| `text-muted` | `text-muted-foreground` | 메타 정보 |
| `text-disabled` | `text-fg-disabled` | 비활성 텍스트 |

**중립 표면**

| DS-01 토큰명 | Tailwind 클래스 | 쓰는 곳 |
|---|---|---|
| `border` | `border-border` | **헤더 아래 1px 과 테이블 구분선에만.** ⚠️ 카드에는 쓰지 않는다 |
| `bg-surface` | `bg-surface` (≡ `bg-background`/`bg-card`) | 카드·헤더 배경 |
| `bg-page` | `bg-page` | 페이지 전체·로그인 배경 |
| `bg-hover` | `bg-hover` (≡ `bg-muted`) | 테이블 행 hover |

**의미색** — `-ds` 를 붙인 건 shadcn 의 `accent`/`muted` 와 겹치지 않게 하려는 것이다.

| DS-01 토큰명 | Tailwind 클래스 | **USS 에서 쓰는 곳** |
|---|---|---|
| `success-text/bg` | `text-success-text` / `bg-success-bg` | Job `SUCCESS` = 성공 |
| `warning-text/bg` | `text-warning-text` / `bg-warning-bg` | Job `RUNNING` = 진행 중 |
| `danger-text/bg` | `text-danger-text` / `bg-danger-bg` | Job `FAILED` = 실패 배지, 검증 에러 |
| `danger-text` (면) | `bg-destructive` + `text-destructive-foreground` | **M4 [삭제 후 적재] 버튼** — 면이 `danger-text`(#C4281C), 글씨는 흰색 |
| `muted-ds` | `text-muted-ds-text` / `bg-muted-ds-bg` | strategy `UPSERT` = **갱신**, 비활성 탭, `-` 표기 |
| `neutral-strong` | `text-primary-foreground` / `bg-foreground` | strategy `REPLACE` = **교체** |

> ⚠️ **`info` 와 `accent` 는 DS-01 에서 뺐다.** Primary 가 파랑이라 `info` 와 부딪히고, 교체 배지는 색 대신 **명도**로 강조하기 때문이다(진한 배경 + 흰 글자, `DS-00 §4-1` 원칙 4). 다시 넣지 않는다.

**표면·모션**

| 토큰 | Tailwind 클래스 | 값 | 쓰는 곳 |
|---|---|---|---|
| `shadow-card` | `shadow-card` | `0 2px 10px rgba(32,38,50,.05)` | 카드 3장 |
| `shadow-modal` | `shadow-modal` | `0 8px 32px rgba(32,38,50,.12)` | 모달 5종 |
| duration | `duration-200` | 200ms | 모달·토스트·인라인 확장 |

> 그림자는 **거의 안 보일 정도**로 옅어야 한다. 진해지면 토스 느낌이 아니라 머티리얼이 된다.
> ⚠️ **폴링으로 갱신되는 부분에는 트랜지션을 걸지 않는다.** 2초마다 화면이 움직여 산만해진다.

**레이아웃·타이포·보더** — `tailwind.config.ts` 에 직접 정의한다.

| DS-01 토큰명 | Tailwind 클래스 | USS 값 |
|---|---|---|
| `header-height` | `h-header` | 56 |
| `content-max-width` | `max-w-content` | **1024** (Gravit 1200 에서 변경) |
| `viewport-min-width` | `min-w-viewport` | 1280 |
| `login-card-width` | `max-w-login-card` | 400 |
| `modal-width-default` / `-wide` | `max-w-modal` / `max-w-modal-wide` | 400 / **480(M4 전용)** |
| `radius-card` | `rounded-card` | **14px** (Gravit 8 에서 변경) |
| `radius-button` / `radius-input` | `rounded-btn` | **10px** (Gravit 6 에서 변경) |
| `radius-modal` | `rounded-modal` | **16px** |
| `text-metric` | `text-metric` | **32 / Bold — 카드의 핵심 수치** |
| 타이포 | `text-h1`(24/B)·`text-h2`(18/SB)·`text-h3`(16/SB)·`text-body`(15/R)·`text-caption`(13/R) | `DS-01 §2` |
| 폰트 | `font-sans`(Pretendard) / `font-mono` | 본문 / 학수번호·코드 |

> `max-w-content`(1200→1024)와 radius(8→14, 6→10)는 `tailwind.config.ts`·`globals.css` 에서 처리한다. `max-w-[1024px]`, `rounded-[14px]` 같은 임의 값으로 우회하지 않는다. shadcn 기본 radius 6px 를 **그대로 두지 않는다.**
> `text-display` 는 USS 에서 쓸 곳이 없다.

## 간격 (DS-01 §3)
| 항목 | 값 |
|---|---|
| 카드 padding · 카드 사이 간격 · 모달 padding | **24** |
| 카드 제목과 내용 사이 | 12~16 |
| 콘텐츠 좌우 padding | 32 |

## 입력창은 Fill 방식이다 (Outline 아님)
- 기본은 `bg-hover` 배경에 **보더 없음**. 포커스는 `ring-2 ring-primary-subtle` + `bg-surface`. 에러는 `ring-2` danger + 아래 caption.
- 적용 대상: `ADMIN_LOGIN` 의 아이디·비밀번호, M4 의 확인 입력. 드롭다운(M1·M2)은 shadcn Select 기본을 쓴다.

## Figma 를 쓰는 방식 (채우되 지어내지 않는다)
화면 구현은 Figma URL 을 먼저 확인하면서 시작한다. **Figma 는 시각에 대해서만** 참고한다.

**시각 우선순위**: Figma 프레임(있으면) → **`01 §4~§7`**(USS 와이어프레임·모달) → `DS-03`(상호작용) → `DS-01` 토큰과 앞서 만든 화면의 관례.

- **Figma 가 있으면**: 레이아웃·구성·간격을 여기서 먼저 본다. 값(색·px·타이포)은 **DS-01 토큰으로 옮긴다.** 토큰에 없는 값이면 **가장 가까운 토큰을 쓰고, 새 토큰이나 raw 값을 만들지 않으며, 사용자에게 묻지도 않는다.**
- 다만 전체 제약(라이트·1280px 단일 폭·반응형 없음)과 동작·데이터·계약(01/03/04)은 **고정이다.** Figma 가 이걸 바꾸지 못한다.
- **Figma 가 없으면**: 위 순서대로 **알아서 완성한다. 멈추거나 묻지 않는다.**
- **동작·필드·엔드포인트·검증 규칙은 Figma 가 정하지 않는다 — 명세에 없으면 만들지 않는다.** Figma 를 썼는지, 어디를 스스로 채웠는지는 **리뷰 패킷 §C 에 적는다.**
- 시각 근거가 어디에도 없고 짐작이 너무 커질 때만 멈추고 묻는다(🙋🏻).
- ⚠️ USS 에는 **브랜드나 일러스트를 쓰는 예외 화면이 없다**(Gravit 의 해당 규칙은 OAuth 로그인 전용이었다). `ADMIN_LOGIN` 은 아이디·비밀번호 폼이므로 브랜드 토큰이나 일러스트를 들이지 않는다.

## 컴포넌트
- **shadcn/ui 를 먼저 쓴다.** 직접 만드는 건 shadcn/ui 확장 + 토큰 경유로만 한다. ⚠️ shadcn 기본 radius(6px)는 **다시 정의한다**(카드 14 / 버튼 10 / 모달 16).
- 아이콘은 `lucide-react`(인라인 16 / 버튼 20 / 상태 48). 한글 폰트는 Pretendard.
- **컴포넌트는 `DS-01 §5` 의 이름으로 부른다** — Info Card · Metric Row · Data Table · Table Card · Expandable Row · Tab Group · Confirm Modal · Strict Match Modal 등.
- ⚠️ Gravit 에는 있지만 **USS 에는 없는 것**: Sidebar · Breadcrumb · Filter Bar · Stat Card · Textarea · Radio Group · Checkbox · Search Input · Banner. 만들지 않는다.
- Primary 는 **액션과 강조에만** 쓴다(넓은 면적 금지). 위험한 액션은 destructive.

## 공통 패턴 (01 §6~§9, DS-03)
- 목록은 테이블 + 페이지네이션(**10행**)이다. **검색·필터 UI 는 없다**(명세에 없다).
- **네 가지 상태(Empty/Loading/Error/Data)를 모두 만든다.** 이력 테이블 skeleton 은 5행, 인라인 확장은 3행.
- 모달: Confirm **400px**(M1·M2·M3·M5) / **Strict Match 480px**(M4 전용, `{연도}-{학기명}` 이 정확히 맞아야 [삭제 후 적재]가 켜진다). 닫는 방법은 ESC·바깥 클릭·X. M4 는 닫을 때 **입력값을 지운다.**
- 토스트는 `sonner` 로 띄우고 3초 뒤 사라진다. 문구는 `01 §9-1` 표를 그대로 쓴다(**구어체**).
- **문장 어조**는 구어체 15~25자가 기본이다. ⚠️ **M4(전량 삭제)만 격식체를 유지한다** — `DS-00 §6`. 임의로 하나로 통일하지 않는다.
- 카드는 **보더 없이** `bg-surface` + `shadow-card`. 이력 테이블도 **카드로 감싸되** 안쪽 행 높이는 표준을 지킨다(`DS-00 §5-3`).
- **인라인 확장**: 이력 행을 누르면 펼쳐진다. **한 번에 한 행만**(다른 행을 누르면 이전 행이 접힌다). 별도 페이지로 이동하지 않는다.
- 탭은 건수가 0 이면 끈다. 처음 선택은 0 이 아닌 가장 왼쪽 탭.
- Badge: Job status(성공 success / 실패 danger / 진행중 warning), strategy(**갱신 muted-ds / 교체 neutral-strong**).
- 오른쪽 정렬: 이력 테이블의 신규·수정·폐강 카운트 열.

관련: [[good-patterns]] · [[antipatterns]] · [[decisions]]
