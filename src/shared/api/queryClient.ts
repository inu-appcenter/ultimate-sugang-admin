import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { showErrorToast } from '@/shared/api/errorHandler';

/** 401 은 refreshQueue 인터셉터가 처리하므로 여기서 토스트를 띄우지 않는다. */
const toastUnlessUnauthorized = (error: unknown) => {
  if (isAxiosError(error) && error.response?.status === 401) return;
  showErrorToast(error);
};

/** 04 §6-6. 창 포커스 refetch 는 끈다 — 폴링이 갱신을 담당한다. */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: toastUnlessUnauthorized }),
  mutationCache: new MutationCache({ onError: toastUnlessUnauthorized }),
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
});
