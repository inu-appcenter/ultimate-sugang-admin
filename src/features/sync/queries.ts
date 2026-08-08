import { useMutation, useQuery } from '@tanstack/react-query';

import { fetchCoursesSummary, fetchSyncJobs, requestSyncPreflight } from '@/features/sync/api';

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

export function useSyncJobs(page: number) {
  return useQuery({
    queryKey: syncKeys.jobs(page),
    queryFn: () => fetchSyncJobs(page),
    placeholderData: (previous) => previous,
  });
}
