import { Outlet } from 'react-router';

export function LoginLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-8">
      <div className="w-full max-w-login-card">
        <Outlet />
      </div>
    </div>
  );
}
