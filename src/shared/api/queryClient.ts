import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { showErrorToast } from '@/shared/api/errorHandler';

const toastUnlessUnauthorized = (error: unknown) => {
  if (isAxiosError(error) && error.response?.status === 401) return;
  showErrorToast(error);
};

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: toastUnlessUnauthorized }),
  mutationCache: new MutationCache({ onError: toastUnlessUnauthorized }),
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
});
