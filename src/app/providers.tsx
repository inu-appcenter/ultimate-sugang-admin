import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';

import { queryClient } from '@/shared/api/queryClient';
import { TooltipProvider } from '@/shared/components/ui/tooltip';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
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
