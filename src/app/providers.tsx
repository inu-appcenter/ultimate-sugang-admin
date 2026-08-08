import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';

import { queryClient } from '@/shared/api/queryClient';

/** 토스트는 우상단, 3초 뒤 사라진다 (DS-01 §5-6). 색은 DS 토큰만 쓴다. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        duration={3000}
        toastOptions={{
          classNames: {
            toast: 'font-sans text-body rounded-btn shadow-modal border-0',
            success: 'bg-success-bg text-success-text',
            error: 'bg-danger-bg text-danger-text',
          },
        }}
      />
    </QueryClientProvider>
  );
}
