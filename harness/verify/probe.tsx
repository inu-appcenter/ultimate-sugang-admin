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
import { useUpdateDisplaySemester } from '@/features/semester/queries';
import type { DisplaySemester } from '@/features/semester/schemas';
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const buttonByText = (scope: ParentNode, label: string) =>
  [...scope.querySelectorAll('button')].find((node) => node.textContent?.trim() === label);

/**
 * M1 은 카드의 [학기 설정] 로만 열린다. 카드→모달 배선까지 같이 보려고 SyncMainPage 에서 눌러 연다.
 * Radix Dialog 는 body 로 portal 하므로 마크업은 document.body 에서 읽는다.
 */
export async function openSemesterSettingModal(settleMs = 200) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <Providers>
        <RouterProvider
          router={createMemoryRouter([{ path: '/', element: <SyncMainPage /> }], {
            initialEntries: ['/'],
          })}
        />
      </Providers>,
    );
  });
  await act(async () => {
    await sleep(settleMs);
  });

  const trigger = buttonByText(container, '학기 설정');
  await act(async () => {
    trigger?.click();
  });
  await act(async () => {
    await sleep(settleMs);
  });
  const opened = document.body.innerHTML;

  const cancel = buttonByText(document.body, '취소');
  await act(async () => {
    cancel?.click();
  });
  await act(async () => {
    await sleep(settleMs);
  });
  const afterCancel = document.body.innerHTML;

  await act(async () => {
    root.unmount();
  });
  container.remove();
  return { hasTrigger: trigger !== undefined, opened, afterCancel };
}

/**
 * 학기 드롭다운을 열어 값을 바꾸고 [저장] 까지 누른다.
 * 열기는 키보드로 한다 — jsdom 에는 PointerEvent 가 없어 Radix 의 포인터 경로가 돌지 않는다.
 */
export async function changeDisplaySemesterTerm(optionLabel: string, settleMs = 200) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <Providers>
        <RouterProvider
          router={createMemoryRouter([{ path: '/', element: <SyncMainPage /> }], {
            initialEntries: ['/'],
          })}
        />
      </Providers>,
    );
  });
  await act(async () => {
    await sleep(settleMs);
  });
  await act(async () => {
    buttonByText(container, '학기 설정')?.click();
  });
  await act(async () => {
    await sleep(settleMs);
  });

  const trigger = document.getElementById('semester-setting-term');
  trigger?.focus();
  await act(async () => {
    trigger?.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  });
  await act(async () => {
    await sleep(settleMs);
  });

  const options = [...document.querySelectorAll('[role="option"]')];
  const optionLabels = options.map((node) => node.textContent ?? '');
  await act(async () => {
    options
      .find((node) => node.textContent === optionLabel)
      ?.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  });
  await act(async () => {
    await sleep(settleMs);
  });
  const dirty = document.body.innerHTML;

  await act(async () => {
    buttonByText(document.body, '저장')?.click();
  });
  const saving = document.body.innerHTML;

  await act(async () => {
    await sleep(settleMs);
  });
  const afterSave = document.body.innerHTML;

  await act(async () => {
    root.unmount();
  });
  container.remove();
  return { optionLabels, dirty, saving, afterSave };
}

/** 훅을 실제로 마운트해 mutate 를 돌린다. invalidation 범위(D10)를 캐시에서 직접 본다. */
export async function runDisplaySemesterUpdate(body: DisplaySemester, settleMs = 300) {
  let mutate: ((value: DisplaySemester) => void) | null = null;

  function MutationProbe() {
    mutate = useUpdateDisplaySemester().mutate;
    return null;
  }

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <Providers>
        <MutationProbe />
      </Providers>,
    );
  });
  await act(async () => {
    mutate?.(body);
    await sleep(settleMs);
  });

  await act(async () => {
    root.unmount();
  });
  container.remove();
}

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
