import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { ROUTES } from '@/shared/constants/routes';

export function Header({ right }: { right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-40 h-header border-b border-border bg-surface">
      <div className="h-full px-8">
        <div className="mx-auto flex h-full max-w-content items-center justify-between">
          <Link
            to={ROUTES.HOME}
            className="text-h3 text-foreground transition-colors hover:text-primary"
          >
            USS 관리자
          </Link>
          {right}
        </div>
      </div>
    </header>
  );
}
