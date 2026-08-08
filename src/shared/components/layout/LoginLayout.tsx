import type { ReactNode } from 'react';

/** 01 §5 — 헤더 없는 별도 레이아웃. 배경 bg-page, 카드 폭 400px 중앙 정렬. */
export function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-8">
      <div className="w-full max-w-login-card">{children}</div>
    </div>
  );
}
