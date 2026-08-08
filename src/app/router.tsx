import { createBrowserRouter } from 'react-router';

import { AdminLoginPage } from '@/pages/AdminLoginPage';
import { SyncMainPage } from '@/pages/SyncMainPage';
import { ROUTES } from '@/shared/constants/routes';

/** protectedLoader 는 Step 3 에서 SYNC_MAIN 에 붙인다. */
export const router = createBrowserRouter([
  { path: ROUTES.LOGIN, element: <AdminLoginPage /> },
  { path: ROUTES.SYNC_MAIN, element: <SyncMainPage /> },
]);
