/**
 * 화면을 jsdom 에 실제로 마운트해서 마크업을 돌려준다.
 * SSR(renderToStaticMarkup)을 쓰지 않는 이유: zustand 는 서버 스냅샷으로 getInitialState() 를
 * 쓰기 때문에 store 값이 반영된 화면을 볼 수 없다.
 */
import { act, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { createMemoryRouter, RouterProvider } from 'react-router';

import { Providers } from '@/app/providers';
import { AdminMenu } from '@/features/auth/components/AdminMenu';
import { AdminLoginPage } from '@/pages/AdminLoginPage';
import { LoginLayout } from '@/shared/components/layout/LoginLayout';
import { MainLayout } from '@/shared/components/layout/MainLayout';
import { SyncMainPage } from '@/pages/SyncMainPage';

function mount(element: ReactElement): string {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<Providers>{element}</Providers>);
  });
  const html = container.innerHTML;
  act(() => {
    root.unmount();
  });
  container.remove();
  return html;
}

export const renderLoginScreen = () =>
  mount(
    <RouterProvider
      router={createMemoryRouter(
        [
          {
            path: '/login',
            element: <LoginLayout />,
            children: [{ index: true, element: <AdminLoginPage /> }],
          },
        ],
        { initialEntries: ['/login'] },
      )}
    />,
  );

export const renderMainShell = () =>
  mount(
    <RouterProvider
      router={createMemoryRouter(
        [
          {
            path: '/',
            element: <MainLayout headerRight={<AdminMenu />} />,
            children: [{ index: true, element: <SyncMainPage /> }],
          },
        ],
        { initialEntries: ['/'] },
      )}
    />,
  );
