/**
 * 화면을 jsdom 에 실제로 마운트해서 마크업을 돌려준다.
 * SSR(renderToStaticMarkup)을 쓰지 않는 이유: zustand 는 서버 스냅샷으로 getInitialState() 를
 * 쓰기 때문에 store 값이 반영된 화면을 볼 수 없다.
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { createMemoryRouter, RouterProvider } from 'react-router';

import { Providers } from '@/app/providers';
import { useUpdateDisplaySemester } from '@/features/semester/queries';
import type { DisplaySemester } from '@/features/semester/schemas';
import { SyncMainPage } from '@/pages/SyncMainPage';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const syncMain = (
  <RouterProvider
    router={createMemoryRouter([{ path: '/', element: <SyncMainPage /> }], {
      initialEntries: ['/'],
    })}
  />
);

/**
 * 스냅샷 사이에 `before` 로 mock 상태를 바꿔 진행 단계를 결정적으로 만든다.
 *
 * ⚠️ 언마운트 없이 한 마운트로 끝까지 간다. 페이지 state(launchedJobId 등)가 걸린
 * 버그는 마운트를 갈면 재현되지 않는다 — 실행부터 관측까지 `click` 스텝으로 이어 붙인다.
 */
export async function renderSyncMainSteps(
  steps: Array<{
    wait: number;
    before?: () => void;
    click?: string;
    clickRow?: string;
    clickId?: string;
  }>,
) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(<Providers>{syncMain}</Providers>);
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
    if (step.clickRow !== undefined) {
      const needle = step.clickRow;
      const row = [...container.querySelectorAll<HTMLElement>('tr[role="button"]')].find((node) =>
        node.textContent?.includes(needle),
      );
      await act(async () => {
        row?.click();
      });
    }
    if (step.clickId !== undefined) {
      // Radix Tabs 는 click 이 아니라 mousedown 에서 값을 바꾼다. 둘 다 태운다.
      const target = document.getElementById(step.clickId);
      await act(async () => {
        target?.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, button: 0 }));
        target?.click();
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
 * Radix Select 를 키보드로 연다 — jsdom 에는 PointerEvent 가 없어 포인터 경로가 돌지 않는다.
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
  await act(async () => {
    options
      .find((node) => node.textContent === optionLabel)
      ?.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  });
  await act(async () => {
    await sleep(settleMs);
  });
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
  settleMs = 200,
}: {
  termLabel?: string | null;
  confirmText?: string | null;
  actionLabel?: string | null;
  settleMs?: number;
} = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(<Providers>{syncMain}</Providers>);
  });
  await act(async () => {
    await sleep(settleMs);
  });

  await act(async () => {
    buttonByText(container, '데이터 업데이트')?.click();
  });
  await act(async () => {
    await sleep(settleMs);
  });
  if (termLabel !== null) await chooseOption('sync-target-term', termLabel, settleMs);
  const targetDialog = openDialog();
  await act(async () => {
    if (targetDialog !== null) buttonByText(targetDialog, '다음')?.click();
  });
  await act(async () => {
    await sleep(settleMs);
  });
  const confirmDialog = dialogHtml();

  if (confirmText !== null) {
    const input = document.getElementById('sync-replace-confirm');
    await act(async () => {
      if (input !== null) typeInto(input as HTMLInputElement, confirmText);
    });
    await act(async () => {
      await sleep(settleMs);
    });
  }

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
  return { confirmDialog, afterAction };
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
