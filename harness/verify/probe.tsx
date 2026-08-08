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

/**
 * 데이터를 부르는 화면용. 첫 페인트(Loading)와 쿼리가 끝난 뒤(Data/Empty/Error)를 같이 돌려준다.
 * 호출 전에 queryClient.clear() 를 해야 이전 케이스의 캐시가 안 샌다.
 */
async function mountAsync(
  element: ReactElement,
  settleMs: number,
): Promise<{ firstPaint: string; settled: string }> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(<Providers>{element}</Providers>);
  });
  const firstPaint = container.innerHTML;

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, settleMs));
  });
  const settled = container.innerHTML;

  await act(async () => {
    root.unmount();
  });
  container.remove();
  return { firstPaint, settled };
}

/** 에러 케이스는 queries.retry=1 의 재시도(기본 지연 ~1초)를 기다려야 해서 settleMs 를 늘려 부른다. */
export const renderSyncMain = (settleMs = 100) =>
  mountAsync(
    <RouterProvider
      router={createMemoryRouter([{ path: '/', element: <SyncMainPage /> }], {
        initialEntries: ['/'],
      })}
    />,
    settleMs,
  );

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
