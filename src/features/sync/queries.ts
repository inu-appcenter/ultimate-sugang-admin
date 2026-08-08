import { useQuery } from '@tanstack/react-query';

import { fetchCoursesSummary, fetchSyncJobs } from '@/features/sync/api';

/** 04 §6-7 queryKey 팩토리. `job`·`details` 키는 실제로 쓰는 Step 5-4·6 에서 추가한다. */
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

export function useSyncJobs(page: number) {
  return useQuery({
    queryKey: syncKeys.jobs(page),
    queryFn: () => fetchSyncJobs(page),
    // 페이지를 넘길 때 표가 통째로 비지 않게 이전 페이지를 잠깐 유지한다.
    placeholderData: (previous) => previous,
  });
}
