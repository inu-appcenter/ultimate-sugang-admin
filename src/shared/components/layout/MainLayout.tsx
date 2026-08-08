import type { ReactNode } from 'react';
import { Outlet } from 'react-router';

import { Header } from '@/shared/components/layout/Header';

/**
 * 01 §4 — 헤더 + 중앙 콘텐츠. 콘텐츠는 max-width 1024px, 좌우 padding 32px.
 * 1280px 화면에서 좌우 96px 여백이 남는 구성이다 (DS-01 §3).
 */
export function MainLayout({ headerRight }: { headerRight?: ReactNode }) {
  return (
    <div className="min-h-screen bg-page">
      <Header right={headerRight} />
      <main className="px-8 py-8">
        <div className="mx-auto w-full max-w-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
