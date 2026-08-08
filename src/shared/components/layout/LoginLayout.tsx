import { Outlet } from 'react-router';

/** 01 §5 — 헤더 없는 별도 레이아웃. 배경 bg-page, 카드 폭 400px 중앙 정렬. */
export function LoginLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-8">
      <div className="w-full max-w-login-card">
        <Outlet />
      </div>
    </div>
  );
}
