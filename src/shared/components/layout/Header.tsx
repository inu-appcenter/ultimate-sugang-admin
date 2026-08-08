import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { ROUTES } from '@/shared/constants/routes';

/**
 * 01 §4 — 높이 56px, 하단 1px border. 좌측 서비스명(클릭 시 `/`), 우측은 쓰는 쪽이 채운다.
 * ⚠️ 사이드바·Breadcrumb·검색 UI 가 없다. 헤더 하나로 끝난다.
 *
 * 우측 슬롯을 props 로 받는 이유: 관리자 이름과 로그아웃은 auth 도메인 지식이고
 * shared 는 도메인을 모르기 때문이다 (04 §4-1).
 */
export function Header({ right }: { right?: ReactNode }) {
  return (
    <header className="h-header border-b border-border bg-surface">
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
