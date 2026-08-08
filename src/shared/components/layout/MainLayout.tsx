import type { ReactNode } from 'react';
import { Outlet } from 'react-router';

import { Header } from '@/shared/components/layout/Header';

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
