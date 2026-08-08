import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createSyncJob,
  fetchCoursesSummary,
  fetchSyncJobs,
  requestSyncPreflight,
} from '@/features/sync/api';
import { getErrorCode } from '@/shared/api/errorHandler';
import { ERROR_CODE } from '@/shared/constants/errorCodes';

export const syncKeys = {
  all: ['sync'] as const,
  summary: () => [...syncKeys.all, 'summary'] as const,
  jobs: (page: number) => [...syncKeys.all, 'jobs', page] as const,
};

export function useCoursesSummary() {
  return useQuery({
    queryKey: syncKeys.summary(),
    queryFn: fetchCoursesSummary,
  });
}

export function useSyncPreflight() {
  return useMutation({ mutationFn: requestSyncPreflight });
}

export function isSyncConflictError(error: unknown): boolean {
  const code = getErrorCode(error);
  return code === ERROR_CODE.SYNC_JOB_ALREADY_RUNNING || code === ERROR_CODE.SYNC_STRATEGY_MISMATCH;
}

export function useCreateSyncJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSyncJob,
    onSettled: () => queryClient.invalidateQueries({ queryKey: syncKeys.all }),
  });
}

export function useSyncJobs(page: number) {
  return useQuery({
    queryKey: syncKeys.jobs(page),
    queryFn: () => fetchSyncJobs(page),
    placeholderData: (previous) => previous,
  });
}
