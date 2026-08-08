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
    tokenManager.clear();
    markSessionExpired();
    throw redirect(ROUTES.LOGIN);
  }
  return null;
};

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
