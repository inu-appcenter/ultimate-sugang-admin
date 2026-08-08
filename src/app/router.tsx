import { createBrowserRouter, redirect, type LoaderFunction } from 'react-router';

import { reissueToken } from '@/features/auth/api';
import { AdminMenu } from '@/features/auth/components/AdminMenu';
import { useAuthStore } from '@/features/auth/store';
import { AdminLoginPage } from '@/pages/AdminLoginPage';
import { SyncMainPage } from '@/pages/SyncMainPage';
import { markSessionExpired } from '@/shared/api/refreshQueue';
import { tokenManager } from '@/shared/api/tokenManager';
import { LoginLayout } from '@/shared/components/layout/LoginLayout';
import { MainLayout } from '@/shared/components/layout/MainLayout';
import { ROUTES } from '@/shared/constants/routes';

/**
 * 04 §7-3. 토큰이 없으면 /login.
 * 토큰은 있는데 이름이 없으면(새로고침 직후) localStorage → 그것도 없으면 재발급 1회로 되살린다.
 */
const protectedLoader: LoaderFunction = async () => {
  const token = tokenManager.getAccessToken();
  if (token === null) throw redirect(ROUTES.LOGIN);

  const { name, setAdmin } = useAuthStore.getState();
  if (name !== null) return null;

  const storedName = tokenManager.getName();
  if (storedName !== null) {
    setAdmin(storedName);
    return null;
  }

  try {
    const reissued = await reissueToken();
    tokenManager.set(reissued.accessToken, reissued.name);
    setAdmin(reissued.name);
  } catch {
    // 여기서만 정리한다 — 인터셉터는 재발급 401 을 그대로 넘겨준다(경쟁 방지).
    tokenManager.clear();
    markSessionExpired();
    throw redirect(ROUTES.LOGIN);
  }
  return null;
};

/** 04 §8 — 라우트는 2개뿐이고 각각 레이아웃을 element 로 갖는다. */
export const router = createBrowserRouter([
  {
    path: ROUTES.LOGIN,
    element: <LoginLayout />,
    children: [{ index: true, element: <AdminLoginPage /> }],
  },
  {
    path: ROUTES.HOME,
    element: <MainLayout headerRight={<AdminMenu />} />,
    loader: protectedLoader,
    children: [{ index: true, element: <SyncMainPage /> }],
  },
]);
