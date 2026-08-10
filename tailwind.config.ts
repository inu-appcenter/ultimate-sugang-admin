import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

/**
 * DS-01 토큰 ↔ Tailwind 클래스 배선.
 * 값 자체는 src/shared/styles/globals.css 의 CSS 변수가 들고 있고 여기서는 이름만 붙인다.
 *
 * 만들지 않는 것 (DS-01 §1-3, §3, §4-4 · rules/ui-conventions.md):
 *  - darkMode 설정 · screens(breakpoint) — 라이트 모드 전용, 데스크톱 1280px 단일 폭
 *  - info-* · accent-*(의미색) · sidebar-width · menu-gap · border-active-menu
 *  - border-changed-input · primary-bg-badge · text-display
 */
const hsl = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    // 반응형을 만들지 않으므로 기본 breakpoint 를 비운다.
    screens: {},
    extend: {
      colors: {
        primary: {
          DEFAULT: hsl('primary'),
          hover: hsl('primary-hover'),
          foreground: hsl('primary-foreground'),
          // #0064FF 8% — 포커스 링·활성 탭 배경 (DS-01 §1-1)
          subtle: 'hsl(var(--primary) / 0.08)',
        },

        foreground: hsl('foreground'),
        fg: {
          DEFAULT: hsl('foreground'),
          secondary: hsl('fg-secondary'),
          disabled: hsl('fg-disabled'),
        },

        border: hsl('border'),
        surface: hsl('surface'),
        page: hsl('page'),
        hover: hsl('hover'),

        success: { text: hsl('success-text'), bg: hsl('success-bg') },
        warning: { text: hsl('warning-text'), bg: hsl('warning-bg') },
        danger: { text: hsl('danger-text'), bg: hsl('danger-bg') },
        'muted-ds': { text: hsl('muted-ds-text'), bg: hsl('muted-ds-bg') },

        // shadcn/ui 별칭 — 위 DS-01 토큰을 가리키기만 한다.
        background: hsl('background'),
        card: { DEFAULT: hsl('card'), foreground: hsl('card-foreground') },
        popover: { DEFAULT: hsl('popover'), foreground: hsl('popover-foreground') },
        secondary: { DEFAULT: hsl('secondary'), foreground: hsl('secondary-foreground') },
        muted: { DEFAULT: hsl('muted'), foreground: hsl('muted-foreground') },
        accent: { DEFAULT: hsl('accent'), foreground: hsl('accent-foreground') },
        destructive: { DEFAULT: hsl('destructive'), foreground: hsl('destructive-foreground') },
        input: hsl('input'),
        ring: hsl('ring'),
      },

      // DS-01 §2. `display` 는 USS 에 쓸 곳이 없어 정의하지 않는다.
      fontSize: {
        metric: ['32px', { lineHeight: '40px', fontWeight: '700' }],
        h1: ['24px', { lineHeight: '32px', fontWeight: '700' }],
        h2: ['18px', { lineHeight: '26px', fontWeight: '600' }],
        h3: ['16px', { lineHeight: '24px', fontWeight: '600' }],
        body: ['15px', { lineHeight: '24px', fontWeight: '400' }],
        caption: ['13px', { lineHeight: '20px', fontWeight: '400' }],
      },

      fontFamily: {
        sans: [
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Roboto',
          'Helvetica Neue',
          'Segoe UI',
          'Apple SD Gothic Neo',
          'Noto Sans KR',
          'Malgun Gothic',
          'sans-serif',
        ],
      },

      // DS-01 §3
      height: { header: 'var(--header-height)' },
      minWidth: { viewport: '1280px' },
      maxWidth: {
        content: '1024px',
        'login-card': '400px',
        modal: '400px',
        'modal-wide': '480px',
      },

      // DS-01 §4-1
      borderRadius: {
        card: '14px',
        btn: '10px',
        modal: '16px',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },

      /**
       * Tailwind 기본 aria 목록에 invalid 가 없다(busy·checked·disabled·expanded·hidden·
       * pressed·readonly·required·selected 9개뿐). 이걸 안 넣으면 입력창 에러 링
       * (DS-01 §6-1)이 클래스 자체로 생성되지 않는다.
       */
      aria: { invalid: 'invalid="true"' },

      // DS-01 §4-2 — 카드에 보더를 쓰지 않고 그림자로 층을 만든다.
      boxShadow: {
        card: '0 2px 10px rgba(32, 38, 50, 0.05)',
        modal: '0 8px 32px rgba(32, 38, 50, 0.12)',
      },
    },
  },
  plugins: [animate],
} satisfies Config;
