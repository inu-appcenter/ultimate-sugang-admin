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
import { SyncMainPage } from '@/pages/SyncMainPage';
import { LoginLayout } from '@/shared/components/layout/LoginLayout';
import { MainLayout } from '@/shared/components/layout/MainLayout';

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

/**
 * 폴링용. 스냅샷 사이에 `before` 로 mock 상태를 바꿔 진행 단계를 결정적으로 만든다.
 * mockDb.createJob 의 22초 타임라인을 기다리지 않으려는 것이다.
 *
 * ⚠️ 언마운트 없이 한 마운트로 끝까지 간다. 페이지 state(launchedJobId 등)가 걸린
 * 버그는 마운트를 갈면 재현되지 않는다 — 실행부터 관측까지 `click` 스텝으로 이어 붙인다.
 */
export async function renderSyncMainSteps(
  steps: Array<{ wait: number; before?: () => void; click?: string }>,
) {
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

  const snapshots: string[] = [];
  for (const step of steps) {
    step.before?.();
    if (step.click !== undefined) {
      const label = step.click;
      const scope = openDialog() ?? container;
      await act(async () => {
        buttonByText(scope, label)?.click();
      });
    }
    await act(async () => {
      await sleep(step.wait);
    });
    snapshots.push(container.innerHTML);
  }

  await act(async () => {
    root.unmount();
  });
  container.remove();
  return snapshots;
}

const buttonByText = (scope: ParentNode, label: string) =>
  [...scope.querySelectorAll('button')].find((node) => node.textContent?.trim() === label);

/** 이력 테이블 페이지네이션에도 [다음] 이 있다. 모달 안에서만 찾도록 스코프를 좁힌다. */
const openDialog = () => document.querySelector('[role="dialog"]');
const dialogHtml = () => openDialog()?.outerHTML ?? '';

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
 * Radix Select 를 키보드로 연다 — jsdom 에는 PointerEvent 가 없어 포인터 경로가 돌지 않는다.
 * 목록에 뜬 라벨을 돌려준다.
 */
async function chooseOption(triggerId: string, optionLabel: string, settleMs: number) {
  const trigger = document.getElementById(triggerId);
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
  return optionLabels;
}

/** 학기 드롭다운을 열어 값을 바꾸고 [저장] 까지 누른다. */
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

  const optionLabels = await chooseOption('semester-setting-term', optionLabel, settleMs);
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

/**
 * M2 를 [데이터 업데이트] 로 열고, 필요하면 학기를 바꾼 뒤 [다음] 까지 누른다.
 * `termLabel` 이 없으면 초기값 그대로 판정을 요청한다.
 */
export async function openSyncTargetModal({ termLabel = null, settleMs = 200 } = {}) {
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

  const trigger = buttonByText(container, '데이터 업데이트');
  await act(async () => {
    trigger?.click();
  });
  await act(async () => {
    await sleep(settleMs);
  });
  const opened = document.body.innerHTML;
  const openedDialog = dialogHtml();

  if (termLabel !== null) {
    await chooseOption('sync-target-term', termLabel, settleMs);
  }

  const dialog = openDialog();
  await act(async () => {
    if (dialog !== null) buttonByText(dialog, '다음')?.click();
  });
  const judgingDialog = dialogHtml();

  await act(async () => {
    await sleep(settleMs);
  });
  const afterNext = document.body.innerHTML;

  await act(async () => {
    root.unmount();
  });
  container.remove();
  return { opened, openedDialog, judgingDialog, afterNext };
}

/**
 * 잠긴 [데이터 업데이트] 의 툴팁을 연다. Radix Tooltip 은 포커스로도 열리고,
 * disabled 버튼은 포커스를 못 받으므로 감싼 span 에 포커스를 준다.
 */
export async function focusBlockedUpdateButton(settleMs = 2500) {
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
  const settled = container.innerHTML;

  const wrapper = [...container.querySelectorAll('span[tabindex="0"]')].find((node) =>
    node.textContent?.includes('데이터 업데이트'),
  );
  await act(async () => {
    wrapper?.focus();
  });
  await act(async () => {
    await sleep(300);
  });
  const focused = document.body.innerHTML;

  await act(async () => {
    root.unmount();
  });
  container.remove();
  return { settled, focused, hasWrapper: wrapper !== undefined };
}

/** React 는 value 를 직접 대입해도 모른다. 네이티브 setter 로 넣고 input 이벤트를 태운다. */
function typeInto(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
}

/**
 * M2 에서 [다음] 을 눌러 확인 모달(M3·M4·최초 적재)까지 간다.
 * `confirmText` 는 M4 Strict Match 입력, `actionLabel` 은 실행 버튼 라벨이다.
 */
export async function runSyncConfirmFlow({
  termLabel = null,
  confirmText = null,
  actionLabel = null,
  reopen = false,
  settleMs = 200,
} = {}) {
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

  const openTarget = async () => {
    await act(async () => {
      buttonByText(container, '데이터 업데이트')?.click();
    });
    await act(async () => {
      await sleep(settleMs);
    });
    if (termLabel !== null) await chooseOption('sync-target-term', termLabel, settleMs);
    const dialog = openDialog();
    await act(async () => {
      if (dialog !== null) buttonByText(dialog, '다음')?.click();
    });
    await act(async () => {
      await sleep(settleMs);
    });
  };

  await openTarget();
  const confirmDialog = dialogHtml();

  let reopened = '';
  if (reopen) {
    const dialog = openDialog();
    await act(async () => {
      if (dialog !== null) buttonByText(dialog, '취소')?.click();
    });
    await act(async () => {
      await sleep(settleMs);
    });
    await openTarget();
    reopened = dialogHtml();
  }
  const reopenedInput = (document.getElementById('sync-replace-confirm') as HTMLInputElement | null)
    ?.value;

  if (confirmText !== null) {
    const input = document.getElementById('sync-replace-confirm');
    await act(async () => {
      if (input !== null) typeInto(input as HTMLInputElement, confirmText);
    });
    await act(async () => {
      await sleep(settleMs);
    });
  }
  const typed = dialogHtml();

  if (actionLabel !== null) {
    const dialog = openDialog();
    await act(async () => {
      if (dialog !== null) buttonByText(dialog, actionLabel)?.click();
    });
    await act(async () => {
      await sleep(settleMs);
    });
  }
  const afterAction = document.body.innerHTML;

  await act(async () => {
    root.unmount();
  });
  container.remove();
  return { confirmDialog, reopened, reopenedInput, typed, afterAction };
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
