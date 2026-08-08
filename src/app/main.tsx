import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';

import { Providers } from '@/app/providers';
import { router } from '@/app/router';
import { env } from '@/env';
import { installRefreshInterceptor } from '@/shared/api/refreshQueue';
import '@/shared/styles/globals.css';

async function startMockWorker(): Promise<void> {
  if (env.VITE_USE_MSW !== 'true') return;
  const { worker } = await import('@/mocks/browser');
  await worker.start({ onUnhandledRequest: 'warn' });
}

installRefreshInterceptor();
await startMockWorker();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('#root 엘리먼트를 찾을 수 없습니다.');

createRoot(rootElement).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
);
